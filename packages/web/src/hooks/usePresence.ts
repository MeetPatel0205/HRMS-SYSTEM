import { useEffect, useState } from 'react';
import { useWebSocket } from './useWebSocket';

export interface UserPresence {
    userId: string;
    status: 'online' | 'away' | 'offline' | 'busy';
    lastSeen: Date;
}

export const usePresence = (userId?: string) => {
    const { socket } = useWebSocket();
    const [presence, setPresence] = useState<UserPresence | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

    useEffect(() => {
        if (!socket) return;

        if (userId) {
            // Subscribe to specific user presence if needed
            socket.emit('subscribe_presence', { userId });
        }

        socket.on('presence_update', (data: UserPresence) => {
            if (userId && data.userId === userId) {
                setPresence(data);
            }
        });

        socket.on('online_users', (users: string[]) => {
            setOnlineUsers(users);
        });

        return () => {
            if (userId) {
                socket.off('presence_update');
            }
            socket.off('online_users');
        };
    }, [socket, userId]);

    const updateStatus = (status: UserPresence['status']) => {
        if (socket && socket.connected) {
            socket.emit('update_status', { status });
        }
    };

    return { presence, onlineUsers, updateStatus };
};
