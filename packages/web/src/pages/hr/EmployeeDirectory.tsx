import React, { useEffect, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    InputAdornment,
    Grid,
    Card,
    CardContent,
    Avatar,
    Chip,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Alert,
    IconButton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
    Search as SearchIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    Business as BusinessIcon,
    Refresh as RefreshIcon,
    Visibility as VisibilityIcon
} from '@mui/icons-material';
import { employeeService } from '../../services/employeeService';
import { useWebSocket } from '../../hooks/useWebSocket';

interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    position: string;
    department: string;
    status: string;
    avatar?: string;
    hireDate: string;
}

const EmployeeDirectory: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [departmentFilter, setDepartmentFilter] = useState('ALL');
    const { socket, connected } = useWebSocket();
    const navigate = useNavigate();

    useEffect(() => {
        loadEmployees();
    }, []);

    // Listen for real-time employee updates via WebSocket
    useEffect(() => {
        if (!socket || !connected) return;

        const handleUpdate = () => {
            console.log('Real-time employee event received, refreshing directory...');
            loadEmployees();
        };

        socket.on('employee:created', handleUpdate);
        socket.on('employee:updated', handleUpdate);
        socket.on('employee:deleted', handleUpdate);

        return () => {
            socket.off('employee:created', handleUpdate);
            socket.off('employee:updated', handleUpdate);
            socket.off('employee:deleted', handleUpdate);
        };
    }, [socket, connected]);

    const loadEmployees = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await employeeService.getEmployees();
            if (response.success && response.data && Array.isArray(response.data.data)) {
                setEmployees(response.data.data.map((emp: any) => ({
                    id: emp.id,
                    firstName: emp.personalInfo?.firstName || emp.firstName || '',
                    lastName: emp.personalInfo?.lastName || emp.lastName || '',
                    email: emp.contactInfo?.email || emp.user?.email || '',
                    phone: emp.contactInfo?.phone || emp.phoneNumber,
                    position: emp.employmentInfo?.jobTitle || emp.position || 'N/A',
                    department: emp.employmentInfo?.department || emp.department?.name || emp.department || 'N/A',
                    status: emp.employmentInfo?.status || emp.status,
                    avatar: emp.profilePicture,
                    hireDate: emp.employmentInfo?.hireDate || emp.hireDate
                })));
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load employees');
        } finally {
            setLoading(false);
        }
    };

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch =
            emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.position.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'ALL' || emp.status?.toLowerCase() === statusFilter.toLowerCase();
        const matchesDepartment = departmentFilter === 'ALL' || emp.department?.toLowerCase() === departmentFilter.toLowerCase();

        return matchesSearch && matchesStatus && matchesDepartment;
    });

    const departments = Array.from(new Set(employees.map(e => e.department)));

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Employee Directory</Typography>
                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={loadEmployees}
                >
                    Refresh
                </Button>
            </Box>

            {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            placeholder="Search employees..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Status"
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <MenuItem value="ALL">All Status</MenuItem>
                                <MenuItem value="ACTIVE">Active</MenuItem>
                                <MenuItem value="INACTIVE">Inactive</MenuItem>
                                <MenuItem value="ON_LEAVE">On Leave</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Department</InputLabel>
                            <Select
                                value={departmentFilter}
                                label="Department"
                                onChange={(e) => setDepartmentFilter(e.target.value)}
                            >
                                <MenuItem value="ALL">All Departments</MenuItem>
                                {departments.map(dept => (
                                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            {/* Results Summary */}
            <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    Showing {filteredEmployees.length} of {employees.length} employees
                </Typography>
            </Box>

            {/* Employee Cards */}
            <Grid container spacing={2}>
                {filteredEmployees.length === 0 ? (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 3, textAlign: 'center' }}>
                            <Typography variant="body1" color="text.secondary">
                                No employees found matching your criteria
                            </Typography>
                        </Paper>
                    </Grid>
                ) : (
                    filteredEmployees.map((employee) => (
                        <Grid item xs={12} sm={6} md={4} key={employee.id}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'start', mb: 2 }}>
                                        <Avatar
                                            src={employee.avatar}
                                            sx={{ width: 60, height: 60, mr: 2 }}
                                        >
                                            {employee.firstName[0]}{employee.lastName[0]}
                                        </Avatar>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="h6">
                                                {employee.firstName} {employee.lastName}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {employee.position}
                                            </Typography>
                                            <Chip
                                                label={employee.status || 'Unknown'}
                                                size="small"
                                                color={employee.status?.toLowerCase() === 'active' ? 'success' : 'default'}
                                                sx={{ mt: 1 }}
                                            />
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <EmailIcon fontSize="small" color="action" />
                                            <Typography variant="body2" noWrap>
                                                {employee.email}
                                            </Typography>
                                        </Box>
                                        {employee.phone && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <PhoneIcon fontSize="small" color="action" />
                                                <Typography variant="body2">
                                                    {employee.phone}
                                                </Typography>
                                            </Box>
                                        )}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <BusinessIcon fontSize="small" color="action" />
                                            <Typography variant="body2">
                                                {employee.department}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        startIcon={<VisibilityIcon />}
                                        sx={{ mt: 2 }}
                                        onClick={() => navigate(`/hr/employees/${employee.id}`)}
                                    >
                                        View Profile
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))
                )}
            </Grid>
        </Box>
    );
};

export default EmployeeDirectory;
