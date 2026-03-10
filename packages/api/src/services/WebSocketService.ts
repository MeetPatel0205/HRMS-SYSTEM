import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { redisClient } from '../utils/redis';
import { prisma } from '../utils/database';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  tenantId?: string;
}

interface PresenceStatus {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Date;
  socketId: string;
}

interface NotificationPayload {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

class WebSocketService {
  private static instance: WebSocketService;
  private io: SocketIOServer | null = null;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private presenceStatus: Map<string, PresenceStatus> = new Map(); // userId -> presence

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          return next(new Error('JWT_SECRET not configured'));
        }

        const decoded = jwt.verify(token, jwtSecret) as any;
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;
        socket.tenantId = decoded.tenantId;

        next();
      } catch (error) {
        logger.error('WebSocket authentication error:', error);
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });

    logger.info('WebSocket service initialized');
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;
    const socketId = socket.id;

    logger.info(`User ${userId} connected with socket ${socketId}`);

    // Track user sockets
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);

    // Update presence
    this.updatePresence(userId, 'online', socketId);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Join tenant room if applicable
    if (socket.tenantId) {
      socket.join(`tenant:${socket.tenantId}`);
    }

    // Join role-specific room
    if (socket.userRole) {
      socket.join(`role:${socket.userRole}`);
    }

    // Send current presence status to user
    this.sendPresenceUpdate(userId);

    // Handle presence updates
    socket.on('presence:update', (status: 'online' | 'away' | 'busy') => {
      this.updatePresence(userId, status, socketId);
    });

    // Handle chat messages
    socket.on('chat:message', async (data) => {
      await this.handleChatMessage(socket, data);
    });

    // Handle typing indicators
    socket.on('chat:typing', (data) => {
      this.handleTypingIndicator(socket, data);
    });

    // Handle activity feed subscription
    socket.on('activity:subscribe', (filters) => {
      this.handleActivitySubscription(socket, filters);
    });

    // Handle real-time data subscriptions
    socket.on('subscribe:entity', (entityType: string, entityId: string) => {
      socket.join(`${entityType}:${entityId}`);
      logger.info(`User ${userId} subscribed to ${entityType}:${entityId}`);
    });

    socket.on('unsubscribe:entity', (entityType: string, entityId: string) => {
      socket.leave(`${entityType}:${entityId}`);
      logger.info(`User ${userId} unsubscribed from ${entityType}:${entityId}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(userId, socketId);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${userId}:`, error);
    });
  }

  private handleDisconnection(userId: string, socketId: string): void {
    logger.info(`User ${userId} disconnected socket ${socketId}`);

    // Remove socket from user's socket set
    const userSocketSet = this.userSockets.get(userId);
    if (userSocketSet) {
      userSocketSet.delete(socketId);

      // If user has no more active sockets, mark as offline
      if (userSocketSet.size === 0) {
        this.updatePresence(userId, 'offline', socketId);
        this.userSockets.delete(userId);
      }
    }
  }

  private async updatePresence(userId: string, status: 'online' | 'away' | 'busy' | 'offline', socketId: string): Promise<void> {
    const presence: PresenceStatus = {
      userId,
      status,
      lastSeen: new Date(),
      socketId,
    };

    this.presenceStatus.set(userId, presence);

    // Broadcast presence update to all connected users
    this.io?.emit('presence:update', {
      userId,
      status,
      lastSeen: presence.lastSeen,
    });

    // Store in Redis for persistence (skip if Redis unavailable)
    try {
      await redisClient.setEx(`presence:${userId}`, 300, JSON.stringify(presence));
    } catch (error) {
      // Redis not available, presence is still tracked in-memory
    }
  }

  private sendPresenceUpdate(userId: string): void {
    const allPresence = Array.from(this.presenceStatus.values());
    this.io?.to(`user:${userId}`).emit('presence:list', allPresence);
  }

  private async handleChatMessage(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      const { conversationId, content, mentions } = data;
      const userId = socket.userId;

      if (!userId) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Create message in database
      const message = await prisma.chatMessage.create({
        data: {
          conversationId,
          senderId: userId,
          content,
          mentions: mentions || [],
          attachments: [],
          readBy: [userId],
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profilePicture: true
            }
          }
        }
      });

      // Update conversation timestamp
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() }
      });

      // Broadcast to conversation participants
      this.io?.to(`conversation:${conversationId}`).emit('chat:message', message);

      // Send notifications to mentioned users
      if (mentions && mentions.length > 0) {
        for (const mentionedUserId of mentions) {
          await this.sendNotification(mentionedUserId, {
            id: `notif_${Date.now()}`,
            userId: mentionedUserId,
            type: 'mention',
            title: 'You were mentioned',
            message: `${userId} mentioned you in a conversation`,
            data: { conversationId, messageId: message.id },
            read: false,
            createdAt: new Date(),
          });
        }
      }

      logger.info(`Chat message sent in conversation ${conversationId} by user ${userId}`);
    } catch (error) {
      logger.error('Error handling chat message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private handleTypingIndicator(socket: AuthenticatedSocket, data: any): void {
    const { conversationId, isTyping } = data;
    const userId = socket.userId!;

    this.io?.to(`conversation:${conversationId}`).emit('chat:typing', {
      userId,
      conversationId,
      isTyping,
    });
  }

  private handleActivitySubscription(socket: AuthenticatedSocket, filters: any): void {
    const userId = socket.userId!;
    socket.join(`activity:${userId}`);
    logger.info(`User ${userId} subscribed to activity feed`);
  }

  // Public methods for emitting events

  async sendNotification(userId: string, notification: Partial<NotificationPayload> & { type: string; title: string; message: string }): Promise<void> {
    const fullNotification: NotificationPayload = {
      id: notification.id || `notif_${Date.now()}`,
      userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      read: notification.read || false,
      createdAt: notification.createdAt || new Date(),
    };

    // Send to all user's connected sockets
    this.io?.to(`user:${userId}`).emit('notification', fullNotification);

    // Store in Redis for offline users (skip if Redis unavailable)
    try {
      await redisClient.lPush(`notifications:${userId}`, JSON.stringify(fullNotification));
      await redisClient.lTrim(`notifications:${userId}`, 0, 99); // Keep last 100 notifications
    } catch (error) {
      // Redis not available, notification was still sent via WebSocket
    }

    logger.info(`Notification sent to user ${userId}: ${notification.type}`);
  }

  broadcastActivity(activity: any): void {
    // Broadcast to user's activity feed
    this.io?.to(`activity:${activity.userId}`).emit('activity:new', activity);

    // Also broadcast to global activity feed for admins/managers
    this.io?.to('role:admin').emit('activity:new', activity);
    this.io?.to('role:hr_manager').emit('activity:new', activity);

    logger.info(`Activity broadcast: ${activity.action} on ${activity.entityType}`);
  }

  broadcastToTenant(tenantId: string, event: string, data: any): void {
    this.io?.to(`tenant:${tenantId}`).emit(event, data);
    logger.info(`Broadcast to tenant ${tenantId}: ${event}`);
  }

  broadcastToRole(role: string, event: string, data: any): void {
    this.io?.to(`role:${role}`).emit(event, data);
    logger.info(`Broadcast to role ${role}: ${event}`);
  }

  emitToUser(userId: string, event: string, data: any): void {
    this.io?.to(`user:${userId}`).emit(event, data);
    logger.info(`Emit to user ${userId}: ${event}`);
  }

  emitToEntity(entityType: string, entityId: string, event: string, data: any): void {
    this.io?.to(`${entityType}:${entityId}`).emit(event, data);
    logger.info(`Emit to ${entityType}:${entityId}: ${event}`);
  }

  broadcastEntityUpdate(entityType: string, entityId: string, action: 'created' | 'updated' | 'deleted', data: any): void {
    this.emitToEntity(entityType, entityId, `${entityType}:${action}`, data);
  }

  async getOnlineUsers(): Promise<string[]> {
    return Array.from(this.userSockets.keys());
  }

  async getUserPresence(userId: string): Promise<PresenceStatus | null> {
    // Check in-memory first
    if (this.presenceStatus.has(userId)) {
      return this.presenceStatus.get(userId)!;
    }

    // Check Redis
    try {
      const cached = await redisClient.get(`presence:${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      // Redis not available
    }

    return null;
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  getIO(): SocketIOServer | null {
    return this.io;
  }
}

export const webSocketService = WebSocketService.getInstance();
export { WebSocketService };
