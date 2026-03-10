import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, IconButton, Typography, Paper, Avatar } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { ChatMessage } from '../../types/chat';

interface ChatWindowProps {
    activeConversationId: string;
    messages: ChatMessage[];
    onSendMessage: (content: string) => void;
    onTyping: (isTyping: boolean) => void;
    typingUsers: string[];
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ activeConversationId, messages, onSendMessage, onTyping, typingUsers }) => {
    const user = useSelector((state: RootState) => state.auth.user);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = () => {
        if (newMessage.trim()) {
            onSendMessage(newMessage);
            setNewMessage('');
            onTyping(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        onTyping(e.target.value.length > 0);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Messages Area */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {messages.map((msg) => {
                    const isMe = msg.senderId === user?.id;
                    return (
                        <Box
                            key={msg.id}
                            sx={{
                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                maxWidth: '70%',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            <Paper
                                elevation={1}
                                sx={{
                                    p: 1.5,
                                    bgcolor: isMe ? 'primary.main' : 'grey.100',
                                    color: isMe ? 'primary.contrastText' : 'text.primary',
                                    borderRadius: 2
                                }}
                            >
                                <Typography variant="body1">{msg.content}</Typography>
                            </Paper>
                            <Typography variant="caption" sx={{ alignSelf: isMe ? 'flex-end' : 'flex-start', mt: 0.5 }}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                        </Box>
                    );
                })}
                <div ref={messagesEndRef} />
            </Box>

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
                <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        Someone is typing...
                    </Typography>
                </Box>
            )}

            {/* Input Area */}
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Type a message..."
                    size="small"
                    value={newMessage}
                    onChange={handleChange}
                    onKeyDown={handleKeyPress}
                    sx={{ mr: 1 }}
                />
                <IconButton color="primary" onClick={handleSend} disabled={!newMessage.trim()}>
                    <SendIcon />
                </IconButton>
            </Box>
        </Box>
    );
};
