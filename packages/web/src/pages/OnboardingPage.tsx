import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Alert, CircularProgress } from '@mui/material';
import { OnboardingChecklistView } from '../components/onboarding/OnboardingChecklistView';
import { OnboardingAdminView } from '../components/onboarding/OnboardingAdminDashboard';
import { onboardingService } from '../services/api/onboarding';
import { OnboardingChecklist } from '../types/onboarding';
import { useAuth } from '../hooks/useAuth';

const OnboardingPage: React.FC = () => {
    const { hasPermission, hasRole } = useAuth();
    const [myChecklist, setMyChecklist] = useState<OnboardingChecklist | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isHR = hasPermission('write_employee');
    // HR sees Admin View. Standard Employees sees their checklist.

    useEffect(() => {
        if (!isHR) {
            loadMyChecklist();
        } else {
            setLoading(false);
        }
    }, [isHR]);

    const loadMyChecklist = async () => {
        try {
            setLoading(true);
            const data = await onboardingService.getMyChecklist();
            setMyChecklist(data);
        } catch (err) {
            console.error(err);
            setError('Failed to load your onboarding checklist.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CircularProgress />
            </Container>
        );
    }

    if (isHR) {
        return (
            <Container maxWidth="xl" sx={{ py: 4 }}>
                <OnboardingAdminView />
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom>Onboarding</Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {!myChecklist && !error && (
                <Alert severity="info">
                    No onboarding checklist has been assigned to you yet. Please contact HR.
                </Alert>
            )}

            {myChecklist && (
                <OnboardingChecklistView
                    checklist={myChecklist}
                    onUpdate={loadMyChecklist}
                />
            )}
        </Container>
    );
};

export default OnboardingPage;
