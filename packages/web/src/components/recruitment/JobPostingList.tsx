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
import { Edit, Visibility } from '@mui/icons-material';
import { JobPosting } from '../../types/recruitment';
import { format } from 'date-fns';

interface JobPostingListProps {
    jobs: JobPosting[];
    onEdit?: (job: JobPosting) => void;
    onView?: (job: JobPosting) => void;
    isAdmin: boolean;
}

export const JobPostingList: React.FC<JobPostingListProps> = ({ jobs, onEdit, onView, isAdmin }) => {
    if (jobs.length === 0) {
        return <Typography color="textSecondary">No job postings found.</Typography>;
    }

    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Department</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Posted On</TableCell>
                        <TableCell align="right">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {jobs.map((job) => (
                        <TableRow key={job.id}>
                            <TableCell>{job.title}</TableCell>
                            <TableCell>{job.department}</TableCell>
                            <TableCell>{job.location}</TableCell>
                            <TableCell>
                                <Chip
                                    label={job.status}
                                    color={job.status === 'published' ? 'success' : 'default'}
                                    size="small"
                                />
                            </TableCell>
                            <TableCell>
                                {job.publishedAt ? format(new Date(job.publishedAt), 'MMM d, yyyy') : '-'}
                            </TableCell>
                            <TableCell align="right">
                                {isAdmin && onEdit && (
                                    <IconButton size="small" onClick={() => onEdit(job)}>
                                        <Edit />
                                    </IconButton>
                                )}
                                {onView && (
                                    <IconButton size="small" onClick={() => onView(job)}>
                                        <Visibility />
                                    </IconButton>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
