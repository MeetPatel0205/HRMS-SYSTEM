import React, { useEffect, useState } from 'react';
import {
    Users,
    CheckSquare,
    TrendingUp,
    Calendar,
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { ActivityFeed } from '../../components/ActivityFeed';

interface ManagerStats {
    teamSize: number;
    pendingLeaves: number;
    pendingReviews: number;
    teamPerformance: number;
    upcomingDeadlines: number;
}

const ManagerDashboard: React.FC = () => {
    const [stats, setStats] = useState<ManagerStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            // Mocking parallel API calls
            // const [teamRes] = await Promise.all([
            //   apiClient.get('/manager/team'),
            // ]);

            const team = [
                { id: 1, name: 'Alice Cooper', role: 'Developer', status: 'active', avatar: '' },
                { id: 2, name: 'Bob Wilson', role: 'Designer', status: 'on_leave', avatar: '' },
                { id: 3, name: 'Charlie Brown', role: 'QA', status: 'active', avatar: '' },
            ]; // teamRes.data?.data || [];

            setTeamMembers(team);

            setStats({
                teamSize: team.length,
                pendingLeaves: 2,
                pendingReviews: 1,
                teamPerformance: 4.5,
                upcomingDeadlines: 3,
            });

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Manager Dashboard</h1>
                <Button>
                    Schedule Team Meeting
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2 mb-2">
                            <Users className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">My Team</span>
                        </div>
                        <div className="text-2xl font-bold">{stats?.teamSize || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Direct reports
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2 mb-2">
                            <Calendar className="h-4 w-4 text-orange-500" />
                            <span className="text-sm font-medium">Leave Requests</span>
                        </div>
                        <div className="text-2xl font-bold">{stats?.pendingLeaves || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Pending approval
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2 mb-2">
                            <CheckSquare className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium">Reviews</span>
                        </div>
                        <div className="text-2xl font-bold">{stats?.pendingReviews || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Action required
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium">Team Performance</span>
                        </div>
                        <div className="text-2xl font-bold">{stats?.teamPerformance || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Average rating
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Team Members */}
                <Card>
                    <CardHeader>
                        <CardTitle>Team Overview</CardTitle>
                        <CardDescription>Current status of your direct reports</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {teamMembers.map((member) => (
                                <div key={member.id} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <Avatar>
                                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium leading-none">{member.name}</p>
                                            <p className="text-xs text-muted-foreground">{member.role}</p>
                                        </div>
                                    </div>
                                    <Badge variant={member.status === 'active' ? 'secondary' : 'outline'}>
                                        {member.status === 'active' ? 'Active' : 'On Leave'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Pending Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Pending Actions</CardTitle>
                        <CardDescription>Items requiring your attention</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Time Off Request</p>
                                    <p className="text-xs text-muted-foreground">Bob Wilson • Feb 20-22</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600">Deny</Button>
                                    <Button size="sm" variant="outline" className="text-green-500 hover:text-green-600">Approve</Button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Performance Review</p>
                                    <p className="text-xs text-muted-foreground">Alice Cooper • Q1 Review</p>
                                </div>
                                <Button size="sm" variant="outline">Start</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                            <Button variant="outline">Approve Timesheets</Button>
                            <Button variant="outline">Team Calendar</Button>
                            <Button variant="outline">Assign Tasks</Button>
                            <Button variant="outline">Department Budget</Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Activity Feed */}
                <div className="md:col-span-2">
                    <ActivityFeed />
                </div>
            </div>
        </div>
    );
};

export default ManagerDashboard;
