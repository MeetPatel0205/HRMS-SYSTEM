import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Avatar,
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
    ArrowBack as ArrowBackIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    Business as BusinessIcon,
    CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { EmployeeService } from '../../services/employeeService';

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

const EmployeeProfile: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            loadProfile(id);
        } else {
            setError('No employee ID provided');
            setLoading(false);
        }
    }, [id]);

    const loadProfile = async (employeeId: string) => {
        try {
            setLoading(true);
            setError(null);

            const response = await EmployeeService.getEmployee(employeeId);
            if (response.success && response.data) {
                const emp = response.data;
                const profileData: ProfileData = {
                    firstName: emp.personalInfo?.firstName || emp.firstName || 'Unknown',
                    lastName: emp.personalInfo?.lastName || emp.lastName || '',
                    email: emp.contactInfo?.email || emp.user?.email || 'N/A',
                    phone: emp.contactInfo?.phone || emp.phoneNumber || 'N/A',
                    position: emp.employmentInfo?.jobTitle || emp.position || 'N/A',
                    department: emp.employmentInfo?.department || emp.department?.name || emp.department || 'N/A',
                    hireDate: emp.employmentInfo?.hireDate || emp.hireDate,
                    status: emp.employmentInfo?.status || emp.status || 'UNKNOWN',
                    avatar: emp.profilePicture,
                    skills: emp.skills || [],
                    certifications: emp.certifications || []
                };
                setProfile(profileData);
            } else {
                setError('Failed to load employee details');
            }
        } catch (err: any) {
            setError(err.message || 'Error communicating with server');
        } finally {
            setLoading(false);
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
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/hr/employees')} sx={{ mb: 2 }}>
                    Back to Directory
                </Button>
                <Alert severity="error">{error || 'Profile not found'}</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate('/hr/employees')}
                    >
                        Back
                    </Button>
                    <Typography variant="h4">Employee Profile</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="contained" color="primary">
                        Edit Employee
                    </Button>
                    <Button variant="outlined" color="error">
                        Terminate
                    </Button>
                </Box>
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Avatar
                                src={profile.avatar}
                                sx={{ width: 120, height: 120 }}
                            >
                                {profile.firstName[0]}{profile.lastName?.[0]}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="h4" fontWeight="bold">
                                    {profile.firstName} {profile.lastName}
                                </Typography>
                                <Typography variant="h6" color="text.secondary" gutterBottom>
                                    {profile.position}
                                </Typography>
                                <Chip
                                    label={profile.status}
                                    color={profile.status?.toLowerCase() === 'active' ? 'success' : 'default'}
                                    sx={{ mt: 1 }}
                                />
                            </Box>
                        </Box>
                    </Paper>
                </Grid>

                {/* Contact Information */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" gutterBottom>
                            Contact Information
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <List>
                            <ListItem>
                                <EmailIcon sx={{ mr: 2 }} color="action" />
                                <ListItemText
                                    primary="Email Address"
                                    secondary={profile.email}
                                />
                            </ListItem>
                            <ListItem>
                                <PhoneIcon sx={{ mr: 2 }} color="action" />
                                <ListItemText
                                    primary="Phone Number"
                                    secondary={profile.phone}
                                />
                            </ListItem>
                        </List>
                    </Paper>
                </Grid>

                {/* Employment Information */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, height: '100%' }}>
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
                                    secondary={profile.hireDate ? new Date(profile.hireDate).toLocaleDateString() : 'N/A'}
                                />
                            </ListItem>
                        </List>
                    </Paper>
                </Grid>

                {/* Skills/Tags Placeholder */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Skills & Certifications
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {profile.skills && profile.skills.length > 0 ? (
                                profile.skills.map((skill, idx) => <Chip key={idx} label={skill} variant="outlined" />)
                            ) : (
                                <Typography color="text.secondary">No explicitly registered skills.</Typography>
                            )}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default EmployeeProfile;
