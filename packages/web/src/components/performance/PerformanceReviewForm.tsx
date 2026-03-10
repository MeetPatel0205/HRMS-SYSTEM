import React, { useState } from 'react';
import {
    Paper,
    Typography,
    TextField,
    Grid,
    Button,
    Divider,
    Box,
    Rating,
    Slider,
    Chip
} from '@mui/material';
import { PerformanceReview, ReviewFeedback } from '../../types/performance';
import { performanceService } from '../../services/api/performance';

interface PerformanceReviewFormProps {
    review: PerformanceReview;
    isReviewer: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export const PerformanceReviewForm: React.FC<PerformanceReviewFormProps> = ({
    review,
    isReviewer,
    onClose,
    onUpdate
}) => {
    const [feedback, setFeedback] = useState<ReviewFeedback>(review.feedback || { strengths: '', improvements: '' });
    const [goals, setGoals] = useState(review.goals || []);
    const [competencies, setCompetencies] = useState(review.competencies || []);
    const [rating, setRating] = useState(review.overallRating || 0);
    const [saving, setSaving] = useState(false);

    const isEditable = review.status === 'draft';
    const canEdit = isEditable && isReviewer; // Only reviewer can edit main content for now

    const handleSave = async (submit: boolean = false) => {
        setSaving(true);
        try {
            await performanceService.updateReview(review.id, {
                feedback,
                goals,
                competencies
            });

            if (submit) {
                if (window.confirm('Are you sure you want to submit this review? It cannot be edited afterwards.')) {
                    await performanceService.submitReview(review.id);
                }
            } else {
                // Just save
            }
            onUpdate();
        } catch (err) {
            console.error(err);
            alert('Failed to save review');
        } finally {
            setSaving(false);
        }
    };

    const handleApprove = async () => {
        if (!window.confirm('Approve this review?')) return;
        setSaving(true);
        try {
            await performanceService.approveReview(review.id, rating);
            onUpdate();
        } catch (err) {
            console.error(err);
            alert('Failed to approve review');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Paper sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5">
                    Performance Review: {review.employee?.firstName} {review.employee?.lastName}
                </Typography>
                <Chip label={review.status} color="primary" />
            </Box>

            <Typography variant="h6" gutterBottom>Feedback</Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Strengths"
                        value={feedback.strengths}
                        onChange={(e) => setFeedback({ ...feedback, strengths: e.target.value })}
                        disabled={!canEdit}
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Areas for Improvement"
                        value={feedback.improvements}
                        onChange={(e) => setFeedback({ ...feedback, improvements: e.target.value })}
                        disabled={!canEdit}
                    />
                </Grid>
            </Grid>

            {isReviewer && review.status === 'submitted' && (
                <Box sx={{ mb: 4, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="h6" gutterBottom>Final Rating</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Rating
                            value={rating}
                            onChange={(_, newValue) => setRating(newValue || 0)}
                            size="large"
                            max={5}
                        />
                        <Typography sx={{ ml: 2 }}>{rating} Stars</Typography>
                    </Box>
                </Box>
            )}

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button onClick={onClose}>Close</Button>
                {canEdit && (
                    <>
                        <Button
                            variant="outlined"
                            onClick={() => handleSave(false)}
                            disabled={saving}
                        >
                            Save Draft
                        </Button>
                        <Button
                            variant="contained"
                            onClick={() => handleSave(true)}
                            disabled={saving}
                        >
                            Submit Review
                        </Button>
                    </>
                )}
                {isReviewer && review.status === 'submitted' && (
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleApprove}
                        disabled={saving}
                    >
                        Approve & Close
                    </Button>
                )}
            </Box>
        </Paper>
    );
};
