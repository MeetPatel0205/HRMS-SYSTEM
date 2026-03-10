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
    MenuItem
} from '@mui/material';
import { Add, School, CheckCircle } from '@mui/icons-material';
import { TrainingCourse, TrainingRecord } from '../types/learning';
import { learningService } from '../services/api/learning';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';

const LearningPage: React.FC = () => {
    const { hasPermission } = useAuth();
    const [tab, setTab] = useState(0);
    const [courses, setCourses] = useState<TrainingCourse[]>([]);
    const [myRecords, setMyRecords] = useState<TrainingRecord[]>([]);
    const [loading, setLoading] = useState(false);

    // Admin handling
    const isAdmin = hasPermission('write_learning') || hasPermission('write_employee'); // Fallback
    const [openCourseDialog, setOpenCourseDialog] = useState(false);
    const [newCourse, setNewCourse] = useState<Partial<TrainingCourse>>({
        title: '', description: '', type: 'online', duration: 60, provider: 'Internal'
    });

    useEffect(() => {
        loadData();
    }, [tab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (tab === 0) {
                // Catalog
                const data = await learningService.getCourses();
                setCourses(data);
                // Load own records to check status
                if (!isAdmin) {
                    const records = await learningService.getMyRecords();
                    setMyRecords(records);
                }
            } else if (tab === 1) {
                // My Learning
                const data = await learningService.getMyRecords();
                setMyRecords(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleEnroll = async (course: TrainingCourse) => {
        try {
            await learningService.enroll(course.id);
            alert('Enrolled successfully!');
            loadData();
        } catch (err) {
            console.error(err);
            alert('Failed to enroll');
        }
    };

    const handleCreateCourse = async () => {
        try {
            await learningService.createCourse(newCourse);
            setOpenCourseDialog(false);
            loadData();
        } catch (err) {
            console.error(err);
            alert('Failed to create course');
        }
    };

    const markCompleted = async (record: TrainingRecord) => {
        if (!window.confirm('Mark this course as completed?')) return;
        try {
            await learningService.updateProgress(record.id, 'completed', 100);
            loadData();
        } catch (err) {
            console.error(err);
        }
    }

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4">Learning & Development</Typography>
                {isAdmin && (
                    <Button variant="contained" startIcon={<Add />} onClick={() => setOpenCourseDialog(true)}>
                        Create Course
                    </Button>
                )}
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                    <Tab label="Course Catalog" />
                    <Tab label="My Learning" />
                </Tabs>
            </Box>

            <Grid container spacing={3}>
                {tab === 0 && courses.map(course => {
                    const record = myRecords.find(r => r.trainingCourseId === course.id);
                    const isEnrolled = !!record;
                    const isCompleted = record?.status === 'completed';

                    return (
                        <Grid item xs={12} md={4} key={course.id}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="h6">{course.title}</Typography>
                                        <Chip label={course.type} size="small" color="primary" variant="outlined" />
                                    </Box>
                                    <Typography color="textSecondary" gutterBottom>{course.provider} • {course.duration} mins</Typography>
                                    <Typography variant="body2">{course.description}</Typography>
                                </CardContent>
                                <CardActions>
                                    {isCompleted ? (
                                        <Button disabled startIcon={<CheckCircle />} color="success" fullWidth>Completed</Button>
                                    ) : isEnrolled ? (
                                        <Button disabled fullWidth variant="outlined">Enrolled</Button>
                                    ) : (
                                        <Button fullWidth variant="contained" onClick={() => handleEnroll(course)}>Enroll</Button>
                                    )}
                                </CardActions>
                            </Card>
                        </Grid>
                    );
                })}

                {tab === 1 && myRecords.map(record => (
                    <Grid item xs={12} md={6} key={record.id}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <School color="primary" sx={{ mr: 2 }} />
                                    <Box>
                                        <Typography variant="h6">{record.trainingCourse?.title}</Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            Enrolled: {format(new Date(record.enrollmentDate), 'MMM d, yyyy')}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                                    <Box sx={{ width: '100%', mr: 1 }}>
                                        <LinearProgress
                                            variant="determinate"
                                            value={record.status === 'completed' ? 100 : record.status === 'in_progress' ? 50 : 0}
                                            color={record.status === 'completed' ? 'success' : 'primary'}
                                        />
                                    </Box>
                                    <Box sx={{ minWidth: 35 }}>
                                        <Typography variant="body2" color="textSecondary">
                                            {record.status === 'completed' ? '100%' : record.status === 'in_progress' ? '50%' : '0%'}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                            <CardActions>
                                {record.status !== 'completed' && (
                                    <Button size="small" onClick={() => markCompleted(record)}>Mark Completed</Button>
                                )}
                                {record.status === 'completed' && (
                                    <Button size="small" color="success">View Certificate</Button>
                                )}
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Dialog open={openCourseDialog} onClose={() => setOpenCourseDialog(false)}>
                <DialogTitle>Create New Course</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 400 }}>
                        <TextField
                            label="Course Title"
                            value={newCourse.title}
                            onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                        />
                        <TextField
                            label="Description"
                            multiline
                            rows={3}
                            value={newCourse.description}
                            onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                        />
                        <TextField
                            select
                            label="Type"
                            value={newCourse.type}
                            onChange={(e) => setNewCourse({ ...newCourse, type: e.target.value })}
                        >
                            <MenuItem value="online">Online</MenuItem>
                            <MenuItem value="instructor_led">Instructor Led</MenuItem>
                            <MenuItem value="workshop">Workshop</MenuItem>
                        </TextField>
                        <TextField
                            label="Duration (mins)"
                            type="number"
                            value={newCourse.duration}
                            onChange={(e) => setNewCourse({ ...newCourse, duration: Number(e.target.value) })}
                        />
                        <TextField
                            label="Provider"
                            value={newCourse.provider}
                            onChange={(e) => setNewCourse({ ...newCourse, provider: e.target.value })}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenCourseDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreateCourse}>Create</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default LearningPage;
