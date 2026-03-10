import React from 'react';
import {
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    LinearProgress
} from '@mui/material';
import { LeaveBalance } from '../../types/leave';

interface LeaveBalanceCardProps {
    balances: LeaveBalance[];
}

export const LeaveBalanceCards: React.FC<LeaveBalanceCardProps> = ({ balances }) => {
    return (
        <Grid container spacing={3}>
            {balances.map((balance) => (
                <Grid item xs={12} sm={6} md={3} key={balance.leaveType.id}>
                    <Card elevation={0} variant="outlined">
                        <CardContent>
                            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                {balance.leaveType.name}
                            </Typography>
                            <Typography variant="h4" component="div">
                                {balance.remainingDays}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, mb: 0.5 }}>
                                <Typography variant="caption" color="textSecondary">
                                    Used: {balance.usedDays}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                    Total: {balance.totalDays}
                                </Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={(balance.usedDays / balance.totalDays) * 100}
                                color={balance.remainingDays < 2 ? 'error' : 'primary'}
                            />
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );
};
