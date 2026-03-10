import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    CardActions,
    Button,
    Chip,
    Box,
    LinearProgress,
    Tabs,
    Tab,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Avatar
} from '@mui/material';
import { Add, Favorite, EmojiEvents } from '@mui/icons-material';
import { WellnessProgram, WellnessEnrollment } from '../types/wellness';
import { wellnessService } from '../services/api/wellness';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';

const WellnessPage: React.FC = () => {
    const { hasPermission } = useAuth();
    const [tab, setTab] = useState(0);
    const [programs, setPrograms] = useState<WellnessProgram[]>([]);
    const [myEnrollments, setMyEnrollments] = useState<WellnessEnrollment[]>([]);
    const [loading, setLoading] = useState(false);

    // Admin handling
    const isAdmin = hasPermission('write_wellness') || hasPermission('write_benefits'); // Fallback
    const [openProgramDialog, setOpenProgramDialog] = useState(false);
    const [newProgram, setNewProgram] = useState<Partial<WellnessProgram>>({
        name: '', description: '', startDate: format(new Date(), 'yyyy-MM-dd')
    });

    useEffect(() => {
        loadData();
    }, [tab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (tab === 0) {
                // Programs
                const data = await wellnessService.getPrograms();
                setPrograms(data);
                if (!isAdmin) {
                    const enrolls = await wellnessService.getMyEnrollments();
                    setMyEnrollments(enrolls);
                }
            } else if (tab === 1) {
                // My Wellness
                const data = await wellnessService.getMyEnrollments();
                setMyEnrollments(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleEnroll = async (program: WellnessProgram) => {
        try {
            await wellnessService.enroll(program.id);
            alert('Enrolled successfully! Get ready to get fit!');
            loadData();
        } catch (err) {
            console.error(err);
            alert('Failed to enroll');
        }
    };

    const handleCreateProgram = async () => {
        try {
            await wellnessService.createProgram(newProgram);
            setOpenProgramDialog(false);
            loadData();
        } catch (err) {
            console.error(err);
            alert('Failed to create program');
        }
    };

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4">Wellness Center</Typography>
                {isAdmin && (
                    <Button variant="contained" startIcon={<Add />} onClick={() => setOpenProgramDialog(true)}>
                        New Program
                    </Button>
                )}
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                    <Tab label="Wellness Programs" />
                    <Tab label="My Activity" />
                </Tabs>
            </Box>

            <Grid container spacing={3}>
                {tab === 0 && programs.map(program => {
                    const isEnrolled = myEnrollments.some(e => e.programId === program.id && e.status !== 'completed');
                    return (
                        <Grid item xs={12} md={4} key={program.id}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="h6">{program.name}</Typography>
                                        <Favorite color="error" />
                                    </Box>
                                    <Typography color="textSecondary" gutterBottom>
                                        Starts: {format(new Date(program.startDate), 'MMM d, yyyy')}
                                    </Typography>
                                    <Typography variant="body2">{program.description}</Typography>
                                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                                        <EmojiEvents color="warning" sx={{ mr: 1, fontSize: 20 }} />
                                        <Typography variant="caption">{program._count?.enrollments || 0} participants</Typography>
                                    </Box>
                                </CardContent>
                                <CardActions>
                                    {isEnrolled ? (
                                        <Button disabled fullWidth variant="outlined">Joined</Button>
                                    ) : (
                                        <Button fullWidth variant="contained" onClick={() => handleEnroll(program)}>Join Program</Button>
                                    )}
                                </CardActions>
                            </Card>
                        </Grid>
                    );
                })}

                {tab === 1 && myEnrollments.map(enrollment => (
                    <Grid item xs={12} md={6} key={enrollment.id}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Favorite color="error" sx={{ mr: 2 }} />
                                    <Box>
                                        <Typography variant="h6">{enrollment.program?.name}</Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            Joined: {format(new Date(enrollment.enrolledAt), 'MMM d, yyyy')}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                                    <Typography variant="body1">Current Points</Typography>
                                    <Chip label={enrollment.points} color="primary" />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Dialog open={openProgramDialog} onClose={() => setOpenProgramDialog(false)}>
                <DialogTitle>Create Wellness Program</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 400 }}>
                        <TextField
                            label="Program Name"
                            value={newProgram.name}
                            onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                        />
                        <TextField
                            label="Description"
                            multiline
                            rows={3}
                            value={newProgram.description}
                            onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                        />
                        <TextField
                            label="Start Date"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={newProgram.startDate}
                            onChange={(e) => setNewProgram({ ...newProgram, startDate: e.target.value })}
                        />
                        <TextField
                            label="End Date (Optional)"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={newProgram.endDate || ''}
                            onChange={(e) => setNewProgram({ ...newProgram, endDate: e.target.value })}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenProgramDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreateProgram}>Create</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default WellnessPage;
