import React, { useState } from 'react';
import {
    TextField,
    Button,
    Grid,
    Paper,
    Typography,
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import { JobPosting } from '../../types/recruitment';
import { recruitmentService } from '../../services/api/recruitment';

interface JobPostingFormProps {
    job?: JobPosting;
    onClose: () => void;
    onSave: () => void;
}

export const JobPostingForm: React.FC<JobPostingFormProps> = ({ job, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        title: job?.title || '',
        department: job?.department || '',
        location: job?.location || '',
        description: job?.description || '',
        requirements: job?.requirements ? JSON.stringify(job.requirements, null, 2) : '', // Simple Text Area for JSON/Text
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = {
                ...formData,
                requirements: formData.requirements // For now treating as string or parse if needed
            };

            if (job) {
                await recruitmentService.updateJob(job.id, payload);
            } else {
                await recruitmentService.createJob(payload);
            }
            onSave();
        } catch (err) {
            console.error(err);
            alert('Failed to save job posting');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom>
                {job ? 'Edit Job Posting' : 'Create Job Posting'}
            </Typography>
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        label="Job Title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                </Grid>
                <Grid item xs={12} md={3}>
                    <TextField
                        fullWidth
                        label="Department"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                </Grid>
                <Grid item xs={12} md={3}>
                    <TextField
                        fullWidth
                        label="Location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Requirements"
                        helperText="Enter requirements"
                        value={formData.requirements}
                        onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    />
                </Grid>
                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        <Button onClick={onClose} disabled={loading}>Cancel</Button>
                        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
                            {loading ? 'Saving...' : 'Save'}
                        </Button>
                    </Box>
                </Grid>
            </Grid>
        </Paper>
    );
};
