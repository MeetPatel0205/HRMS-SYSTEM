import React, { useEffect, useState } from 'react';
import {
    Badge,
    IconButton,
    Menu,
    MenuItem,
    Typography,
    Box,
    List,
    ListItem,
    ListItemText,
    Divider,
    ListItemIcon
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CircleNotificationsIcon from '@mui/icons-material/CircleNotifications';
import { useWebSocket } from '../hooks/useWebSocket';

interface Notification {
    id: string;
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    type: 'info' | 'warning' | 'success' | 'error';
}

export const NotificationCenter: React.FC = () => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const { socket } = useWebSocket();
    const open = Boolean(anchorEl);

    useEffect(() => {
        if (!socket) return;

        socket.on('notification', (notification: Notification) => {
            setNotifications((prev) => [notification, ...prev]);
        });

        return () => {
            socket.off('notification');
        };
    }, [socket]);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <>
            <IconButton
                color="inherit"
                onClick={handleClick}
                aria-controls={open ? 'notification-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
            >
                <Badge badgeContent={unreadCount} color="error">
                    <NotificationsIcon />
                </Badge>
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                id="notification-menu"
                open={open}
                onClose={handleClose}
                onClick={handleClose}
                PaperProps={{
                    elevation: 0,
                    sx: {
                        overflow: 'visible',
                        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                        mt: 1.5,
                        width: 320,
                        maxHeight: 400,
                        overflowY: 'auto'
                    },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
                    <Typography variant="h6">Notifications</Typography>
                </Box>
                <List sx={{ p: 0 }}>
                    {notifications.length === 0 ? (
                        <ListItem>
                            <ListItemText primary="No new notifications" />
                        </ListItem>
                    ) : (
                        notifications.map((notification) => (
                            <React.Fragment key={notification.id}>
                                <ListItem alignItems="flex-start" sx={{ bgcolor: notification.read ? 'inherit' : 'rgba(0, 87, 183, 0.05)' }}>
                                    <ListItemIcon>
                                        <CircleNotificationsIcon color={notification.type === 'error' ? 'error' : 'primary'} />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={notification.title}
                                        secondary={
                                            <React.Fragment>
                                                <Typography
                                                    sx={{ display: 'inline' }}
                                                    component="span"
                                                    variant="body2"
                                                    color="text.primary"
                                                >
                                                    {notification.message}
                                                </Typography>
                                                <br />
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(notification.timestamp).toLocaleString()}
                                                </Typography>
                                            </React.Fragment>
                                        }
                                    />
                                </ListItem>
                                <Divider component="li" />
                            </React.Fragment>
                        ))
                    )}
                </List>
            </Menu>
        </>
    );
};
