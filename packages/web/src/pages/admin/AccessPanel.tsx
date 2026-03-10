import React, { useEffect, useState, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Switch,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    CircularProgress,
    Alert,
    Snackbar,
    Tooltip,
    Divider,
    Card,
    CardContent,
    Grid,
} from '@mui/material';
import {
    Save as SaveIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    Refresh as RefreshIcon,
    Settings as SettingsIcon,
    Security as SecurityIcon,
    EventNote as EventNoteIcon,
    AccessTime as AccessTimeIcon,
    Payments as PaymentsIcon,
    Notifications as NotificationsIcon,
    Edit as EditIcon,
    Tune as TuneIcon,
} from '@mui/icons-material';
import { settingsService, SystemSetting, CreateSettingRequest } from '../../services/api/settingsService';

const CATEGORIES = [
    { key: 'general', label: 'General', icon: <SettingsIcon /> },
    { key: 'authentication', label: 'Authentication', icon: <SecurityIcon /> },
    { key: 'leave', label: 'Leave', icon: <EventNoteIcon /> },
    { key: 'attendance', label: 'Attendance', icon: <AccessTimeIcon /> },
    { key: 'payroll', label: 'Payroll', icon: <PaymentsIcon /> },
    { key: 'notification', label: 'Notifications', icon: <NotificationsIcon /> },
];

// Determine the input type from the value
const getValueType = (value: any): 'boolean' | 'number' | 'string' => {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    return 'string';
};

