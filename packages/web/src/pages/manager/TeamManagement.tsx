import React, { useEffect, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Grid,
    Card,
    CardContent,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Person as PersonIcon,
    Email as EmailIcon,
    Phone as PhoneIcon
} from '@mui/icons-material';
import { teamsAPI } from '../../services/api';

interface TeamMember {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: string;
    status: string;
    avatar?: string;
}

interface Team {
    id: string;
    name: string;
    description: string;
    members: TeamMember[];
}

const TeamManagement: React.FC = () => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });

    useEffect(() => {
        loadTeams();
    }, []);

    const loadTeams = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await teamsAPI.getTeams();
            if (response.data) {
                setTeams(response.data.map((team: any) => ({
                    id: team.id,
                    name: team.name,
                    description: team.description || '',
                    members: (team.members || []).map((m: any) => ({
                        id: m.id,
                        firstName: m.employee?.firstName || '',
                        lastName: m.employee?.lastName || '',
                        email: m.employee?.user?.email || '',
                        phone: m.employee?.phoneNumber,
                        role: m.role,
                        status: m.employee?.status || 'ACTIVE',
                        avatar: m.employee?.profilePicture
                    }))
                })));
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load teams');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (team?: Team) => {
        if (team) {
            setSelectedTeam(team);
            setFormData({
                name: team.name,
                description: team.description
            });
        } else {
            setSelectedTeam(null);
            setFormData({
                name: '',
                description: ''
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedTeam(null);
    };

    const handleSaveTeam = async () => {
        try {
            if (selectedTeam) {
                await teamsAPI.updateTeam(selectedTeam.id, formData);
            } else {
                await teamsAPI.createTeam(formData);
            }
            handleCloseDialog();
            loadTeams();
        } catch (err: any) {
            setError(err.message || 'Failed to save team');
        }
    };

    const handleDeleteTeam = async (teamId: string) => {
        if (window.confirm('Are you sure you want to delete this team?')) {
            try {
                await teamsAPI.deleteTeam(teamId);
                loadTeams();
            } catch (err: any) {
                setError(err.message || 'Failed to delete team');
            }
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
                <Typography variant="h4">Team Management</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Create Team
                </Button>
            </Box>

            {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                {teams.length === 0 ? (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 3, textAlign: 'center' }}>
                            <Typography variant="body1" color="text.secondary">
                                No teams found. Create your first team to get started.
                            </Typography>
                        </Paper>
                    </Grid>
                ) : (
                    teams.map((team) => (
                        <Grid item xs={12} md={6} key={team.id}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                                        <Box>
                                            <Typography variant="h6">{team.name}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {team.description}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <IconButton size="small" onClick={() => handleOpenDialog(team)}>
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => handleDeleteTeam(team.id)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                        <PersonIcon fontSize="small" color="action" />
                                        <Typography variant="body2">
                                            {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                                        </Typography>
                                    </Box>

                                    <List dense>
                                        {team.members.slice(0, 5).map((member) => (
                                            <ListItem key={member.id}>
                                                <ListItemAvatar>
                                                    <Avatar src={member.avatar}>
                                                        {member.firstName[0]}{member.lastName[0]}
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={`${member.firstName} ${member.lastName}`}
                                                    secondary={
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Chip label={member.role} size="small" />
                                                            <Chip
                                                                label={member.status}
                                                                size="small"
                                                                color={member.status === 'ACTIVE' ? 'success' : 'default'}
                                                            />
                                                        </Box>
                                                    }
                                                />
                                            </ListItem>
                                        ))}
                                        {team.members.length > 5 && (
                                            <ListItem>
                                                <ListItemText
                                                    primary={`+${team.members.length - 5} more members`}
                                                    sx={{ textAlign: 'center', color: 'text.secondary' }}
                                                />
                                            </ListItem>
                                        )}
                                    </List>

                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        sx={{ mt: 2 }}
                                    >
                                        Manage Members
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))
                )}
            </Grid>

            {/* Team Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedTeam ? 'Edit Team' : 'Create New Team'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="Team Name"
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
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSaveTeam} variant="contained">
                        {selectedTeam ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TeamManagement;
