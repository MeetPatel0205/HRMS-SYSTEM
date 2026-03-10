import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import { useWebSocket } from '../hooks/useWebSocket';

interface Activity {
    id: string;
    user: string;
    action: string;
    target: string;
    timestamp: string;
    type: string;
}

export const ActivityFeed: React.FC = () => {
    const [activities, setActivities] = useState<Activity[]>([]);
    const { socket } = useWebSocket();

    useEffect(() => {
        // Mock initial data or fetch from API
        setActivities([
            { id: '1', user: 'System', action: 'System started', target: 'HRMS', timestamp: new Date().toISOString(), type: 'system' }
        ]);

        if (!socket) return;

        socket.on('activity_feed', (activity: Activity) => {
            setActivities((prev) => [activity, ...prev].slice(0, 10)); // Keep last 10
        });

        return () => {
            socket.off('activity_feed');
        };
    }, [socket]);

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-base font-medium">
                    <History className="mr-2 h-4 w-4 text-muted-foreground" />
                    Recent Activity
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {activities.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No recent activity</div>
                    ) : (
                        activities.map((activity, index) => (
                            <div key={activity.id || index}>
                                <div className="flex items-start space-x-4">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="bg-secondary text-primary text-xs">
                                            {activity.user.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-1">
                                        <p className="text-sm">
                                            <span className="font-medium text-foreground">{activity.user}</span>
                                            <span className="text-muted-foreground"> {activity.action} </span>
                                            <span className="font-semibold text-foreground">{activity.target}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(activity.timestamp).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                {index < activities.length - 1 && <Separator className="my-4" />}
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
