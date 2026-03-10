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
    List,
    ListItem,
    ListItemText,
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
    Alert,
    Tabs,
    Tab
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Assignment as AssignmentIcon,
    CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { projectsApi } from '../../services/api';

interface Task {
    id: string;
    title: string;
    status: string;
    priority: string;
}

interface Project {
    id: string;
    name: string;
    description: string;
    status: string;
    progress: number;
    startDate: string;
    endDate: string;
    tasks: Task[];
}

const ProjectsPage: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tabValue, setTabValue] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        status: 'PLANNING',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await projectsApi.getAll();
            if (response.data) {
                setProjects(response.data.map((project: any) => ({
                    id: project.id,
                    name: project.name,
                    description: project.description || '',
                    status: project.status,
                    progress: project.progress || 0,
                    startDate: project.startDate,
                    endDate: project.endDate,
                    tasks: (project.tasks || []).map((task: any) => ({
                        id: task.id,
                        title: task.title,
                        status: task.status,
                        priority: task.priority || 'MEDIUM'
                    }))
                })));
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (project?: Project) => {
        if (project) {
            setSelectedProject(project);
            setFormData({
                name: project.name,
                description: project.description,
                status: project.status,
                startDate: project.startDate,
                endDate: project.endDate
            });
        } else {
            setSelectedProject(null);
            setFormData({
                name: '',
                description: '',
                status: 'PLANNING',
                startDate: new Date().toISOString().split('T')[0],
                endDate: ''
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedProject(null);
    };

    const handleSaveProject = async () => {
        try {
            if (selectedProject) {
                await projectsApi.update(selectedProject.id, formData);
            } else {
                await projectsApi.create(formData);
            }
            handleCloseDialog();
            loadProjects();
        } catch (err: any) {
            setError(err.message || 'Failed to save project');
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        if (window.confirm('Are you sure you want to delete this project?')) {
            try {
                await projectsApi.delete(projectId);
                loadProjects();
            } catch (err: any) {
                setError(err.message || 'Failed to delete project');
            }
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'success';
            case 'IN_PROGRESS': return 'info';
            case 'ON_HOLD': return 'warning';
            case 'CANCELLED': return 'error';
            default: return 'default';
        }
    };

    const filteredProjects = projects.filter(project => {
        if (tabValue === 0) return true; // All
        if (tabValue === 1) return project.status === 'IN_PROGRESS';
        if (tabValue === 2) return project.status === 'COMPLETED';
        return true;
    });

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
                <Typography variant="h4">Projects</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Create Project
                </Button>
            </Box>

            {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Paper sx={{ mb: 3 }}>
                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
                    <Tab label="All Projects" />
                    <Tab label="In Progress" />
                    <Tab label="Completed" />
                </Tabs>
            </Paper>

            <Grid container spacing={3}>
                {filteredProjects.length === 0 ? (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 3, textAlign: 'center' }}>
                            <AssignmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                No projects found
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Create your first project to get started
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => handleOpenDialog()}
                            >
                                Create Project
                            </Button>
                        </Paper>
                    </Grid>
                ) : (
                    filteredProjects.map((project) => (
                        <Grid item xs={12} md={6} lg={4} key={project.id}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="h6" gutterBottom>
                                                {project.name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                {project.description}
                                            </Typography>
                                            <Chip
                                                label={project.status}
                                                size="small"
                                                color={getStatusColor(project.status)}
                                            />
                                        </Box>
                                        <Box>
                                            <IconButton size="small" onClick={() => handleOpenDialog(project)}>
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => handleDeleteProject(project.id)}>
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
                                                {project.progress}%
                                            </Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={project.progress}
                                            sx={{ height: 6, borderRadius: 3 }}
                                        />
                                    </Box>

                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Tasks ({project.tasks.length})
                                        </Typography>
                                        <List dense>
                                            {project.tasks.slice(0, 3).map((task) => (
                                                <ListItem key={task.id} sx={{ px: 0 }}>
                                                    <CheckCircleIcon
                                                        fontSize="small"
                                                        sx={{ mr: 1 }}
                                                        color={task.status === 'COMPLETED' ? 'success' : 'disabled'}
                                                    />
                                                    <ListItemText
                                                        primary={task.title}
                                                        primaryTypographyProps={{ variant: 'body2' }}
                                                    />
                                                </ListItem>
                                            ))}
                                            {project.tasks.length > 3 && (
                                                <Typography variant="caption" color="text.secondary">
                                                    +{project.tasks.length - 3} more tasks
                                                </Typography>
                                            )}
                                        </List>
                                    </Box>

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date(project.startDate).toLocaleDateString()}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date(project.endDate).toLocaleDateString()}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))
                )}
            </Grid>

            {/* Project Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedProject ? 'Edit Project' : 'Create New Project'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="Project Name"
                            fullWidth
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={formData.status}
                                label="Status"
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <MenuItem value="PLANNING">Planning</MenuItem>
                                <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                                <MenuItem value="ON_HOLD">On Hold</MenuItem>
                                <MenuItem value="COMPLETED">Completed</MenuItem>
                                <MenuItem value="CANCELLED">Cancelled</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="Start Date"
                            type="date"
                            fullWidth
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label="End Date"
                            type="date"
                            fullWidth
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSaveProject} variant="contained">
                        {selectedProject ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ProjectsPage;
