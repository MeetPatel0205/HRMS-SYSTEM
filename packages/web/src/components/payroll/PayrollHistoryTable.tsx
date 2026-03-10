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
    IconButton,
    Typography
} from '@mui/material';
import { Visibility } from '@mui/icons-material';
import { PayrollEntry } from '../../types/payroll';
import { format } from 'date-fns';

interface PayrollHistoryTableProps {
    entries: PayrollEntry[];
    onView?: (entry: PayrollEntry) => void;
}

export const PayrollHistoryTable: React.FC<PayrollHistoryTableProps> = ({ entries, onView }) => {
    if (entries.length === 0) {
        return <Typography variant="body1" color="textSecondary">No payroll history found.</Typography>;
    }

    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Pay Period</TableCell>
                        <TableCell>Pay Date</TableCell>
                        <TableCell align="right">Gross Pay</TableCell>
                        <TableCell align="right">Net Pay</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {entries.map((entry) => (
                        <TableRow key={entry.id}>
                            <TableCell>
                                {format(new Date(entry.payPeriodStart), 'MMM d')} - {format(new Date(entry.payPeriodEnd), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                                {entry.processedAt ? format(new Date(entry.processedAt), 'MMM d, yyyy') : '-'}
                            </TableCell>
                            <TableCell align="right">${entry.grossPay.toFixed(2)}</TableCell>
                            <TableCell align="right"><strong>${entry.netPay.toFixed(2)}</strong></TableCell>
                            <TableCell>
                                <Chip
                                    label={entry.status}
                                    color={entry.status === 'processed' ? 'success' : 'default'}
                                    size="small"
                                />
                            </TableCell>
                            <TableCell align="right">
                                <IconButton size="small" onClick={() => onView && onView(entry)} title="View Pay Stub">
                                    <Visibility />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
