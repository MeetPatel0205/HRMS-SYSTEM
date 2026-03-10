import React, { useEffect, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Avatar,
    TextField,
    Button,
    Divider,
    Chip,
    List,
    ListItem,
    ListItemText,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    Business as BusinessIcon,
    CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { employeeService } from '../../services/employeeService';

interface ProfileData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    position: string;
    department: string;
    hireDate: string;
    status: string;
    avatar?: string;
    skills: string[];
    certifications: string[];
}

const MyProfile: React.FC = () => {
    const user = useSelector((state: RootState) => state.auth.user);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        phone: '',
        skills: '',
        certifications: ''
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            
            if (user?.employeeId) {
                const response = await employeeService.getEmployee(user.employeeId);
                if (response.success && response.data) {
                    const emp = response.data;
                    const profileData: ProfileData = {
                        firstName: emp.firstName,
                        lastName: emp.lastName,
                        email: emp.user?.email || '',
                        phone: emp.phoneNumber || '',
                        position: emp.position || 'N/A',
                        department: emp.department?.name || 'N/A',
                        hireDate: emp.hireDate,
                        status: emp.status,
                        avatar: emp.profilePicture,
                        skills: emp.skills || [],
                        certifications: emp.certifications || []
                    };
                    setProfile(profileData);
                    setFormData({
                        phone: profileData.phone,
                        skills: profileData.skills.join(', '),
                        certifications: profileData.certifications.join(', ')
                    });
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        setEditing(true);
    };

    const handleCancel = () => {
        setEditing(false);
        if (profile) {
            setFormData({
                phone: profile.phone,
                skills: profile.skills.join(', '),
                certifications: profile.certifications.join(', ')
            });
        }
    };

    const handleSave = async () => {
        try {
            // Implementation would call API to update profile
            console.log('Saving profile:', formData);
            setEditing(false);
            loadProfile();
        } catch (err: any) {
            setError(err.message || 'Failed to update profile');
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!profile) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">Profile not found</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">My Profile</Typography>
                {!editing ? (
                    <Button
                        variant="contained"
                        startIcon={<EditIcon />}
                        onClick={handleEdit}
                    >
                        Edit Profile
                    </Button>
                ) : (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="outlined"
                            startIcon={<CancelIcon />}
                            onClick={handleCancel}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleSave}
                        >
                            Save
                        </Button>
                    </Box>
                )}
            </Box>

            {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Profile Header */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Avatar
                                src={profile.avatar}
                                sx={{ width: 120, height: 120 }}
                            >
                                {profile.firstName[0]}{profile.lastName[0]}
                            </Avatar>
                            <Box>
                                <Typography variant="h5">
                                    {profile.firstName} {profile.lastName}
                                </Typography>
                                <Typography variant="body1" color="text.secondary" gutterBottom>
                                    {profile.position}
                                </Typography>
                                <Chip
                                    label={profile.status}
                                    color={profile.status === 'ACTIVE' ? 'success' : 'default'}
                                    size="small"
                                />
                            </Box>
                        </Box>
                    </Paper>
                </Grid>

                {/* Contact Information */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Contact Information
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <List>
                            <ListItem>
                                <EmailIcon sx={{ mr: 2 }} color="action" />
                                <ListItemText
                                    primary="Email"
                                    secondary={profile.email}
                                />
                            </ListItem>
                            <ListItem>
                                <PhoneIcon sx={{ mr: 2 }} color="action" />
                                <ListItemText
                                    primary="Phone"
                                    secondary={
                                        editing ? (
                                            <TextField
                                                size="small"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                sx={{ mt: 1 }}
                                            />
                                        ) : (
                                            profile.phone || 'Not provided'
                                        )
                                    }
                                />
                            </ListItem>
                        </List>
                    </Paper>
                </Grid>

                {/* Employment Information */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Employment Information
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <List>
                            <ListItem>
                                <BusinessIcon sx={{ mr: 2 }} color="action" />
                                <ListItemText
                                    primary="Department"
                                    secondary={profile.department}
                                />
                            </ListItem>
                            <ListItem>
                                <CalendarIcon sx={{ mr: 2 }} color="action" />
                                <ListItemText
                                    primary="Hire Date"
                                    secondary={new Date(profile.hireDate).toLocaleDateString()}
                                />
                            </ListItem>
                        </List>
                    </Paper>
                </Grid>

                {/* Skills */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Skills
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        {editing ? (
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                placeholder="Enter skills separated by commas"
                                value={formData.skills}
                                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                            />
                        ) : (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {profile.skills.length > 0 ? (
                                    profile.skills.map((skill, index) => (
                                        <Chip key={index} label={skill} />
                                    ))
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        No skills added
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Certifications */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Certifications
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        {editing ? (
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                placeholder="Enter certifications separated by commas"
                                value={formData.certifications}
                                onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                            />
                        ) : (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {profile.certifications.length > 0 ? (
                                    profile.certifications.map((cert, index) => (
                                        <Chip key={index} label={cert} color="primary" />
                                    ))
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        No certifications added
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default MyProfile;
