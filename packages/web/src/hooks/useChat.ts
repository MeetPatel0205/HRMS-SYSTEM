import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { Conversation, ChatMessage } from '../types/chat';
import apiClient from '../services/apiClient';

export const useChat = () => {
    const { socket, sendMessage } = useWebSocket();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
    const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({}); // convId -> [userIds]

    const fetchConversations = useCallback(async () => {
        try {
            const response = await apiClient.get('/chat/conversations');
            if (response.data.status === 'success') {
                setConversations(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
        }
    }, []);

    const fetchMessages = useCallback(async (conversationId: string) => {
        if (messages[conversationId]) return;
        try {
            const response = await apiClient.get(`/chat/conversations/${conversationId}/messages`);
            if (response.data.status === 'success') {
                // The API returns messages oldest first (reversed in controller), but we might want them in a specific order
                // The controller says: data: messages.reverse(), // Return oldest first for chat view
                setMessages(prev => ({ ...prev, [conversationId]: response.data.data }));
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        }
    }, [messages]);


    useEffect(() => {
        if (!socket) return;

        // Handle incoming messages
        socket.on('chat:message', (message: ChatMessage) => {
            setMessages(prev => {
                const convMessages = prev[message.conversationId] || [];
                // Avoid duplicates
                if (convMessages.some(m => m.id === message.id)) return prev;
                return {
                    ...prev,
                    [message.conversationId]: [...convMessages, message]
                };
            });

            // Update last message in conversation list
            setConversations(prev => prev.map(conv => {
                if (conv.id === message.conversationId) {
                    return {
                        ...conv,
                        lastMessage: message,
                        updatedAt: message.createdAt,
                        unreadCount: activeConversationId === message.conversationId ? 0 : (conv.unreadCount || 0) + 1
                    };
                }
                return conv;
            }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
        });

        // Handle typing indicators
        socket.on('chat:typing', ({ conversationId, userId, isTyping }) => {
            setTypingUsers(prev => {
                const currentTyping = prev[conversationId] || [];
                if (isTyping && !currentTyping.includes(userId)) {
                    return { ...prev, [conversationId]: [...currentTyping, userId] };
                } else if (!isTyping && currentTyping.includes(userId)) {
                    return { ...prev, [conversationId]: currentTyping.filter(id => id !== userId) };
                }
                return prev;
            });
        });

        return () => {
            socket.off('chat:message');
            socket.off('chat:typing');
        };
    }, [socket, activeConversationId]);

    const sendChatMessage = (conversationId: string, content: string) => {
        sendMessage('chat:message', { conversationId, content });
    };

    const sendTyping = (conversationId: string, isTyping: boolean) => {
        sendMessage('chat:typing', { conversationId, isTyping });
    };

    const loadConversation = (conversationId: string) => {
        setActiveConversationId(conversationId);
        fetchMessages(conversationId);
    };

    return {
        conversations,
        activeConversationId,
        messages: activeConversationId ? messages[activeConversationId] || [] : [],
        typingUsers: activeConversationId ? typingUsers[activeConversationId] || [] : [],
        loadConversation,
        sendChatMessage,
        sendTyping,
        fetchConversations
    };
};
