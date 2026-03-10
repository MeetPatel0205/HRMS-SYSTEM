import React from 'react';
import { useSelector } from 'react-redux';
import { List, ListItem, ListItemAvatar, ListItemText, Avatar, Typography, Badge, Divider } from '@mui/material';
import { RootState } from '../../store';
import { Conversation } from '../../types/chat';

interface ConversationListProps {
    conversations: Conversation[];
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({ conversations, activeConversationId, onSelectConversation }) => {
    const user = useSelector((state: RootState) => state.auth.user);

    const getConversationDetails = (conv: Conversation) => {
        if (conv.type === 'direct' && conv.participantDetails && user) {
            const otherParticipant = conv.participantDetails.find(p => p.id !== user.id);
            if (otherParticipant) {
                return {
                    name: `${otherParticipant.firstName} ${otherParticipant.lastName}`,
                    avatar: otherParticipant.avatar || otherParticipant.profilePicture // Handle both fields if inconsistent
                };
            }
        }
        return {
            name: conv.name || "Unknown Conversation",
            avatar: undefined
        };
    };

    return (
        <List sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
            {conversations.map((conv) => {
                const { name, avatar } = getConversationDetails(conv);
                return (
                    <React.Fragment key={conv.id}>
                        <ListItem
                            alignItems="flex-start"
                            button
                            selected={activeConversationId === conv.id}
                            onClick={() => onSelectConversation(conv.id)}
                        >
                            <ListItemAvatar>
                                <Avatar alt={name} src={avatar} />
                            </ListItemAvatar>
                            <ListItemText
                                primary={name}
                                secondary={
                                    <React.Fragment>
                                        <Typography
                                            sx={{ display: 'inline' }}
                                            component="span"
                                            variant="body2"
                                            color="text.primary"
                                        >
                                            {conv.lastMessage?.content || "Start a conversation"}
                                        </Typography>
                                    </React.Fragment>
                                }
                            />
                            {/* Unread badge */}
                            {(conv.unreadCount || 0) > 0 && (
                                <Badge badgeContent={conv.unreadCount} color="primary" />
                            )}
                        </ListItem>
                        <Divider variant="inset" component="li" />
                    </React.Fragment>
                );
            })}
            {conversations.length === 0 && (
                <ListItem>
                    <ListItemText primary="No conversations yet" />
                </ListItem>
            )}
        </List>
    );
};
