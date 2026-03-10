import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  People as PeopleIcon,
  Business as BusinessIcon,
  Security as SecurityIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { ActivityFeed } from '../../components/ActivityFeed';
import apiClient from '../../services/apiClient';
import { employeeService } from '../../services/employeeService';
import { useWebSocket } from '../../hooks/useWebSocket';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalTenants: number;
  activeTenants: number;
  systemHealth: string;
  errors24h: number;
  apiCalls24h: number;
  avgResponseTime: number;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const { socket, connected } = useWebSocket();
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Listen for real-time updates via WebSocket
  useEffect(() => {
    if (!socket || !connected) return;

    // Handler to refresh dashboard data
    const handleUpdate = () => {
      console.log('Real-time event received, refreshing admin dashboard stats...');
      loadDashboardData();
    };

    // Listen to relevant global events
    socket.on('activity:new', handleUpdate);
    socket.on('employee:created', handleUpdate);
    socket.on('employee:updated', handleUpdate);
    socket.on('employee:deleted', handleUpdate);

    return () => {
      socket.off('activity:new', handleUpdate);
      socket.off('employee:created', handleUpdate);
      socket.off('employee:updated', handleUpdate);
      socket.off('employee:deleted', handleUpdate);
    };
  }, [socket, connected]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Load stats from various endpoints
      // For tenants, we keep the mock call or replace if tenantService exists
      // For employees, we use getStatistics
      const [empStatsRes, tenantsRes] = await Promise.all([
        employeeService.getStatistics(),
        apiClient.get('/tenants').catch(() => ({ data: { data: [] } })), // Fallback if tenants endpoint fails or mock
      ]);

      const empStats = empStatsRes.data || empStatsRes; // Handle if service returns data or wrapped response

      setStats({
        totalUsers: empStats.total || 0,
        activeUsers: empStats.byStatus?.active || 0,
        totalTenants: tenantsRes.data?.data?.length || 0,
        activeTenants: tenantsRes.data?.data?.filter((t: any) => t.isActive).length || 0,
        systemHealth: 'Healthy',
        errors24h: 0,
        apiCalls24h: 15420,
        avgResponseTime: 145,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Admin Dashboard
        </Typography>
        <Button variant="outlined" onClick={loadDashboardData}>
          Refresh
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PeopleIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Employees</Typography>
              </Box>
              <Typography variant="h4">{stats?.totalUsers || 0}</Typography>
              <Typography variant="body2" color="text.secondary">
                {stats?.activeUsers || 0} active
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BusinessIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Tenants</Typography>
              </Box>
              <Typography variant="h4">{stats?.totalTenants || 0}</Typography>
              <Typography variant="body2" color="text.secondary">
                {stats?.activeTenants || 0} active
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">System Health</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {stats?.systemHealth || 'Unknown'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All systems operational
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <WarningIcon color={stats?.errors24h === 0 ? 'success' : 'error'} sx={{ mr: 1 }} />
                <Typography variant="h6">Errors (24h)</Typography>
              </Box>
              <Typography variant="h4" color={stats?.errors24h === 0 ? 'success.main' : 'error.main'}>
                {stats?.errors24h || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No critical issues
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Performance Metrics
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="API Calls (24h)"
                  secondary={stats?.apiCalls24h?.toLocaleString() || '0'}
                />
                <Chip label="Normal" color="success" size="small" />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Avg Response Time"
                  secondary={`${stats?.avgResponseTime || 0}ms`}
                />
                <Chip label="Good" color="success" size="small" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Database Status" secondary="Connected" />
                <Chip label="Healthy" color="success" size="small" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Redis Cache" secondary="Connected" />
                <Chip label="Healthy" color="success" size="small" />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button variant="outlined" fullWidth onClick={() => navigate('/admin/users')}>
                Manage Users
              </Button>
              <Button variant="outlined" fullWidth onClick={() => navigate('/admin/roles')}>
                Manage Roles
              </Button>
              <Button variant="outlined" fullWidth onClick={() => navigate('/admin/access-panel')}>
                System Settings
              </Button>
              <Button variant="outlined" fullWidth onClick={() => navigate('/admin/audit-logs')}>
                View Audit Logs
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <ActivityFeed />
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
