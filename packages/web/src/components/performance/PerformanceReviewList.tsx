import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    Typography,
    Button
} from '@mui/material';
import { Visibility, Edit } from '@mui/icons-material';
import { PerformanceReview } from '../../types/performance';
import { format } from 'date-fns';

interface PerformanceReviewListProps {
    reviews: PerformanceReview[];
    title: string;
    onView: (review: PerformanceReview) => void;
    showEmployeeName?: boolean;
}

export const PerformanceReviewList: React.FC<PerformanceReviewListProps> = ({
    reviews,
    title,
    onView,
    showEmployeeName = false
}) => {
    if (reviews.length === 0) {
        return (
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>{title}</Typography>
                <Typography variant="body1" color="textSecondary">No reviews found.</Typography>
            </Paper>
        );
    }

    return (
        <Paper sx={{ mb: 3, overflow: 'hidden' }}>
            <Typography variant="h6" sx={{ p: 2, pb: 0 }}>{title}</Typography>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            {showEmployeeName && <TableCell>Employee</TableCell>}
                            <TableCell>Period</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Status</TableCell>
                            {!showEmployeeName && <TableCell>Reviewer</TableCell>}
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {reviews.map((review) => (
                            <TableRow key={review.id} hover>
                                {showEmployeeName && (
                                    <TableCell>
                                        {review.employee ? `${review.employee.firstName} ${review.employee.lastName}` : 'Unknown'}
                                        {review.employee?.jobTitle && <Typography variant="caption" display="block">{review.employee.jobTitle}</Typography>}
                                    </TableCell>
                                )}
                                <TableCell>
                                    {format(new Date(review.reviewPeriodStart), 'MMM yyyy')} - {format(new Date(review.reviewPeriodEnd), 'MMM yyyy')}
                                </TableCell>
                                <TableCell>{review.reviewType}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={review.status}
                                        color={
                                            review.status === 'approved' ? 'success' :
                                                review.status === 'submitted' ? 'primary' : 'default'
                                        }
                                        size="small"
                                    />
                                </TableCell>
                                {!showEmployeeName && (
                                    <TableCell>
                                        {review.reviewer ? `${review.reviewer.firstName} ${review.reviewer.lastName}` : 'Pending'}
                                    </TableCell>
                                )}
                                <TableCell align="right">
                                    <IconButton size="small" onClick={() => onView(review)}>
                                        {review.status === 'draft' ? <Edit /> : <Visibility />}
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};
