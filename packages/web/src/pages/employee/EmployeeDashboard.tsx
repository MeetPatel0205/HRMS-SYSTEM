import React, { useEffect, useState } from 'react';
import {
    Clock,
    CalendarCheck,
    ClipboardList,
    TrendingUp,
    Bell,
    GraduationCap,
    CheckCircle2,
    AlertCircle
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
import { Progress } from '../../components/ui/progress';
import { ActivityFeed } from '../../components/ActivityFeed';
import { usePresence } from '../../hooks/usePresence';
import { goalsAPI, projectsAPI, notificationsAPI, announcementsAPI } from '../../services/api';
import { cn } from '../../lib/utils';

// Helper for status colors
const getStatusColor = (status: string) => {
    switch (status) {
        case 'COMPLETED': return 'bg-green-500 hover:bg-green-600';
        case 'IN_PROGRESS': return 'bg-blue-500 hover:bg-blue-600';
        case 'PENDING': return 'bg-yellow-500 hover:bg-yellow-600';
        case 'HIGH': return 'destructive';
        case 'MEDIUM': return 'secondary';
        default: return 'secondary';
    }
};

interface EmployeeStats {
    hoursWorked: number;
    leaveBalance: number;
    pendingTasks: number;
    upcomingReviews: number;
}

interface MyGoal {
    id: string;
    title: string;
    progress: number;
    status: string;
    dueDate: string;
}

interface MyTask {
    id: string;
    title: string;
    projectName: string;
    status: string;
    priority: string;
    dueDate: string;
}

const EmployeeDashboard: React.FC = () => {
    const { presence } = usePresence();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<EmployeeStats>({
        hoursWorked: 0,
        leaveBalance: 0,
        pendingTasks: 0,
        upcomingReviews: 0
    });
    const [myGoals, setMyGoals] = useState<MyGoal[]>([]);
    const [myTasks, setMyTasks] = useState<MyTask[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Load employee goals
            try {
                const goalsResponse = await goalsAPI.getGoals();
                const goals = (goalsResponse.data || []).slice(0, 5).map((goal: any) => ({
                    id: goal.id,
                    title: goal.title,
                    progress: goal.progress || 0,
                    status: goal.status,
                    dueDate: goal.targetDate
                }));
                setMyGoals(goals);
            } catch (e) { console.error("Error loading goals", e); }

            // Load employee tasks from projects
            try {
                const projectsResponse = await projectsAPI.getProjects();
                const allTasks: MyTask[] = [];
                (projectsResponse.data || []).forEach((project: any) => {
                    (project.tasks || []).forEach((task: any) => {
                        if (task.status !== 'COMPLETED') {
                            allTasks.push({
                                id: task.id,
                                title: task.title,
                                projectName: project.name,
                                status: task.status,
                                priority: task.priority || 'MEDIUM',
                                dueDate: task.dueDate
                            });
                        }
                    });
                });
                setMyTasks(allTasks.slice(0, 5));

                // Set stats (mix of real and mock for now)
                setStats({
                    hoursWorked: 160, // Mock data
                    leaveBalance: 15, // Mock data
                    pendingTasks: allTasks.length,
                    upcomingReviews: 1 // Mock data
                });

            } catch (e) { console.error("Error loading projects", e); }

            // Load announcements
            try {
                const announcementsResponse = await announcementsAPI.getAnnouncements();
                setAnnouncements((announcementsResponse.data || []).slice(0, 3));
            } catch (e) { console.error("Error loading announcements", e); }

        } catch (err: any) {
            console.error('Failed to load employee dashboard:', err);
            setError(err.message || 'Failed to load dashboard data');
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

    if (error) {
        return (
            <div className="p-4">
                <div className="bg-destructive/15 text-destructive p-4 rounded-md flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Employee Dashboard</h1>
                <p className="text-muted-foreground">Welcome back! Here's your overview for today.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2 mb-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Hours This Month</span>
                        </div>
                        <div className="text-2xl font-bold">{stats.hoursWorked}</div>
                        <p className="text-xs text-muted-foreground">Regular hours</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2 mb-2">
                            <CalendarCheck className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium">Leave Balance</span>
                        </div>
                        <div className="text-2xl font-bold">{stats.leaveBalance}</div>
                        <p className="text-xs text-muted-foreground">Days available</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2 mb-2">
                            <ClipboardList className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium">Pending Tasks</span>
                        </div>
                        <div className="text-2xl font-bold">{stats.pendingTasks}</div>
                        <p className="text-xs text-muted-foreground">Requires attention</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-orange-500" />
                            <span className="text-sm font-medium">Performance</span>
                        </div>
                        <div className="text-2xl font-bold">Good</div>
                        <p className="text-xs text-muted-foreground">{stats.upcomingReviews} review upcoming</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* My Goals */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg font-medium">My Goals</CardTitle>
                        <Button variant="ghost" size="sm">View All</Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {myGoals.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No active goals. Set goals to track your progress.</div>
                            ) : (
                                myGoals.map((goal) => (
                                    <div key={goal.id} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-sm">{goal.title}</span>
                                            <Badge variant={goal.status === 'ON_TRACK' ? 'secondary' : 'outline'}>
                                                {goal.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Progress value={goal.progress} className="h-2" />
                                            <span className="text-xs text-muted-foreground w-8">{goal.progress}%</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Due: {new Date(goal.dueDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* My Tasks */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg font-medium">My Tasks</CardTitle>
                        <Button variant="ghost" size="sm">View All</Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {myTasks.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No pending tasks. You're all caught up!</div>
                            ) : (
                                myTasks.map((task) => (
                                    <div key={task.id} className="flex items-start justify-between border-b last:border-0 pb-3 last:pb-0">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">{task.title}</p>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">{task.projectName}</Badge>
                                                <Badge variant={task.priority === 'HIGH' ? 'destructive' : 'secondary'} className="text-xs">
                                                    {task.priority}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Announcements */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg font-medium flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            Announcements
                        </CardTitle>
                        <Button variant="ghost" size="sm">View All</Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {announcements.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No announcements</div>
                            ) : (
                                announcements.map((announcement: any) => (
                                    <div key={announcement.id} className="space-y-1">
                                        <p className="text-sm font-medium">{announcement.title}</p>
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {announcement.content}
                                        </p>
                                        <p className="text-xs text-muted-foreground pt-1">
                                            {new Date(announcement.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-medium">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        <Button variant="outline" className="w-full justify-start gap-2">
                            <Clock className="h-4 w-4" /> Clock In/Out
                        </Button>
                        <Button variant="outline" className="w-full justify-start gap-2">
                            <CalendarCheck className="h-4 w-4" /> Request Leave
                        </Button>
                        <Button variant="outline" className="w-full justify-start gap-2">
                            <GraduationCap className="h-4 w-4" /> View Learning Courses
                        </Button>
                        <Button variant="outline" className="w-full justify-start gap-2">
                            <TrendingUp className="h-4 w-4" /> View My Performance
                        </Button>
                    </CardContent>
                </Card>

                {/* Activity Feed */}
                <div className="md:col-span-2">
                    <ActivityFeed />
                </div>
            </div>
        </div>
    );
};

export default EmployeeDashboard;