const AccessPanel: React.FC = () => {
    const [settings, setSettings] = useState<SystemSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null); // key of setting being saved
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const [editedValues, setEditedValues] = useState<Record<string, any>>({});
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    // Add Setting Dialog state
    const [openAddDialog, setOpenAddDialog] = useState(false);
    const [newSetting, setNewSetting] = useState<CreateSettingRequest>({
        key: '',
        value: '',
        category: 'general',
        description: '',
        isPublic: false,
    });

    const fetchSettings = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await settingsService.getAllSettings();
            setSettings(Array.isArray(data) ? data : []);
            setEditedValues({});
        } catch (err: any) {
            console.error('Failed to fetch settings:', err);
            setError('Failed to load system settings. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const currentCategory = CATEGORIES[activeTab]?.key || 'general';
    const filteredSettings = settings.filter((s) => s.category === currentCategory);

    const handleValueChange = (key: string, value: any) => {
        setEditedValues((prev) => ({ ...prev, [key]: value }));
    };

    const handleSaveSetting = async (setting: SystemSetting) => {
        const newValue = editedValues[setting.key] !== undefined ? editedValues[setting.key] : setting.value;
        setSaving(setting.key);
        try {
            await settingsService.updateSetting(setting.key, newValue);
            setSettings((prev) =>
                prev.map((s) => (s.key === setting.key ? { ...s, value: newValue } : s))
            );
            setEditedValues((prev) => {
                const copy = { ...prev };
                delete copy[setting.key];
                return copy;
            });
            setSnackbar({ open: true, message: `Setting "${setting.key}" updated successfully.`, severity: 'success' });
        } catch (err: any) {
            console.error('Failed to update setting:', err);
            setSnackbar({ open: true, message: `Failed to update "${setting.key}".`, severity: 'error' });
        } finally {
            setSaving(null);
        }
    };

    const handleDeleteSetting = async (key: string) => {
        if (!window.confirm(`Are you sure you want to delete the setting "${key}"? This cannot be undone.`)) return;
        try {
            await settingsService.deleteSetting(key);
            setSettings((prev) => prev.filter((s) => s.key !== key));
            setSnackbar({ open: true, message: `Setting "${key}" deleted.`, severity: 'success' });
        } catch (err: any) {
            console.error('Failed to delete setting:', err);
            setSnackbar({ open: true, message: `Failed to delete "${key}".`, severity: 'error' });
        }
    };

    const handleAddSetting = async () => {
        if (!newSetting.key.trim()) {
            setSnackbar({ open: true, message: 'Setting key is required.', severity: 'error' });
            return;
        }

        try {
            const created = await settingsService.createSetting(newSetting);
            setSettings((prev) => [...prev, created]);
            setOpenAddDialog(false);
            setNewSetting({ key: '', value: '', category: 'general', description: '', isPublic: false });
            setSnackbar({ open: true, message: `Setting "${newSetting.key}" created.`, severity: 'success' });
        } catch (err: any) {
            console.error('Failed to create setting:', err);
            setSnackbar({ open: true, message: `Failed to create setting. ${err.response?.data?.message || err.message}`, severity: 'error' });
        }
    };

    const renderValueEditor = (setting: SystemSetting) => {
        const currentValue = editedValues[setting.key] !== undefined ? editedValues[setting.key] : setting.value;
        const valueType = getValueType(setting.value);

        if (valueType === 'boolean') {
            return (
                <Switch
                    checked={!!currentValue}
                    onChange={(e) => handleValueChange(setting.key, e.target.checked)}
                    color="primary"
                />
            );
        }

        if (valueType === 'number') {
            return (
                <TextField
                    type="number"
                    value={currentValue}
                    onChange={(e) => handleValueChange(setting.key, parseFloat(e.target.value) || 0)}
                    size="small"
                    sx={{ width: 150 }}
                />
            );
        }

        return (
            <TextField
                value={currentValue}
                onChange={(e) => handleValueChange(setting.key, e.target.value)}
                size="small"
                sx={{ minWidth: 200 }}
            />
        );
    };

    const getCategoryStats = () => {
        return CATEGORIES.map((cat) => ({
            ...cat,
            count: settings.filter((s) => s.category === cat.key).length,
        }));
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <CircularProgress size={48} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TuneIcon color="primary" fontSize="large" />
                        Access Panel — System Settings
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Configure system parameters, policies, and default values for your HRMS.
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchSettings}>
                        Refresh
                    </Button>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenAddDialog(true)}>
                        Add Parameter
                    </Button>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Category Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {getCategoryStats().map((cat, idx) => (
                    <Grid item xs={6} sm={4} md={2} key={cat.key}>
                        <Card
                            sx={{
                                cursor: 'pointer',
                                border: activeTab === idx ? 2 : 1,
                                borderColor: activeTab === idx ? 'primary.main' : 'divider',
                                transition: 'all 0.2s',
                                '&:hover': { borderColor: 'primary.light', transform: 'translateY(-2px)' },
                            }}
                            onClick={() => setActiveTab(idx)}
                        >
                            <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Box sx={{ color: activeTab === idx ? 'primary.main' : 'text.secondary', mb: 0.5 }}>
                                    {cat.icon}
                                </Box>
                                <Typography variant="body2" fontWeight="bold">
                                    {cat.label}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {cat.count} settings
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Settings Table */}
            <Paper sx={{ overflow: 'hidden' }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto">
                        {CATEGORIES.map((cat) => (
                            <Tab key={cat.key} label={cat.label} icon={cat.icon} iconPosition="start" />
                        ))}
                    </Tabs>
                </Box>

                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Parameter Key</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Value</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Visibility</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredSettings.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">
                                            No settings found in the &quot;{CATEGORIES[activeTab]?.label}&quot; category.
                                        </Typography>
                                        <Button
                                            size="small"
                                            startIcon={<AddIcon />}
                                            onClick={() => {
                                                setNewSetting((prev) => ({ ...prev, category: currentCategory }));
                                                setOpenAddDialog(true);
                                            }}
                                            sx={{ mt: 1 }}
                                        >
                                            Add one
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredSettings.map((setting) => {
                                    const isEdited = editedValues[setting.key] !== undefined;
                                    return (
                                        <TableRow
                                            key={setting.key}
                                            sx={{ bgcolor: isEdited ? 'action.hover' : 'inherit' }}
                                        >
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                                                    {setting.key}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="text.secondary">
                                                    {setting.description || '—'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{renderValueEditor(setting)}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={setting.isPublic ? 'Public' : 'Private'}
                                                    size="small"
                                                    color={setting.isPublic ? 'success' : 'default'}
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Tooltip title="Save changes">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            disabled={!isEdited || saving === setting.key}
                                                            onClick={() => handleSaveSetting(setting)}
                                                        >
                                                            {saving === setting.key ? <CircularProgress size={18} /> : <SaveIcon />}
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title="Delete setting">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDeleteSetting(setting.key)}
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Add Setting Dialog */}
            <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add New Parameter</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="Key"
                            placeholder="e.g. leave.maxCasualLeave"
                            fullWidth
                            required
                            value={newSetting.key}
                            onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
                            helperText="Use dot notation, e.g. category.settingName"
                        />
                        <TextField
                            label="Value"
                            fullWidth
                            value={newSetting.value}
                            onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Category</InputLabel>
                            <Select
                                value={newSetting.category}
                                label="Category"
                                onChange={(e) => setNewSetting({ ...newSetting, category: e.target.value })}
                            >
                                {CATEGORIES.map((cat) => (
                                    <MenuItem key={cat.key} value={cat.key}>
                                        {cat.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Description (optional)"
                            fullWidth
                            multiline
                            rows={2}
                            value={newSetting.description}
                            onChange={(e) => setNewSetting({ ...newSetting, description: e.target.value })}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Switch
                                checked={newSetting.isPublic || false}
                                onChange={(e) => setNewSetting({ ...newSetting, isPublic: e.target.checked })}
                            />
                            <Typography variant="body2">
                                Public (visible to non-admin users)
                            </Typography>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddSetting} startIcon={<AddIcon />}>
                        Create Parameter
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default AccessPanel;
