import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Button,
    Container,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert
} from '@mui/material';
import { format } from 'date-fns';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { leaveService } from '../../services/api/leave';
import { LeaveRequest } from '../../types/leave';

const ManagerLeaveRequests: React.FC = () => {
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>('pending');
    const [rejectDialog, setRejectDialog] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchRequests();
    }, [statusFilter]); // Re-fetch when filter changes if backend supports filtering, otherwise filter locally

    const fetchRequests = async () => {
        try {
            // For now, fetch all and filter locally or backend support
            // My backend implementation supports status query param
            // But let's fetch all and filter in UI for now as `getAllRequests` fetches everything if no param passed?
            // Actually `getAllLeaveRequests` in service takes status? No, I added status arg to service? 
            // Let's check: Yes, I added status?: string to getAllLeaveRequests in LeaveService.ts (backend) 
            // and getAllRequests in frontend service doesn't take args yet?
            // Wait, I didn't update the frontend service method signature to accept args.
            // I'll fetch ALL requests and filter client side for now to be safe, or update frontend service.
            // Given I just wrote the frontend service without args, I will fetch all.
            const allRequests = await leaveService.getAllRequests();
            if (statusFilter === 'all') {
                setRequests(allRequests);
            } else {
                setRequests(allRequests.filter(r => r.status === statusFilter));
            }
        } catch (err) {
            console.error('Failed to fetch requests', err);
            setError('Failed to load leave requests');
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await leaveService.approveRequest(id);
            fetchRequests();
        } catch (err) {
            setError('Failed to approve request');
        }
    };

    const handleReject = async () => {
        if (!rejectDialog) return;
        try {
            await leaveService.rejectRequest(rejectDialog, rejectReason);
            setRejectDialog(null);
            setRejectReason('');
            fetchRequests();
        } catch (err) {
            setError('Failed to reject request');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'success';
            case 'rejected': return 'error';
            case 'pending': return 'warning';
            default: return 'default';
        }
    };

    return (
        <Container maxWidth="xl">
            <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
                Manage Leave Requests
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper sx={{ mb: 2 }}>
                <Box sx={{ p: 2 }}>
                    <Button
                        variant={statusFilter === 'pending' ? 'contained' : 'outlined'}
                        onClick={() => setStatusFilter('pending')}
                        sx={{ mr: 1 }}
                    >
                        Pending
                    </Button>
                    <Button
                        variant={statusFilter === 'approved' ? 'contained' : 'outlined'}
                        onClick={() => setStatusFilter('approved')}
                        sx={{ mr: 1 }}
                    >
                        Approved
                    </Button>
                    <Button
                        variant={statusFilter === 'rejected' ? 'contained' : 'outlined'}
                        onClick={() => setStatusFilter('rejected')}
                        sx={{ mr: 1 }}
                    >
                        Rejected
                    </Button>
                    <Button
                        variant={statusFilter === 'all' ? 'contained' : 'outlined'}
                        onClick={() => setStatusFilter('all')}
                    >
                        All
                    </Button>
                </Box>
            </Paper>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Employee</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Dates</TableCell>
                            <TableCell>Duration</TableCell>
                            <TableCell>Reason</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {requests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center">No requests found</TableCell>
                            </TableRow>
                        ) : (
                            requests.map((request) => (
                                <TableRow key={request.id}>
                                    <TableCell>
                                        <Typography variant="subtitle2">
                                            {request.employee ? `${request.employee.firstName} ${request.employee.lastName}` : request.employeeId}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {request.employee?.employeeNumber}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{request.leaveType?.name}</TableCell>
                                    <TableCell>
                                        {format(new Date(request.startDate), 'MMM dd')} - {format(new Date(request.endDate), 'MMM dd, yyyy')}
                                    </TableCell>
                                    <TableCell>{request.totalDays} Days</TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap title={request.reason}>
                                            {request.reason || '-'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={request.status.toUpperCase()}
                                            color={getStatusColor(request.status) as any}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {request.status === 'pending' && (
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="success"
                                                    startIcon={<CheckIcon />}
                                                    onClick={() => handleApprove(request.id)}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="error"
                                                    startIcon={<CloseIcon />}
                                                    onClick={() => setRejectDialog(request.id)}
                                                >
                                                    Reject
                                                </Button>
                                            </Box>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={!!rejectDialog} onClose={() => setRejectDialog(null)}>
                <DialogTitle>Reject Leave Request</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Rejection Reason"
                        fullWidth
                        multiline
                        rows={3}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRejectDialog(null)}>Cancel</Button>
                    <Button onClick={handleReject} color="error" variant="contained">
                        Confirm Rejection
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default ManagerLeaveRequests;
