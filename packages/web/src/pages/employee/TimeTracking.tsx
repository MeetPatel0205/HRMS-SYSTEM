import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Grid,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    TextField
} from '@mui/material';
import {
    PlayArrow as PlayIcon,
    Stop as StopIcon,
    AccessTime as AccessTimeIcon
} from '@mui/icons-material';

interface TimeEntry {
    id: string;
    date: string;
    project: string;
    task: string;
    hours: number;
    status: string;
}

const TimeTracking: React.FC = () => {
    const [isTracking, setIsTracking] = useState(false);
    const [currentTime, setCurrentTime] = useState('00:00:00');
    const [entries] = useState<TimeEntry[]>([
        { id: '1', date: '2026-02-07', project: 'Project A', task: 'Development', hours: 8, status: 'APPROVED' },
        { id: '2', date: '2026-02-06', project: 'Project B', task: 'Testing', hours: 6, status: 'APPROVED' },
        { id: '3', date: '2026-02-05', project: 'Project A', task: 'Design', hours: 7, status: 'PENDING' },
    ]);

    const totalHoursThisWeek = entries.reduce((sum, entry) => sum + entry.hours, 0);

    const handleStartStop = () => {
        setIsTracking(!isTracking);
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Time Tracking
            </Typography>

            {/* Timer Card */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Current Timer
                            </Typography>
                            <Box sx={{ textAlign: 'center', my: 3 }}>
                                <Typography variant="h2" sx={{ fontFamily: 'monospace' }}>
                                    {currentTime}
                                </Typography>
                            </Box>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Project"
                                        placeholder="Select project"
                                        disabled={isTracking}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Task Description"
                                        placeholder="What are you working on?"
                                        disabled={isTracking}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        size="large"
                                        color={isTracking ? 'error' : 'success'}
                                        startIcon={isTracking ? <StopIcon /> : <PlayIcon />}
                                        onClick={handleStartStop}
                                    >
                                        {isTracking ? 'Stop Timer' : 'Start Timer'}
                                    </Button>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                This Week Summary
                            </Typography>
                            <Box sx={{ my: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                    <AccessTimeIcon sx={{ fontSize: 40 }} color="primary" />
                                    <Box>
                                        <Typography variant="h3">{totalHoursThisWeek}h</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Total Hours
                                        </Typography>
                                    </Box>
                                </Box>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                                            <Typography variant="h5">5</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Days Worked
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                                            <Typography variant="h5">3</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Projects
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                </Grid>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Time Entries Table */}
            <Paper>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">Recent Time Entries</Typography>
                    <Button variant="outlined">Export Timesheet</Button>
                </Box>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Project</TableCell>
                                <TableCell>Task</TableCell>
                                <TableCell>Hours</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {entries.map((entry) => (
                                <TableRow key={entry.id}>
                                    <TableCell>
                                        {new Date(entry.date).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>{entry.project}</TableCell>
                                    <TableCell>{entry.task}</TableCell>
                                    <TableCell>{entry.hours}h</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={entry.status}
                                            size="small"
                                            color={entry.status === 'APPROVED' ? 'success' : 'warning'}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default TimeTracking;
