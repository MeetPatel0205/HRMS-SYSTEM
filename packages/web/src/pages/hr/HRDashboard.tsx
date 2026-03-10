import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  FileText,
  Briefcase
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
import { Separator } from '../../components/ui/separator';
import { useWebSocket } from '../../hooks/useWebSocket';
import { AddEmployeeDialog } from '../../components/employee/AddEmployeeDialog';
import { useNavigate } from 'react-router-dom';

interface HRStats {
  totalEmployees: number;
  activeEmployees: number;
  newHires30Days: number;
  pendingApprovals: number;
  openPositions: number;
  avgTimeToHire: number;
  turnoverRate: number;
  employeeSatisfaction: number;
}

const HRDashboard: React.FC = () => {
  const [stats, setStats] = useState<HRStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { socket, connected } = useWebSocket();
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Listen for real-time updates via WebSocket
  useEffect(() => {
    if (!socket || !connected) return;

    const handleUpdate = () => {
      console.log('Real-time event received, refreshing HR dashboard stats...');
      loadDashboardData();
    };

    socket.on('employee:created', handleUpdate);
    socket.on('employee:updated', handleUpdate);
    socket.on('employee:deleted', handleUpdate);
    socket.on('activity:new', handleUpdate);

    return () => {
      socket.off('employee:created', handleUpdate);
      socket.off('employee:updated', handleUpdate);
      socket.off('employee:deleted', handleUpdate);
      socket.off('activity:new', handleUpdate);
    };
  }, [socket, connected]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Mocking parallel API calls for now if endpoints aren't ready
      // const [employeesRes] = await Promise.all([
      //   apiClient.get('/employees'),
      // ]);

      // Simulating data until backend is fully ready
      const employees = []; // employeesRes.data?.data || [];

      setStats({
        totalEmployees: 120, // employees.length,
        activeEmployees: 115, // employees.filter((e: any) => e.status === 'active').length,
        newHires30Days: 8,
        pendingApprovals: 12,
        openPositions: 5,
        avgTimeToHire: 28,
        turnoverRate: 8.5,
        employeeSatisfaction: 4.2,
      });

      setPendingItems([
        { id: 1, type: 'Leave Request', employee: 'John Doe', date: '2026-02-10' },
        { id: 2, type: 'Performance Review', employee: 'Jane Smith', date: '2026-02-12' },
        { id: 3, type: 'Expense Report', employee: 'Bob Johnson', date: '2026-02-08' },
      ]);
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
        <h1 className="text-3xl font-bold tracking-tight">HR Dashboard</h1>
        <Button onClick={() => setAddDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Employees</span>
            </div>
            <div className="text-2xl font-bold">{stats?.totalEmployees || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeEmployees || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-2">
              <UserPlus className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">New Hires</span>
            </div>
            <div className="text-2xl font-bold">{stats?.newHires30Days || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <div className="text-2xl font-bold">{stats?.pendingApprovals || 0}</div>
            <p className="text-xs text-muted-foreground">
              Approvals needed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-2">
              <Briefcase className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Open Positions</span>
            </div>
            <div className="text-2xl font-bold">{stats?.openPositions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active job postings
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* HR Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>HR Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Average Time to Hire</p>
                  <p className="text-xs text-muted-foreground">Days to fill a position</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-bold">{stats?.avgTimeToHire || 0} days</span>
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Good</Badge>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Turnover Rate</p>
                  <p className="text-xs text-muted-foreground">Annual run rate</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-bold">{stats?.turnoverRate || 0}%</span>
                  <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Normal</Badge>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Employee Satisfaction</p>
                  <span className="font-bold">{stats?.employeeSatisfaction || 0}/5.0</span>
                </div>
                <Progress value={(stats?.employeeSatisfaction || 0) * 20} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>Recent requests requiring action</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{item.type}</p>
                    <p className="text-xs text-muted-foreground">{item.employee} • {item.date}</p>
                  </div>
                  <Button size="sm" variant="outline">Review</Button>
                </div>
              ))}
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
              <Button variant="outline" onClick={() => navigate('/hr/employees')}>Employee Directory</Button>
              <Button variant="outline" onClick={() => navigate('/recruitment')}>Recruitment Pipeline</Button>
              <Button variant="outline" onClick={() => navigate('/performance')}>Performance Reviews</Button>
              <Button variant="outline" onClick={() => navigate('/benefits')}>Compensation & Benefits</Button>
              <Button variant="outline" onClick={() => navigate('/learning')}>Learning & Development</Button>
              <Button variant="outline" onClick={() => navigate('/hr')}>HR Analytics</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <AddEmployeeDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSuccess={() => loadDashboardData()}
      />
    </div>
  );
};

export default HRDashboard;
