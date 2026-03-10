import React, { useEffect, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormGroup,
    FormControlLabel,
    Checkbox,
    CircularProgress,
    Alert,
    Grid,
    Divider
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Security as SecurityIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import { roleService } from '../../services/api/roles';
import { Role, PermissionCategory } from '../../types/role';
import { SYSTEM_PERMISSIONS } from '../../data/permissions';

const RoleManagement: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        permissions: [] as string[]
    });

    const fetchRoles = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await roleService.getRoles();
            setRoles(data);
        } catch (err: any) {
            console.error('Failed to fetch roles:', err);
            setError('Failed to load roles. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleOpenDialog = (role?: Role) => {
        if (role) {
            setSelectedRole(role);
            setFormData({
                name: role.name,
                description: role.description || '',
                permissions: role.permissions || []
            });
        } else {
            setSelectedRole(null);
            setFormData({
                name: '',
                description: '',
                permissions: []
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedRole(null);
        setFormData({ name: '', description: '', permissions: [] });
    };

    const handleSaveRole = async () => {
        if (!formData.name.trim()) {
            alert('Role name is required');
            return;
        }

        setSubmitting(true);
        try {
            if (selectedRole) {
                await roleService.updateRole(selectedRole.id, formData);
            } else {
                await roleService.createRole(formData);
            }
            fetchRoles();
            handleCloseDialog();
        } catch (err: any) {
            console.error('Failed to save role:', err);

            let errorMsg = 'Failed to save role.';
            if (err.response?.data?.error) {
                errorMsg = err.response.data.error.message;
                if (err.response.data.error.details?.length > 0) {
                    const detailMsgs = err.response.data.error.details.map((d: any) => `${d.field}: ${d.message}`).join(', ');
                    errorMsg += ` Details: ${detailMsgs}`;
                }
            } else if (err.response?.data?.message) {
                errorMsg = err.response.data.message;
            } else {
                errorMsg = err.message;
            }

            alert(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteRole = async (roleId: string) => {
        if (window.confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
            try {
                await roleService.deleteRole(roleId);
                fetchRoles();
            } catch (err: any) {
                console.error('Failed to delete role:', err);

                let errorMsg = 'Failed to delete role.';
                if (err.response?.data?.error) {
                    errorMsg = err.response.data.error.message;
                } else if (err.response?.data?.message) {
                    errorMsg = err.response.data.message;
                } else {
                    errorMsg = err.message;
                }

                alert(errorMsg);
            }
        }
    };

    const handlePermissionToggle = (permissionId: string) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(permissionId)
                ? prev.permissions.filter(p => p !== permissionId)
                : [...prev.permissions, permissionId]
        }));
    };

    // Group permissions by category
    const groupedPermissions = SYSTEM_PERMISSIONS.reduce((acc, perm) => {
        const category = perm.category || 'other';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(perm);
        return acc;
    }, {} as Record<string, typeof SYSTEM_PERMISSIONS>);

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" gutterBottom>Role Management</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage roles and granular permissions for your organization
                    </Typography>
                </Box>
                <Box>
                    <IconButton onClick={fetchRoles} sx={{ mr: 1 }} title="Refresh">
                        <RefreshIcon />
                    </IconButton>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                    >
                        Create Role
                    </Button>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Role Name</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell>Permissions</TableCell>
                                <TableCell>Users</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {roles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        No roles found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                roles.map((role) => (
                                    <TableRow key={role.id}>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <SecurityIcon color="primary" fontSize="small" />
                                                <Typography fontWeight="bold">{role.name}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>{role.description}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`${role.permissions?.length || 0} permissions`}
                                                size="small"
                                                color="default"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`${role.userCount || 0} users`}
                                                size="small"
                                                color="info"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" onClick={() => handleOpenDialog(role)} color="primary">
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => handleDeleteRole(role.id)} color="error">
                                                <DeleteIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Role Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
                <DialogTitle>
                    {selectedRole ? 'Edit Role' : 'Create New Role'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="Role Name"
                            fullWidth
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                        <TextField
                            label="Description"
                            fullWidth
                            multiline
                            rows={2}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />

                        <Divider sx={{ my: 2 }}>
                            <Chip label="Permissions" />
                        </Divider>

                        <Grid container spacing={3}>
                            {Object.entries(groupedPermissions).map(([category, perms]) => (
                                <Grid item xs={12} md={6} lg={4} key={category}>
                                    <Box sx={{ border: '1px solid #eee', borderRadius: 1, p: 2, height: '100%' }}>
                                        <Typography variant="subtitle1" sx={{ textTransform: 'capitalize', fontWeight: 'bold', mb: 1 }}>
                                            {category}
                                        </Typography>
                                        <FormGroup>
                                            {perms.map((permission) => (
                                                <FormControlLabel
                                                    key={permission.id}
                                                    control={
                                                        <Checkbox
                                                            checked={formData.permissions.includes(permission.id)}
                                                            onChange={() => handlePermissionToggle(permission.id)}
                                                            size="small"
                                                        />
                                                    }
                                                    label={
                                                        <Box>
                                                            <Typography variant="body2">{permission.name}</Typography>
                                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>
                                                                {permission.description}
                                                            </Typography>
                                                        </Box>
                                                    }
                                                    sx={{ alignItems: 'flex-start', mb: 1 }}
                                                />
                                            ))}
                                        </FormGroup>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={handleCloseDialog} disabled={submitting}>Cancel</Button>
                    <Button
                        onClick={handleSaveRole}
                        variant="contained"
                        disabled={submitting}
                    >
                        {submitting ? 'Saving...' : (selectedRole ? 'Update Role' : 'Create Role')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default RoleManagement;

