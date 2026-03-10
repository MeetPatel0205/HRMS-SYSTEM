import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Chip
} from '@mui/material';
import { format } from 'date-fns';
import { TimeEntry } from '../../types/time';

interface TimesheetTableProps {
    entries: TimeEntry[];
}

export const TimesheetTable: React.FC<TimesheetTableProps> = ({ entries }) => {
    return (
        <TableContainer component={Paper} variant="outlined" elevation={0}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Clock In</TableCell>
                        <TableCell>Clock Out</TableCell>
                        <TableCell>Total Hours</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Notes</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {entries.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} align="center">
                                <Typography variant="body2" color="textSecondary">
                                    No entries found for this period.
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ) : (
                        entries.map((entry) => (
                            <TableRow key={entry.id}>
                                <TableCell>
                                    {format(new Date(entry.date), 'MMM dd, yyyy')}
                                </TableCell>
                                <TableCell>
                                    {format(new Date(entry.clockIn), 'HH:mm')}
                                </TableCell>
                                <TableCell>
                                    {entry.clockOut ? format(new Date(entry.clockOut), 'HH:mm') : '-'}
                                </TableCell>
                                <TableCell>
                                    {entry.totalHours > 0 ? `${entry.totalHours} hrs` : '-'}
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={entry.status.toUpperCase()}
                                        size="small"
                                        color={entry.status === 'approved' ? 'success' : 'default'}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" color="textSecondary" noWrap>
                                        {entry.notes || '-'}
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
