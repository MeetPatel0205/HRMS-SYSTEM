export interface ChatUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
    profilePicture?: string;
    status?: 'online' | 'offline' | 'busy' | 'away';
}

export interface ChatMessage {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    mentions: string[];
    attachments: any[];
    readBy: string[];
    createdAt: string;
    sender?: ChatUser;
}

export interface Conversation {
    id: string;
    type: 'direct' | 'group' | 'channel';
    participants: string[];
    context?: any;
    messages?: ChatMessage[];
    lastMessage?: ChatMessage;
    unreadCount?: number;
    createdAt: string;
    updatedAt: string;
    name?: string; // For group chats
    participantDetails?: ChatUser[]; // Enriched data
}
