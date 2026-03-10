import { Request, Response } from 'express';
import { prisma } from '../utils/database';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class ChatController {

    // Get all conversations for the current user
    async getConversations(req: Request, res: Response) {
        try {
            const userId = req.user!.id;

            // For MySQL with Json fields, we need to fetch all and filter in memory
            const allConversations = await prisma.conversation.findMany({
                include: {
                    messages: {
                        orderBy: {
                            createdAt: 'desc'
                        },
                        take: 1
                    }
                },
                orderBy: {
                    updatedAt: 'desc'
                }
            });

            // Filter conversations where user is a participant
            const conversations = allConversations.filter(conv => {
                const participantsArray = conv.participants as string[];
                return participantsArray.includes(userId);
            });

            // Enrich conversations with participant details
            const allParticipantIds = Array.from(new Set(conversations.flatMap(c => {
                const participantsArray = c.participants as string[];
                return participantsArray;
            })));

            const users = await prisma.user.findMany({
                where: {
                    id: {
                        in: allParticipantIds
                    }
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    profilePicture: true
                }
            });

            const userMap = new Map(users.map(u => [u.id, u]));

            const enrichedConversations = conversations.map(c => {
                const participantsArray = c.participants as string[];
                return {
                    ...c,
                    participantDetails: participantsArray.map(pid => userMap.get(pid)).filter(Boolean)
                };
            });

            res.json({
                status: 'success',
                data: enrichedConversations
            });
        } catch (error) {
            logger.error('Get conversations error:', error);
            throw error;
        }
    }

    // Get messages for a specific conversation
    async getMessages(req: Request, res: Response) {
        try {
            const { conversationId } = req.params;
            const userId = req.user!.id;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;
            const skip = (page - 1) * limit;

            // Verify participation
            const conversation = await prisma.conversation.findUnique({
                where: { id: conversationId }
            });

            const participantsArray = conversation?.participants as string[] || [];
            if (!conversation || !participantsArray.includes(userId)) {
                throw new NotFoundError('Conversation not found or access denied');
            }

            const messages = await prisma.chatMessage.findMany({
                where: { conversationId },
                orderBy: { createdAt: 'desc' }, // Newest first
                take: limit,
                skip: skip,
                include: {
                    sender: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true
                        }
                    }
                }
            });

            res.json({
                status: 'success',
                data: messages.reverse(), // Return oldest first for chat view
                meta: {
                    page,
                    limit
                }
            });
        } catch (error) {
            logger.error('Get messages error:', error);
            throw error;
        }
    }

    // Create a new conversation
    async createConversation(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { participants, type = 'direct', initialMessage } = req.body;

            if (!participants || !Array.isArray(participants)) {
                throw new ValidationError('Participants array is required');
            }

            // Add current user to participants if not included
            const allParticipants = Array.from(new Set([...participants, userId]));

            // Check if direct conversation already exists
            if (type === 'direct' && allParticipants.length === 2) {
                // For MySQL with Json fields, we need to fetch and filter in memory
                const existingConversations = await prisma.conversation.findMany({
                    where: {
                        type: 'direct'
                    }
                });

                const existing = existingConversations.find(conv => {
                    const convParticipants = conv.participants as string[];
                    return convParticipants.length === 2 &&
                           allParticipants.every(p => convParticipants.includes(p));
                });

                if (existing) {
                    res.json({
                        status: 'success',
                        data: existing
                    });
                    return;
                }
            }

            const conversation = await prisma.conversation.create({
                data: {
                    type,
                    participants: allParticipants,
                    messages: initialMessage ? {
                        create: {
                            senderId: userId,
                            content: initialMessage,
                            mentions: [],
                            attachments: [],
                            readBy: [userId]
                        }
                    } : undefined
                }
            });

            res.status(201).json({
                status: 'success',
                data: conversation
            });
        } catch (error) {
            logger.error('Create conversation error:', error);
            throw error;
        }
    }
}
