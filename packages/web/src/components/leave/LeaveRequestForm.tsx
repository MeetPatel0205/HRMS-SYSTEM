import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    CircularProgress,
    Alert
} from '@mui/material';
import { LeaveType, CreateLeaveRequest } from '../../types/leave';
import { leaveService } from '../../services/api/leave';

interface LeaveRequestFormProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const LeaveRequestForm: React.FC<LeaveRequestFormProps> = ({ open, onClose, onSuccess }) => {
    const [types, setTypes] = useState<LeaveType[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<CreateLeaveRequest>({
        leaveTypeId: '',
        startDate: new Date(),
        endDate: new Date(),
        reason: ''
    });

    useEffect(() => {
        if (open) {
            fetchTypes();
            // Reset form
            setFormData({
                leaveTypeId: '',
                startDate: new Date(),
                endDate: new Date(),
                reason: ''
            });
            setError(null);
        }
    }, [open]);

    const fetchTypes = async () => {
        try {
            setLoading(true);
            const data = await leaveService.getLeaveTypes();
            setTypes(data);
        } catch (err) {
            setError('Failed to load leave types');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.leaveTypeId || !formData.startDate || !formData.endDate) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            await leaveService.submitRequest(formData);
            onSuccess();
            onClose();
        } catch (err: any) {
            // Handle actual error message from backend
            const msg = err.response?.data?.message || 'Failed to submit request';
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>New Leave Request</DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {loading ? (
                    <CircularProgress />
                ) : (
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Leave Type</InputLabel>
                                <Select
                                    value={formData.leaveTypeId}
                                    label="Leave Type"
                                    onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                                >
                                    {types.map((type) => (
                                        <MenuItem key={type.id} value={type.id}>
                                            {type.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="Start Date"
                                type="date"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={formData.startDate instanceof Date ? formData.startDate.toISOString().split('T')[0] : formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="End Date"
                                type="date"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={formData.endDate instanceof Date ? formData.endDate.toISOString().split('T')[0] : formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: new Date(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Reason"
                                multiline
                                rows={3}
                                fullWidth
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={submitting}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
