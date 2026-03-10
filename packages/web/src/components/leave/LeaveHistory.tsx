import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Typography
} from '@mui/material';
import { format } from 'date-fns';
import { LeaveRequest } from '../../types/leave';

interface LeaveHistoryProps {
    requests: LeaveRequest[];
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'approved': return 'success';
        case 'rejected': return 'error';
        case 'pending': return 'warning';
        case 'cancelled': return 'default';
        default: return 'default';
    }
};

export const LeaveHistory: React.FC<LeaveHistoryProps> = ({ requests }) => {
    return (
        <TableContainer component={Paper} elevation={0} variant="outlined">
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>Dates</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Reason</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {requests.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} align="center">
                                <Typography variant="body2" color="textSecondary">
                                    No leave history found.
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ) : (
                        requests.map((request) => (
                            <TableRow key={request.id}>
                                <TableCell>
                                    <Typography variant="body2" fontWeight="bold">
                                        {request.leaveType?.name || 'Unknown'}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    {format(new Date(request.startDate), 'MMM dd, yyyy')} - {format(new Date(request.endDate), 'MMM dd, yyyy')}
                                </TableCell>
                                <TableCell>{request.totalDays} Days</TableCell>
                                <TableCell>
                                    <Chip
                                        label={request.status.toUpperCase()}
                                        color={getStatusColor(request.status) as any}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" color="textSecondary" noWrap sx={{ maxWidth: 200 }}>
                                        {request.reason || '-'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
