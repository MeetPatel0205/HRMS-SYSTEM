import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    CardActions,
    Button,
    Chip,
    Box,
    Alert,
    Tabs,
    Tab,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { BenefitPlan, BenefitEnrollment } from '../types/benefits';
import { benefitsService } from '../services/api/benefits';
import { useAuth } from '../hooks/useAuth';

const BenefitsPage: React.FC = () => {
    const { hasPermission } = useAuth();
    const [tab, setTab] = useState(0);
    const [plans, setPlans] = useState<BenefitPlan[]>([]);
    const [myEnrollments, setMyEnrollments] = useState<BenefitEnrollment[]>([]);
    const [loading, setLoading] = useState(false);

    // Admin handling
    const isAdmin = hasPermission('write_benefits');
    const [openPlanDialog, setOpenPlanDialog] = useState(false);
    const [newPlan, setNewPlan] = useState<Partial<BenefitPlan>>({
        name: '', description: '', type: 'health', provider: '', cost: { employee: 0, employer: 0, frequency: 'monthly' }
    });

    useEffect(() => {
        loadData();
    }, [tab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (tab === 0) {
                // Available Plans
                const data = await benefitsService.getPlans();
                setPlans(data);
                // Also load enrollments to show status
                if (!isAdmin) {
                    const enrolls = await benefitsService.getMyEnrollments();
                    setMyEnrollments(enrolls);
                }
            } else if (tab === 1) {
                // My Enrollments
                const data = await benefitsService.getMyEnrollments();
                setMyEnrollments(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleEnroll = async (plan: BenefitPlan) => {
        if (!window.confirm(`Enroll in ${plan.name}?`)) return;
        try {
            await benefitsService.enroll(plan.id, { coverage: 'individual' }); // simplified elections
            alert('Enrolled successfully!');
            loadData();
        } catch (err) {
            console.error(err);
            alert('Failed to enroll');
        }
    };

    const handleCreatePlan = async () => {
        try {
            await benefitsService.createPlan(newPlan);
            setOpenPlanDialog(false);
            loadData();
        } catch (err) {
            console.error(err);
            alert('Failed to create plan');
        }
    };

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4">Benefits Center</Typography>
                {isAdmin && (
                    <Button variant="contained" startIcon={<Add />} onClick={() => setOpenPlanDialog(true)}>
                        New Benefit Plan
                    </Button>
                )}
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                    <Tab label="Available Plans" />
                    {!isAdmin && <Tab label="My Enrollments" />}
                </Tabs>
            </Box>

            <Grid container spacing={3}>
                {tab === 0 && plans.map(plan => {
                    const isEnrolled = myEnrollments.some(e => e.benefitPlanId === plan.id && e.status === 'active');
                    return (
                        <Grid item xs={12} md={4} key={plan.id}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="h6">{plan.name}</Typography>
                                        <Chip label={plan.type} size="small" />
                                    </Box>
                                    <Typography color="textSecondary" gutterBottom>{plan.provider}</Typography>
                                    <Typography variant="body2" sx={{ mb: 2 }}>{plan.description}</Typography>

                                    <Box sx={{ bgcolor: 'background.default', p: 1, borderRadius: 1 }}>
                                        <Typography variant="caption" display="block">Cost to You:</Typography>
                                        <Typography variant="subtitle2">
                                            ${plan.cost?.employee} / {plan.cost?.frequency}
                                        </Typography>
                                    </Box>
                                </CardContent>
                                <CardActions>
                                    {isEnrolled ? (
                                        <Button disabled color="success" fullWidth variant="outlined">Enrolled</Button>
                                    ) : (
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            onClick={() => handleEnroll(plan)}
                                            disabled={isAdmin} // Admins don't enroll here usually
                                        >
                                            Enroll
                                        </Button>
                                    )}
                                </CardActions>
                            </Card>
                        </Grid>
                    );
                })}

                {tab === 1 && myEnrollments.map(enrollment => (
                    <Grid item xs={12} md={6} key={enrollment.id}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6">{enrollment.benefitPlan?.name}</Typography>
                                <Typography color="textSecondary">Active Since: {new Date(enrollment.effectiveDate).toLocaleDateString()}</Typography>
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                    Coverage: {enrollment.elections?.coverage || 'Standard'}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Create Plan Dialog (Simplified) */}
            <Dialog open={openPlanDialog} onClose={() => setOpenPlanDialog(false)}>
                <DialogTitle>Add Benefit Plan</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 400 }}>
                        <TextField
                            label="Plan Name"
                            value={newPlan.name}
                            onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                        />
                        <TextField
                            label="Provider"
                            value={newPlan.provider}
                            onChange={(e) => setNewPlan({ ...newPlan, provider: e.target.value })}
                        />
                        <TextField
                            label="Type (health, dental, etc)"
                            value={newPlan.type}
                            onChange={(e) => setNewPlan({ ...newPlan, type: e.target.value })}
                        />
                        <TextField
                            label="Employee Cost"
                            type="number"
                            value={newPlan.cost?.employee}
                            onChange={(e) => setNewPlan({
                                ...newPlan,
                                cost: { ...newPlan.cost!, employee: Number(e.target.value) }
                            })}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenPlanDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreatePlan}>Create</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default BenefitsPage;
