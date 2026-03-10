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
    List,
    ListItem,
    ListItemText,
    IconButton,
    Tabs,
    Tab,
    Avatar
} from '@mui/material';
import {
    Check as CheckIcon,
    Close as CloseIcon,
    AccessTime as AccessTimeIcon,
    EventAvailable as EventAvailableIcon,
    AttachMoney as AttachMoneyIcon
} from '@mui/icons-material';

interface Approval {
    id: string;
    type: 'LEAVE' | 'EXPENSE' | 'TIMEOFF';
    employeeName: string;
    employeeAvatar?: string;
    title: string;
    description: string;
    amount?: number;
    startDate?: string;
    endDate?: string;
    submittedDate: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

const ApprovalCenter: React.FC = () => {
    const [approvals] = useState<Approval[]>([
        {
            id: '1',
            type: 'LEAVE',
            employeeName: 'John Doe',
            title: 'Vacation Leave',
            description: 'Family vacation',
            startDate: '2026-03-01',
            endDate: '2026-03-05',
            submittedDate: '2026-02-01',
            status: 'PENDING'
        },
        {
            id: '2',
            type: 'EXPENSE',
            employeeName: 'Jane Smith',
            title: 'Travel Expenses',
            description: 'Client meeting in NYC',
            amount: 1250.00,
            submittedDate: '2026-02-05',
            status: 'PENDING'
        },
        {
            id: '3',
            type: 'TIMEOFF',
            employeeName: 'Bob Wilson',
            title: 'Sick Leave',
            description: 'Medical appointment',
            startDate: '2026-02-10',
            endDate: '2026-02-10',
            submittedDate: '2026-02-08',
            status: 'PENDING'
        },
    ]);
    const [tabValue, setTabValue] = useState(0);

    const filteredApprovals = approvals.filter(approval => {
        if (tabValue === 0) return approval.status === 'PENDING';
        if (tabValue === 1) return approval.status === 'APPROVED';
        if (tabValue === 2) return approval.status === 'REJECTED';
        return true;
    });

    const handleApprove = (id: string) => {
        console.log('Approving:', id);
    };

    const handleReject = (id: string) => {
        console.log('Rejecting:', id);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'LEAVE': return <EventAvailableIcon />;
            case 'EXPENSE': return <AttachMoneyIcon />;
            case 'TIMEOFF': return <AccessTimeIcon />;
            default: return undefined;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'LEAVE': return 'primary';
            case 'EXPENSE': return 'success';
            case 'TIMEOFF': return 'warning';
            default: return 'default';
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4">Approval Center</Typography>
                <Typography variant="body2" color="text.secondary">
                    Review and approve team requests
                </Typography>
            </Box>

            {/* Stats */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="text.secondary">Pending</Typography>
                            <Typography variant="h4">
                                {approvals.filter(a => a.status === 'PENDING').length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="text.secondary">Approved</Typography>
                            <Typography variant="h4">
                                {approvals.filter(a => a.status === 'APPROVED').length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="text.secondary">Rejected</Typography>
                            <Typography variant="h4">
                                {approvals.filter(a => a.status === 'REJECTED').length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Paper sx={{ mb: 3 }}>
                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
                    <Tab label="Pending" />
                    <Tab label="Approved" />
                    <Tab label="Rejected" />
                </Tabs>
            </Paper>

            <Grid container spacing={2}>
                {filteredApprovals.length === 0 ? (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 3, textAlign: 'center' }}>
                            <Typography variant="body1" color="text.secondary">
                                No approvals in this category
                            </Typography>
                        </Paper>
                    </Grid>
                ) : (
                    filteredApprovals.map((approval) => (
                        <Grid item xs={12} md={6} key={approval.id}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                                            <Avatar>
                                                {approval.employeeName[0]}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="h6">{approval.title}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {approval.employeeName}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Chip
                                            icon={getTypeIcon(approval.type)}
                                            label={approval.type}
                                            size="small"
                                            color={getTypeColor(approval.type) as any}
                                        />
                                    </Box>

                                    <Typography variant="body2" sx={{ mb: 2 }}>
                                        {approval.description}
                                    </Typography>

                                    {approval.amount && (
                                        <Typography variant="body2" color="text.secondary">
                                            Amount: ${approval.amount.toFixed(2)}
                                        </Typography>
                                    )}

                                    {approval.startDate && approval.endDate && (
                                        <Typography variant="body2" color="text.secondary">
                                            {new Date(approval.startDate).toLocaleDateString()} - {new Date(approval.endDate).toLocaleDateString()}
                                        </Typography>
                                    )}

                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                                        Submitted: {new Date(approval.submittedDate).toLocaleDateString()}
                                    </Typography>

                                    {approval.status === 'PENDING' && (
                                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                            <Button
                                                variant="contained"
                                                color="success"
                                                startIcon={<CheckIcon />}
                                                fullWidth
                                                onClick={() => handleApprove(approval.id)}
                                            >
                                                Approve
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                startIcon={<CloseIcon />}
                                                fullWidth
                                                onClick={() => handleReject(approval.id)}
                                            >
                                                Reject
                                            </Button>
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    ))
                )}
            </Grid>
        </Box>
    );
};

export default ApprovalCenter;
