import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Tab, Tabs, Button, Alert } from '@mui/material';
import { JobPostingList } from '../components/recruitment/JobPostingList';
import { JobPostingForm } from '../components/recruitment/JobPostingForm';
import { ApplicationList } from '../components/recruitment/ApplicationList';
import { recruitmentService } from '../services/api/recruitment';
import { JobPosting, Application } from '../types/recruitment';
import { useAuth } from '../hooks/useAuth';

const RecruitmentPage: React.FC = () => {
    const { hasPermission } = useAuth();
    const [tab, setTab] = useState(0);
    const [jobs, setJobs] = useState<JobPosting[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [selectedJob, setSelectedJob] = useState<JobPosting | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);

    const isAdmin = hasPermission('write_recruitment');

    useEffect(() => {
        loadData();
    }, [tab]);

    const loadData = async () => {
        try {
            if (tab === 0) {
                const data = await recruitmentService.getJobs({ status: isAdmin ? undefined : 'published' });
                setJobs(data);
            } else if (tab === 1 && isAdmin) {
                const data = await recruitmentService.getApplications();
                setApplications(data);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to load data');
        }
    };

    const handleEditJob = (job: JobPosting) => {
        setSelectedJob(job);
        setShowForm(true);
    };

    const handleCreateJob = () => {
        setSelectedJob(undefined);
        setShowForm(true);
    };

    const handleFormClose = () => {
        setShowForm(false);
        setSelectedJob(undefined);
    };

    const handleFormSave = () => {
        handleFormClose();
        loadData();
    };

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4">Recruitment</Typography>
                {tab === 0 && isAdmin && (
                    <Button variant="contained" onClick={handleCreateJob}>Post Job</Button>
                )}
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            {showForm ? (
                <JobPostingForm
                    job={selectedJob}
                    onClose={handleFormClose}
                    onSave={handleFormSave}
                />
            ) : (
                <>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                            <Tab label="Job Postings" />
                            {isAdmin && <Tab label="Applications" />}
                        </Tabs>
                    </Box>

                    {tab === 0 && (
                        <JobPostingList
                            jobs={jobs}
                            onEdit={handleEditJob}
                            isAdmin={isAdmin}
                        />
                    )}

                    {tab === 1 && isAdmin && (
                        <ApplicationList
                            applications={applications}
                            onUpdate={loadData}
                        />
                    )}
                </>
            )}
        </Container>
    );
};

export default RecruitmentPage;
