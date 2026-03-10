import React, { useState } from 'react';
import { Fab, Paper, Box, IconButton, Typography, Divider } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { ChatWindow } from './ChatWindow';
import { ConversationList } from './ConversationList';
import { useChat } from '../../hooks/useChat';

export const ChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const {
        conversations,
        activeConversationId,
        messages,
        loadConversation,
        sendChatMessage,
        sendTyping,
        typingUsers
    } = useChat();

    const [currentView, setCurrentView] = useState<'list' | 'chat'>('list');

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            // fetchConversations(); // Logic inside useChat or handled here
        }
    };

    const handleSelectConversation = (id: string) => {
        loadConversation(id);
        setCurrentView('chat');
    };

    const handleBack = () => {
        setCurrentView('list');
    };

    return (
        <>
            <Fab
                color="primary"
                aria-label="chat"
                sx={{ position: 'fixed', bottom: 24, right: 24 }}
                onClick={handleToggle}
            >
                {isOpen ? <CloseIcon /> : <ChatIcon />}
            </Fab>

            {isOpen && (
                <Paper
                    elevation={4}
                    sx={{
                        position: 'fixed',
                        bottom: 90,
                        right: 24,
                        width: 360,
                        height: 500,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        borderRadius: 2,
                        zIndex: 1200
                    }}
                >
                    {/* Header */}
                    <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center' }}>
                        {currentView === 'chat' && (
                            <IconButton size="small" onClick={handleBack} sx={{ color: 'inherit', mr: 1 }}>
                                <ArrowBackIcon />
                            </IconButton>
                        )}
                        <Typography variant="h6">
                            {currentView === 'chat' ? 'Chat' : 'Messages'}
                        </Typography>
                    </Box>

                    <Divider />

                    {/* Content */}
                    <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {currentView === 'list' ? (
                            <ConversationList
                                conversations={conversations}
                                activeConversationId={activeConversationId}
                                onSelectConversation={handleSelectConversation}
                            />
                        ) : (
                            <ChatWindow
                                activeConversationId={activeConversationId!}
                                messages={messages}
                                onSendMessage={(content) => sendChatMessage(activeConversationId!, content)}
                                onTyping={(isTyping) => sendTyping(activeConversationId!, isTyping)}
                                typingUsers={typingUsers}
                            />
                        )}
                    </Box>
                </Paper>
            )}
        </>
    );
};
