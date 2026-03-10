import React, { useEffect, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    CircularProgress,
    Alert,
    Button
} from '@mui/material';
import {
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Download as DownloadIcon
} from '@mui/icons-material';

interface AuditLog {
    id: string;
    timestamp: string;
    user: string;
    action: string;
    resource: string;
    status: 'SUCCESS' | 'FAILURE';
    ipAddress: string;
    details: string;
}

const AuditLogs: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([
        { id: '1', timestamp: new Date().toISOString(), user: 'admin@company.com', action: 'LOGIN', resource: 'Auth', status: 'SUCCESS', ipAddress: '192.168.1.1', details: 'User logged in successfully' },
        { id: '2', timestamp: new Date().toISOString(), user: 'hr@company.com', action: 'CREATE', resource: 'Employee', status: 'SUCCESS', ipAddress: '192.168.1.2', details: 'Created new employee record' },
        { id: '3', timestamp: new Date().toISOString(), user: 'manager@company.com', action: 'UPDATE', resource: 'Team', status: 'SUCCESS', ipAddress: '192.168.1.3', details: 'Updated team information' },
        { id: '4', timestamp: new Date().toISOString(), user: 'user@company.com', action: 'DELETE', resource: 'Document', status: 'FAILURE', ipAddress: '192.168.1.4', details: 'Insufficient permissions' },
    ]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const filteredLogs = logs.filter(log => {
        const matchesSearch = 
            log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.resource.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
        const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;

        return matchesSearch && matchesAction && matchesStatus;
    });

    const handleExport = () => {
        console.log('Exporting audit logs...');
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4">Audit Logs</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Track all system activities and user actions
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={() => setLoading(true)}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        onClick={handleExport}
                    >
                        Export
                    </Button>
                </Box>
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
                            placeholder="Search logs..."
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
                            <InputLabel>Action</InputLabel>
                            <Select
                                value={actionFilter}
                                label="Action"
                                onChange={(e) => setActionFilter(e.target.value)}
                            >
                                <MenuItem value="ALL">All Actions</MenuItem>
                                <MenuItem value="LOGIN">Login</MenuItem>
                                <MenuItem value="CREATE">Create</MenuItem>
                                <MenuItem value="UPDATE">Update</MenuItem>
                                <MenuItem value="DELETE">Delete</MenuItem>
                            </Select>
                        </FormControl>
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
                                <MenuItem value="SUCCESS">Success</MenuItem>
                                <MenuItem value="FAILURE">Failure</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Timestamp</TableCell>
                            <TableCell>User</TableCell>
                            <TableCell>Action</TableCell>
                            <TableCell>Resource</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>IP Address</TableCell>
                            <TableCell>Details</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredLogs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    No audit logs found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredLogs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell>
                                        {new Date(log.timestamp).toLocaleString()}
                                    </TableCell>
                                    <TableCell>{log.user}</TableCell>
                                    <TableCell>
                                        <Chip label={log.action} size="small" />
                                    </TableCell>
                                    <TableCell>{log.resource}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={log.status}
                                            size="small"
                                            color={log.status === 'SUCCESS' ? 'success' : 'error'}
                                        />
                                    </TableCell>
                                    <TableCell>{log.ipAddress}</TableCell>
                                    <TableCell>{log.details}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default AuditLogs;
