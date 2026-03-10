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
    Select,
    MenuItem,
    Button
} from '@mui/material';
import { Application } from '../../types/recruitment';
import { recruitmentService } from '../../services/api/recruitment';

interface ApplicationListProps {
    applications: Application[];
    onUpdate: () => void;
}

export const ApplicationList: React.FC<ApplicationListProps> = ({ applications, onUpdate }) => {

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await recruitmentService.updateApplicationStatus(id, newStatus);
            onUpdate();
        } catch (err) {
            console.error(err);
            alert('Failed to update status');
        }
    };

    if (applications.length === 0) {
        return <Typography color="textSecondary">No applications found.</Typography>;
    }

    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Candidate</TableCell>
                        <TableCell>Job</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {applications.map((app) => (
                        <TableRow key={app.id}>
                            <TableCell>{app.firstName} {app.lastName}</TableCell>
                            <TableCell>{app.jobPosting?.title || 'Unknown'}</TableCell>
                            <TableCell>{app.email}</TableCell>
                            <TableCell>
                                <Select
                                    size="small"
                                    value={app.status}
                                    onChange={(e) => handleStatusChange(app.id, e.target.value)}
                                >
                                    <MenuItem value="submitted">Submitted</MenuItem>
                                    <MenuItem value="under_review">Under Review</MenuItem>
                                    <MenuItem value="interview_scheduled">Interview</MenuItem>
                                    <MenuItem value="offer_extended">Offer</MenuItem>
                                    <MenuItem value="hired">Hired</MenuItem>
                                    <MenuItem value="rejected">Rejected</MenuItem>
                                </Select>
                            </TableCell>
                            <TableCell align="right">
                                <Button size="small" href={app.resumeUrl} target="_blank">Resume</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
