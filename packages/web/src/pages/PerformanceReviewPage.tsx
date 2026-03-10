import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Tab, Tabs, Button, Alert } from '@mui/material';
import { PerformanceReviewList } from '../components/performance/PerformanceReviewList';
import { PerformanceReviewForm } from '../components/performance/PerformanceReviewForm';
import { performanceService } from '../services/api/performance';
import { PerformanceReview } from '../types/performance';
import { useAuth } from '../hooks/useAuth';

const PerformanceReviewPage: React.FC = () => {
    const { hasPermission } = useAuth();
    const [tab, setTab] = useState(0);
    const [myReviews, setMyReviews] = useState<PerformanceReview[]>([]);
    const [toConduct, setToConduct] = useState<PerformanceReview[]>([]);
    const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);
    const [error, setError] = useState<string | null>(null);

    const canConduct = hasPermission('write_performance');

    useEffect(() => {
        loadData();
    }, [tab]);

    const loadData = async () => {
        try {
            setError(null);
            if (tab === 0) {
                const data = await performanceService.getMyReviews();
                setMyReviews(data);
            } else if (tab === 1 && canConduct) {
                const data = await performanceService.getReviewsToConduct();
                setToConduct(data);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to load performance reviews');
        }
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTab(newValue);
        setSelectedReview(null);
    };

    const handleViewReview = async (review: PerformanceReview) => {
        // Fetch full details
        try {
            const data = await performanceService.getReview(review.id);
            setSelectedReview(data);
        } catch (err) {
            console.error(err);
            setError('Failed to load full review details');
        }
    };

    const handleCloseReview = () => {
        setSelectedReview(null);
        loadData(); // Refresh list
    };

    if (selectedReview) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Button onClick={handleCloseReview} sx={{ mb: 2 }}>&larr; Back to List</Button>
                <PerformanceReviewForm
                    review={selectedReview}
                    isReviewer={tab === 1} // Quick hack: if on "To Conduct" tab, likely reviewer
                    onClose={handleCloseReview}
                    onUpdate={handleCloseReview}
                />
            </Container>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4">Performance Management</Typography>
                {/* <Button variant="contained">Request Review</Button> */}
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tab} onChange={handleTabChange}>
                    <Tab label="My Reviews" />
                    {canConduct && <Tab label="To Conduct" />}
                </Tabs>
            </Box>

            {tab === 0 && (
                <PerformanceReviewList
                    reviews={myReviews}
                    title="My Performance Reviews"
                    onView={handleViewReview}
                />
            )}

            {tab === 1 && canConduct && (
                <PerformanceReviewList
                    reviews={toConduct}
                    title="Reviews to Conduct"
                    onView={handleViewReview}
                    showEmployeeName
                />
            )}
        </Container>
    );
};

export default PerformanceReviewPage;
