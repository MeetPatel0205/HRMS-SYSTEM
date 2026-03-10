import React, { useEffect, useState, useCallback } from 'react';
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
    TextField,
    InputAdornment,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Alert,
    Snackbar,
    OutlinedInput,
    Checkbox,
    ListItemText,
    Tooltip,
    Collapse,
    Grid,
    Divider,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Security as SecurityIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Person as PersonIcon,
    Badge as BadgeIcon,
} from '@mui/icons-material';
import { employeeService } from '../../services/employeeService';
import { roleService } from '../../services/api/roles';
import { AuthService } from '../../services/authService';
import { Role } from '../../types/role';
import { SYSTEM_PERMISSIONS, getPermissionName } from '../../data/permissions';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    roles: string[];
    status: string;
    createdAt: string;
    userId?: string; // the actual user account id for role assignment
}

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false, message: '', severity: 'success',
    });
    const [formData, setFormData] = useState({
        email: '',
        firstName: '',
        lastName: '',
        selectedRoles: [] as string[],
        password: '',
    });

    const loadRoles = useCallback(async () => {
        try {
            let data = await roleService.getRoles();
            // Auto-initialize default roles if none exist in the database
            if (!data || data.length === 0) {
                try {
                    await roleService.initializeRoles();
                    data = await roleService.getRoles();
                } catch (initErr) {
                    console.warn('Could not auto-initialize roles:', initErr);
                }
            }
            setAvailableRoles(data || []);
        } catch (err: any) {
            console.error('Failed to load roles:', err);
        }
    }, []);

    const loadUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await employeeService.getEmployees();
            // The API returns nested structure: { success, data: { data: [...employees], total, page, ... } }
            const employeeList = response?.data?.data || response?.data || [];
            const employees = Array.isArray(employeeList) ? employeeList : [];
            setUsers(employees.map((emp: any) => ({
                id: emp.id,
                email: emp.contactInfo?.email || emp.user?.email || emp.email || '',
                firstName: emp.personalInfo?.firstName || emp.user?.firstName || emp.firstName || '',
                lastName: emp.personalInfo?.lastName || emp.user?.lastName || emp.lastName || '',
                role: emp.user?.roles?.[0]?.toLowerCase() || 'employee',
                roles: emp.user?.roles?.length ? emp.user.roles.map((r: string) => r.toLowerCase()) : ['employee'],
                status: emp.employmentInfo?.status || emp.status || 'ACTIVE',
                createdAt: emp.auditInfo?.createdAt || emp.createdAt || new Date().toISOString(),
                userId: emp.userId || emp.user?.id, // The actual User account ID for role assignment
            })));
        } catch (err: any) {
            console.error('Failed to load users:', err);
            setError(err.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRoles();
        loadUsers();
    }, [loadRoles, loadUsers]);

    const handleOpenDialog = (user?: User) => {
        if (user) {
            setSelectedUser(user);
            setFormData({
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                selectedRoles: user.roles || [user.role],
                password: '',
            });
        } else {
            setSelectedUser(null);
            setFormData({
                email: '',
                firstName: '',
                lastName: '',
                selectedRoles: ['employee'],
                password: '',
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedUser(null);
    };

    const handleSaveUser = async () => {
        // Guard: if no roles loaded from backend, role changes can't work
        if (availableRoles.length === 0 && selectedUser) {
            setSnackbar({
                open: true,
                message: 'Cannot update roles: role data could not be loaded from the server. Please refresh and try again, or check that the admin account has the proper permissions.',
                severity: 'error',
            });
            return;
        }

        setSubmitting(true);
        try {
            if (selectedUser) {
                // Update user roles — assign new ones
                let userId = selectedUser.userId;

                if (!userId) {
                    if (!formData.password) {
                        setSnackbar({ open: true, message: 'To assign roles, this employee must have a login account. Please enter a password below to create one.', severity: 'error' });
                        setSubmitting(false);
                        return;
                    }

                    try {
                        const newAuthData = await AuthService.createEmployeeUser({
                            employeeId: selectedUser.id,
                            password: formData.password
                        });
                        userId = newAuthData.user.id;
                    } catch (err: any) {
                        setSnackbar({ open: true, message: `Failed to create login account: ${err.response?.data?.error?.message || err.message}`, severity: 'error' });
                        setSubmitting(false);
                        return;
                    }
                }

                // TypeScript safety guard: at this point, userId must be a string
                if (!userId) {
                    setSnackbar({ open: true, message: 'Unexpected error: User ID is still missing.', severity: 'error' });
                    setSubmitting(false);
                    return;
                }

                const currentRoles = (selectedUser.roles || []).map(r => r.toLowerCase());
                const newRoles = formData.selectedRoles.map(r => r.toLowerCase());

                // Find roles to add
                const rolesToAdd = newRoles.filter(r => !currentRoles.includes(r));
                // Find roles to remove
                const rolesToRemove = currentRoles.filter(r => !newRoles.includes(r));

                let successCount = 0;
                let skipCount = 0;

                // Assign new roles
                for (const roleName of rolesToAdd) {
                    // Match case-insensitively
                    const roleObj = availableRoles.find(r =>
                        r.name === roleName || r.name.toLowerCase() === roleName.toLowerCase()
                    );
                    if (roleObj) {
                        try {
                            await roleService.assignRole(userId, roleObj.id);
                            successCount++;
                        } catch (err: any) {
                            console.warn(`Could not assign role ${roleName}:`, err);
                            // If 404, the role or user might not exist in the roles table
                            if (err.response?.status === 404) {
                                skipCount++;
                            } else {
                                throw err;
                            }
                        }
                    } else {
                        console.warn(`Role "${roleName}" not found in available roles, skipping.`);
                        skipCount++;
                    }
                }

                // Remove old roles
                for (const roleName of rolesToRemove) {
                    const roleObj = availableRoles.find(r =>
                        r.name === roleName || r.name.toLowerCase() === roleName.toLowerCase()
                    );
                    if (roleObj) {
                        try {
                            const apiClient = (await import('../../services/apiClient')).default;
                            await apiClient.delete(`/roles/users/${userId}/roles/${roleObj.id}`);
                            successCount++;
                        } catch (err: any) {
                            console.warn(`Could not remove role ${roleName}:`, err);
                        }
                    }
                }

                const message = skipCount > 0
                    ? `Roles updated (${successCount} changes applied, ${skipCount} skipped — role may not exist in the roles table yet).`
                    : `Roles updated successfully for ${selectedUser.firstName} ${selectedUser.lastName}.`;

                setSnackbar({ open: true, message, severity: 'success' });
            } else {
                // Create new user via auth/register endpoint
                const apiClient = (await import('../../services/apiClient')).default;
                const registerRes = await apiClient.post('/auth/register', {
                    email: formData.email,
                    password: formData.password,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                });

                const newUserId = registerRes.data?.data?.user?.id;

                // Assign selected roles (if not just default EMPLOYEE)
                if (newUserId && formData.selectedRoles.length > 0) {
                    for (const roleName of formData.selectedRoles) {
                        const roleObj = availableRoles.find(r =>
                            r.name === roleName || r.name.toLowerCase() === roleName.toLowerCase()
                        );
                        if (roleObj) {
                            try {
                                await roleService.assignRole(newUserId, roleObj.id);
                            } catch (err) {
                                console.warn(`Could not assign role ${roleName} to new user:`, err);
                            }
                        }
                    }
                }

                setSnackbar({ open: true, message: `User ${formData.firstName} ${formData.lastName} created successfully.`, severity: 'success' });
            }
            handleCloseDialog();
            loadUsers();
        } catch (err: any) {
            console.error('Failed to save user:', err);
            setSnackbar({ open: true, message: `Failed to save user. ${err.response?.data?.message || err.message}`, severity: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                console.log('Deleting user:', userId);
                await employeeService.delete(userId);
                setSnackbar({ open: true, message: 'User deleted.', severity: 'success' });
                loadUsers();
            } catch (err: any) {
                setError(err.response?.data?.message || err.message || 'Failed to delete user');
            }
        }
    };

    const toggleExpandUser = (userId: string) => {
        setExpandedUser(expandedUser === userId ? null : userId);
    };

    // Get permissions granted by a set of role names
    const getPermissionsForRoles = (roleNames: string[]): string[] => {
        const allPermissions = new Set<string>();
        for (const roleName of roleNames) {
            const role = availableRoles.find(r => r.name === roleName);
            if (role?.permissions) {
                role.permissions.forEach(p => allPermissions.add(p));
            }
        }
        return Array.from(allPermissions);
    };

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Build the dynamic list of roles: combine hardcoded system roles + custom roles from backend
    const allRoleNames = React.useMemo(() => {
        const systemRoles = ['admin', 'hr_manager', 'manager', 'employee'];
        const customRoleNames = availableRoles.map(r => r.name);
        const combined = new Set([...systemRoles, ...customRoleNames]);
        return Array.from(combined);
    }, [availableRoles]);

    // Preview permissions for the currently selected roles in the dialog
    const selectedPermissions = getPermissionsForRoles(formData.selectedRoles);

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
                <Box>
                    <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon color="primary" fontSize="large" />
                        User Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage users, assign roles, and control access permissions
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { loadUsers(); loadRoles(); }}>
                        Refresh
                    </Button>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                        Add User
                    </Button>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Paper sx={{ p: 2, mb: 2 }}>
                <TextField
                    fullWidth
                    placeholder="Search by name, email, or role..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                />
            </Paper>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Roles</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Created</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">No users found</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <React.Fragment key={user.id}>
                                    <TableRow hover>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <BadgeIcon fontSize="small" color="action" />
                                                <Typography fontWeight="medium">
                                                    {`${user.firstName} ${user.lastName}`}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                {(user.roles || [user.role]).map((r) => (
                                                    <Chip
                                                        key={r}
                                                        label={r}
                                                        size="small"
                                                        color={
                                                            r === 'admin' ? 'error' :
                                                                r === 'hr_manager' ? 'warning' :
                                                                    r === 'manager' ? 'info' :
                                                                        'default'
                                                        }
                                                        variant="outlined"
                                                    />
                                                ))}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={user.status}
                                                size="small"
                                                color={user.status === 'ACTIVE' ? 'success' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="View permissions">
                                                <IconButton size="small" onClick={() => toggleExpandUser(user.id)}>
                                                    {expandedUser === user.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Edit user / roles">
                                                <IconButton size="small" onClick={() => handleOpenDialog(user)} color="primary">
                                                    <EditIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete user">
                                                <IconButton size="small" onClick={() => handleDeleteUser(user.id)} color="error">
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                    {/* Expanded row showing permissions */}
                                    <TableRow>
                                        <TableCell colSpan={6} sx={{ py: 0, borderBottom: expandedUser === user.id ? undefined : 'none' }}>
                                            <Collapse in={expandedUser === user.id} timeout="auto" unmountOnExit>
                                                <Box sx={{ py: 2, px: 1 }}>
                                                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <SecurityIcon fontSize="small" color="primary" />
                                                        Effective Permissions (from assigned roles)
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                                                        {getPermissionsForRoles(user.roles || [user.role]).length > 0 ? (
                                                            getPermissionsForRoles(user.roles || [user.role]).map((perm) => (
                                                                <Chip
                                                                    key={perm}
                                                                    label={getPermissionName(perm)}
                                                                    size="small"
                                                                    variant="outlined"
                                                                    color="primary"
                                                                    sx={{ fontSize: '0.75rem' }}
                                                                />
                                                            ))
                                                        ) : (
                                                            <Typography variant="body2" color="text.secondary">
                                                                No granular permissions assigned via custom roles. System role permissions are managed internally.
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Box>
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>
                                </React.Fragment>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Edit/Create User Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {selectedUser ? `Edit Roles — ${selectedUser.firstName} ${selectedUser.lastName}` : 'Add New User'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        {!selectedUser && (
                            <>
                                <TextField
                                    label="Email"
                                    type="email"
                                    fullWidth
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <TextField
                                            label="First Name"
                                            fullWidth
                                            value={formData.firstName}
                                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            label="Last Name"
                                            fullWidth
                                            value={formData.lastName}
                                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        />
                                    </Grid>
                                </Grid>
                            </>
                        )}

                        {(!selectedUser || (selectedUser && !selectedUser.userId)) && (
                            <>
                                {selectedUser && !selectedUser.userId && (
                                    <Alert severity="info" sx={{ mb: 1 }}>
                                        This employee does not have a login account yet. Please provide a temporary password below to generate an account so they can be assigned roles.
                                    </Alert>
                                )}
                                <TextField
                                    label={selectedUser && !selectedUser.userId ? "Temporary Password" : "Password"}
                                    type="password"
                                    fullWidth
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    helperText={selectedUser && !selectedUser.userId ? "Required to generate login credentials." : ""}
                                />
                            </>
                        )}

                        <FormControl fullWidth>
                            <InputLabel>Assign Roles</InputLabel>
                            <Select
                                multiple
                                value={formData.selectedRoles}
                                onChange={(e) => setFormData({ ...formData, selectedRoles: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value })}
                                input={<OutlinedInput label="Assign Roles" />}
                                renderValue={(selected) => (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {selected.map((value) => (
                                            <Chip key={value} label={value} size="small" />
                                        ))}
                                    </Box>
                                )}
                            >
                                {allRoleNames.map((roleName) => {
                                    const roleObj = availableRoles.find(r => r.name === roleName);
                                    return (
                                        <MenuItem key={roleName} value={roleName}>
                                            <Checkbox checked={formData.selectedRoles.includes(roleName)} />
                                            <ListItemText
                                                primary={roleName}
                                                secondary={roleObj?.description || (
                                                    roleName === 'admin' ? 'Full system access' :
                                                        roleName === 'hr_manager' ? 'HR management access' :
                                                            roleName === 'manager' ? 'Team management access' :
                                                                roleName === 'employee' ? 'Standard employee access' :
                                                                    ''
                                                )}
                                            />
                                            {roleObj && (
                                                <Chip
                                                    label={`${roleObj.permissions?.length || 0} perms`}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ ml: 1 }}
                                                />
                                            )}
                                        </MenuItem>
                                    );
                                })}
                            </Select>
                        </FormControl>

                        {/* Permission Preview */}
                        {selectedPermissions.length > 0 && (
                            <>
                                <Divider sx={{ mt: 1 }}>
                                    <Chip label="Permission Preview" icon={<SecurityIcon />} size="small" />
                                </Divider>
                                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        The selected roles will grant these permissions:
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                                        {selectedPermissions.map((perm) => (
                                            <Chip
                                                key={perm}
                                                label={getPermissionName(perm)}
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                            />
                                        ))}
                                    </Box>
                                </Paper>
                            </>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleCloseDialog} disabled={submitting}>Cancel</Button>
                    <Button onClick={handleSaveUser} variant="contained" disabled={submitting}>
                        {submitting ? 'Saving...' : (selectedUser ? 'Update Roles' : 'Create User')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default UserManagement;
