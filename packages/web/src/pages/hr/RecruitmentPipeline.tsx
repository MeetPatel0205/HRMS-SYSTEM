import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Grid,
    Card,
    CardContent,
    Chip,
    Avatar,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    IconButton
} from '@mui/material';
import {
    Add as AddIcon,
    Person as PersonIcon,
    ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';

interface Candidate {
    id: string;
    name: string;
    position: string;
    stage: string;
    email: string;
    phone: string;
    appliedDate: string;
}

const stages = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'];

const RecruitmentPipeline: React.FC = () => {
    const [candidates] = useState<Candidate[]>([
        { id: '1', name: 'John Doe', position: 'Software Engineer', stage: 'Applied', email: 'john@example.com', phone: '123-456-7890', appliedDate: '2026-02-01' },
        { id: '2', name: 'Jane Smith', position: 'Product Manager', stage: 'Screening', email: 'jane@example.com', phone: '123-456-7891', appliedDate: '2026-01-28' },
        { id: '3', name: 'Bob Wilson', position: 'Designer', stage: 'Interview', email: 'bob@example.com', phone: '123-456-7892', appliedDate: '2026-01-25' },
        { id: '4', name: 'Alice Brown', position: 'Data Analyst', stage: 'Offer', email: 'alice@example.com', phone: '123-456-7893', appliedDate: '2026-01-20' },
    ]);

    const getCandidatesByStage = (stage: string) => {
        return candidates.filter(c => c.stage === stage);
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4">Recruitment Pipeline</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Track candidates through the hiring process
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                >
                    Add Candidate
                </Button>
            </Box>

            {/* Pipeline Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {stages.map((stage) => (
                    <Grid item xs={12} sm={6} md key={stage}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" color="text.secondary">{stage}</Typography>
                                <Typography variant="h4">{getCandidatesByStage(stage).length}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Pipeline Columns */}
            <Grid container spacing={2}>
                {stages.map((stage) => (
                    <Grid item xs={12} md key={stage}>
                        <Paper sx={{ p: 2, minHeight: 400 }}>
                            <Typography variant="h6" gutterBottom>
                                {stage}
                            </Typography>
                            <List>
                                {getCandidatesByStage(stage).map((candidate) => (
                                    <Card key={candidate.id} sx={{ mb: 1 }}>
                                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                            <Box sx={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'start', gap: 1 }}>
                                                    <Avatar sx={{ width: 40, height: 40 }}>
                                                        {candidate.name[0]}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="subtitle2">
                                                            {candidate.name}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {candidate.position}
                                                        </Typography>
                                                        <Typography variant="caption" display="block" color="text.secondary">
                                                            Applied: {new Date(candidate.appliedDate).toLocaleDateString()}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <IconButton size="small">
                                                    <ArrowForwardIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                ))}
                                {getCandidatesByStage(stage).length === 0 && (
                                    <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
                                        No candidates in this stage
                                    </Typography>
                                )}
                            </List>
                        </Paper>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default RecruitmentPipeline;
