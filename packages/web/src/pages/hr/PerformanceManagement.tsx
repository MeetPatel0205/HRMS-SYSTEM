import React, { useEffect, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Grid,
    Card,
    CardContent,
    Chip,
    Rating,
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
    TrendingUp as TrendingUpIcon,
    Assessment as AssessmentIcon
} from '@mui/icons-material';

interface Review {
    id: string;
    employeeName: string;
    reviewerName: string;
    period: string;
    status: string;
    overallRating: number;
    dueDate: string;
}

const PerformanceManagement: React.FC = () => {
    const [reviews, setReviews] = useState<Review[]>([
        { id: '1', employeeName: 'John Doe', reviewerName: 'Jane Smith', period: 'Q4 2025', status: 'COMPLETED', overallRating: 4.5, dueDate: '2025-12-31' },
        { id: '2', employeeName: 'Alice Johnson', reviewerName: 'Bob Wilson', period: 'Q4 2025', status: 'IN_PROGRESS', overallRating: 0, dueDate: '2025-12-31' },
        { id: '3', employeeName: 'Mike Brown', reviewerName: 'Sarah Davis', period: 'Q4 2025', status: 'PENDING', overallRating: 0, dueDate: '2025-12-31' },
    ]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tabValue, setTabValue] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);

    const filteredReviews = reviews.filter(review => {
        if (tabValue === 0) return true;
        if (tabValue === 1) return review.status === 'PENDING';
        if (tabValue === 2) return review.status === 'IN_PROGRESS';
        if (tabValue === 3) return review.status === 'COMPLETED';
        return true;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'success';
            case 'IN_PROGRESS': return 'info';
            case 'PENDING': return 'warning';
            default: return 'default';
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4">Performance Management</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage employee performance reviews and evaluations
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenDialog(true)}
                >
                    Create Review
                </Button>
            </Box>

            {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="text.secondary">Total Reviews</Typography>
                            <Typography variant="h4">{reviews.length}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="text.secondary">Pending</Typography>
                            <Typography variant="h4">
                                {reviews.filter(r => r.status === 'PENDING').length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="text.secondary">In Progress</Typography>
                            <Typography variant="h4">
                                {reviews.filter(r => r.status === 'IN_PROGRESS').length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="text.secondary">Completed</Typography>
                            <Typography variant="h4">
                                {reviews.filter(r => r.status === 'COMPLETED').length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Paper sx={{ mb: 3 }}>
                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
                    <Tab label="All Reviews" />
                    <Tab label="Pending" />
                    <Tab label="In Progress" />
                    <Tab label="Completed" />
                </Tabs>
            </Paper>

            <Grid container spacing={2}>
                {filteredReviews.map((review) => (
                    <Grid item xs={12} md={6} key={review.id}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                                    <Box>
                                        <Typography variant="h6">{review.employeeName}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Reviewer: {review.reviewerName}
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={review.status}
                                        size="small"
                                        color={getStatusColor(review.status)}
                                    />
                                </Box>

                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Period: {review.period}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Due: {new Date(review.dueDate).toLocaleDateString()}
                                    </Typography>
                                </Box>

                                {review.status === 'COMPLETED' && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="body2">Overall Rating:</Typography>
                                        <Rating value={review.overallRating} readOnly precision={0.5} />
                                        <Typography variant="body2">({review.overallRating})</Typography>
                                    </Box>
                                )}

                                <Button
                                    fullWidth
                                    variant="outlined"
                                    sx={{ mt: 2 }}
                                >
                                    View Details
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default PerformanceManagement;
