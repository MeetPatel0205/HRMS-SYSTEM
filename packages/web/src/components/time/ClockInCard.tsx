import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Button,
    Box,
    Chip,
    CircularProgress,
    Alert
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import PauseIcon from '@mui/icons-material/Pause';
import { format } from 'date-fns';
import { timeService } from '../../services/api/time';
import { TimeAttendanceStatus } from '../../types/time';

interface ClockInCardProps {
    onStatusChange: () => void;
}

export const ClockInCard: React.FC<ClockInCardProps> = ({ onStatusChange }) => {
    const [status, setStatus] = useState<TimeAttendanceStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            setLoading(true);
            const data = await timeService.getStatus();
            setStatus(data);
        } catch (err) {
            console.error('Failed to fetch status', err);
        } finally {
            setLoading(false);
        }
    };

    const handleClockIn = async () => {
        try {
            setActionLoading(true);
            setError(null);
            // Get location if possible (omitted for brevity, can add later)
            await timeService.clockIn();
            await fetchStatus();
            onStatusChange();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to clock in');
        } finally {
            setActionLoading(false);
        }
    };

    const handleClockOut = async () => {
        try {
            setActionLoading(true);
            setError(null);
            await timeService.clockOut();
            await fetchStatus();
            onStatusChange();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to clock out');
        } finally {
            setActionLoading(false);
        }
    };

    const handleBreak = async (start: boolean) => {
        try {
            setActionLoading(true);
            setError(null);
            if (start) {
                await timeService.startBreak();
            } else {
                await timeService.endBreak();
            }
            await fetchStatus();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update break status');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <Card sx={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress />
            </Card>
        );
    }

    const isClockedIn = status?.status === 'clocked_in';
    const isOnBreak = status?.status === 'on_break';
    const isClockedOut = status?.status === 'clocked_out';

    return (
        <Card elevation={0} variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="textSecondary" gutterBottom>
                    {format(currentTime, 'EEEE, MMMM do yyyy')}
                </Typography>
                <Typography variant="h2" sx={{ fontWeight: 'bold', mb: 2, fontFamily: 'monospace' }}>
                    {format(currentTime, 'HH:mm:ss')}
                </Typography>

                <Box sx={{ mb: 3 }}>
                    <Chip
                        label={isClockedIn ? 'CLOCKED IN' : isOnBreak ? 'ON BREAK' : 'CLOCKED OUT'}
                        color={isClockedIn ? 'success' : isOnBreak ? 'warning' : 'default'}
                        variant={isClockedOut ? 'outlined' : 'filled'}
                    />
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                    {isClockedOut ? (
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            startIcon={<PlayArrowIcon />}
                            onClick={handleClockIn}
                            disabled={actionLoading}
                        >
                            Clock In
                        </Button>
                    ) : (
                        <>
                            {isOnBreak ? (
                                <Button
                                    variant="outlined"
                                    color="warning"
                                    startIcon={<PlayArrowIcon />}
                                    onClick={() => handleBreak(false)}
                                    disabled={actionLoading}
                                >
                                    End Break
                                </Button>
                            ) : (
                                <Button
                                    variant="outlined"
                                    color="warning"
                                    startIcon={<PauseIcon />}
                                    onClick={() => handleBreak(true)}
                                    disabled={actionLoading}
                                >
                                    Start Break
                                </Button>
                            )}

                            <Button
                                variant="contained"
                                color="error"
                                size="large"
                                startIcon={<StopIcon />}
                                onClick={handleClockOut}
                                disabled={actionLoading || isOnBreak}
                            >
                                Clock Out
                            </Button>
                        </>
                    )}
                </Box>

                {status?.entry && !isClockedOut && (
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 2 }}>
                        Clocked in at: {format(new Date(status.entry.clockIn), 'HH:mm')}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
};
