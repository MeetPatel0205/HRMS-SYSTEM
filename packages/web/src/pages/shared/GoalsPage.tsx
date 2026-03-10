import React, { useEffect, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Grid,
    Card,
    CardContent,
    LinearProgress,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    TrendingUp as TrendingUpIcon,
    Flag as FlagIcon
} from '@mui/icons-material';
import { goalsApi } from '../../services/api';

interface Goal {
    id: string;
    title: string;
    description: string;
    type: string;
    status: string;
    progress: number;
    startDate: string;
    targetDate: string;
    employeeName?: string;
}

const GoalsPage: React.FC = () => {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'QUARTERLY',
        status: 'ACTIVE',
        progress: 0,
        startDate: '',
        targetDate: ''
    });

    useEffect(() => {
        loadGoals();
    }, []);

    const loadGoals = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await goalsApi.getAll();
            if (response.data) {
                setGoals(response.data.map((goal: any) => ({
                    id: goal.id,
                    title: goal.title,
                    description: goal.description || '',
                    type: goal.type,
                    status: goal.status,
                    progress: goal.progress || 0,
                    startDate: goal.startDate,
                    targetDate: goal.targetDate,
                    employeeName: goal.employee ? 
                        `${goal.employee.firstName} ${goal.employee.lastName}` : undefined
                })));
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load goals');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (goal?: Goal) => {
        if (goal) {
            setSelectedGoal(goal);
            setFormData({
                title: goal.title,
                description: goal.description,
                type: goal.type,
                status: goal.status,
                progress: goal.progress,
                startDate: goal.startDate,
                targetDate: goal.targetDate
            });
        } else {
            setSelectedGoal(null);
            setFormData({
                title: '',
                description: '',
                type: 'QUARTERLY',
                status: 'ACTIVE',
                progress: 0,
                startDate: new Date().toISOString().split('T')[0],
                targetDate: ''
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedGoal(null);
    };

    const handleSaveGoal = async () => {
        try {
            if (selectedGoal) {
                await goalsApi.update(selectedGoal.id, formData);
            } else {
                await goalsApi.create(formData);
            }
            handleCloseDialog();
            loadGoals();
        } catch (err: any) {
            setError(err.message || 'Failed to save goal');
        }
    };

    const handleDeleteGoal = async (goalId: string) => {
        if (window.confirm('Are you sure you want to delete this goal?')) {
            try {
                await goalsApi.delete(goalId);
                loadGoals();
            } catch (err: any) {
                setError(err.message || 'Failed to delete goal');
            }
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ON_TRACK': return 'success';
            case 'AT_RISK': return 'warning';
            case 'OFF_TRACK': return 'error';
            case 'COMPLETED': return 'info';
            default: return 'default';
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Goals & OKRs</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Create Goal
                </Button>
            </Box>

            {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                {goals.length === 0 ? (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 3, textAlign: 'center' }}>
                            <TrendingUpIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                No goals yet
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Create your first goal to start tracking progress
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => handleOpenDialog()}
                            >
                                Create Goal
                            </Button>
                        </Paper>
                    </Grid>
                ) : (
                    goals.map((goal) => (
                        <Grid item xs={12} md={6} key={goal.id}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="h6" gutterBottom>
                                                {goal.title}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                {goal.description}
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                <Chip
                                                    label={goal.type}
                                                    size="small"
                                                    icon={<FlagIcon />}
                                                />
                                                <Chip
                                                    label={goal.status}
                                                    size="small"
                                                    color={getStatusColor(goal.status)}
                                                />
                                                {goal.employeeName && (
                                                    <Chip
                                                        label={goal.employeeName}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                )}
                                            </Box>
                                        </Box>
                                        <Box>
                                            <IconButton size="small" onClick={() => handleOpenDialog(goal)}>
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => handleDeleteGoal(goal.id)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </Box>
                                    </Box>

                                    <Box sx={{ mb: 2 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Progress
                                            </Typography>
                                            <Typography variant="body2" fontWeight="bold">
                                                {goal.progress}%
                                            </Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={goal.progress}
                                            sx={{ height: 8, borderRadius: 4 }}
                                        />
                                    </Box>

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Start: {new Date(goal.startDate).toLocaleDateString()}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Target: {new Date(goal.targetDate).toLocaleDateString()}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))
                )}
            </Grid>

            {/* Goal Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedGoal ? 'Edit Goal' : 'Create New Goal'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="Title"
                            fullWidth
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                        <TextField
                            label="Description"
                            fullWidth
                            multiline
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Type</InputLabel>
                            <Select
                                value={formData.type}
                                label="Type"
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <MenuItem value="ANNUAL">Annual</MenuItem>
                                <MenuItem value="QUARTERLY">Quarterly</MenuItem>
                                <MenuItem value="MONTHLY">Monthly</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={formData.status}
                                label="Status"
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <MenuItem value="ACTIVE">Active</MenuItem>
                                <MenuItem value="ON_TRACK">On Track</MenuItem>
                                <MenuItem value="AT_RISK">At Risk</MenuItem>
                                <MenuItem value="OFF_TRACK">Off Track</MenuItem>
                                <MenuItem value="COMPLETED">Completed</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="Progress (%)"
                            type="number"
                            fullWidth
                            value={formData.progress}
                            onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                            inputProps={{ min: 0, max: 100 }}
                        />
                        <TextField
                            label="Start Date"
                            type="date"
                            fullWidth
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label="Target Date"
                            type="date"
                            fullWidth
                            value={formData.targetDate}
                            onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSaveGoal} variant="contained">
                        {selectedGoal ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default GoalsPage;
