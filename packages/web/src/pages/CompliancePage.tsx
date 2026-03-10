import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    Chip,
    Box,
    Tabs,
    Tab,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton
} from '@mui/material';
import { Add, UploadFile, CheckCircle, Warning, Error as ErrorIcon } from '@mui/icons-material';
import { ComplianceRequirement, EmployeeCompliance, ComplianceStats } from '../types/compliance';
import { complianceService } from '../services/api/compliance';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';

const CompliancePage: React.FC = () => {
    const { hasPermission } = useAuth();
    const isAdmin = hasPermission('write_compliance');

    const [tab, setTab] = useState(0);
    const [stats, setStats] = useState<ComplianceStats | null>(null);
    const [requirements, setRequirements] = useState<ComplianceRequirement[]>([]);
    const [myRecords, setMyRecords] = useState<EmployeeCompliance[]>([]);
    const [loading, setLoading] = useState(false);

    // Dialogs
    const [openReqDialog, setOpenReqDialog] = useState(false);
    const [newReq, setNewReq] = useState<Partial<ComplianceRequirement>>({
        name: '', description: '', frequency: 'annually', dueDate: format(new Date(), 'yyyy-MM-dd')
    });

    const [openUploadDialog, setOpenUploadDialog] = useState(false);
    const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
    const [documentUrl, setDocumentUrl] = useState('');

    useEffect(() => {
        loadData();
    }, [tab, isAdmin]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (isAdmin) {
                const statsData = await complianceService.getStats();
                setStats(statsData);
                const reqs = await complianceService.getRequirements();
                setRequirements(reqs);
            }
            // Always load my records for everyone? Or just if tab 1 / employee?
            // If admin wants to see their own compliance, they can too.
            const records = await complianceService.getMyRecords();
            setMyRecords(records);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRequirement = async () => {
        try {
            await complianceService.createRequirement(newReq);
            setOpenReqDialog(false);
            loadData();
        } catch (err) {
            console.error(err);
            alert('Failed to create requirement');
        }
    };

    const handleSubmitProof = async () => {
        if (!selectedRecordId || !documentUrl) return;
        try {
            await complianceService.submitProof(selectedRecordId, documentUrl);
            setOpenUploadDialog(false);
            setDocumentUrl('');
            loadData();
        } catch (err) {
            console.error(err);
            alert('Failed to submit proof');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'compliant': return 'success';
            case 'pending': return 'warning';
            case 'expired': return 'error';
            default: return 'default';
        }
    };

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4">Compliance & Safety</Typography>
                {isAdmin && (
                    <Button variant="contained" startIcon={<Add />} onClick={() => setOpenReqDialog(true)}>
                        New Requirement
                    </Button>
                )}
            </Box>

            {isAdmin && stats && (
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>Overall Compliance</Typography>
                                <Typography variant="h4">{stats.rate.toFixed(1)}%</Typography>
                                <LinearProgressWithLabel value={stats.rate} />
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>Compliant</Typography>
                                <Typography variant="h4" color="success.main">{stats.compliant}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>Pending</Typography>
                                <Typography variant="h4" color="warning.main">{stats.pending}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>Expired / Non-Compliant</Typography>
                                <Typography variant="h4" color="error.main">{stats.expired}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                    <Tab label="My Compliance" />
                    {isAdmin && <Tab label="Manage Requirements" />}
                </Tabs>
            </Box>

            {tab === 0 && (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Requirement</TableCell>
                                <TableCell>Due Date</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Completed</TableCell>
                                <TableCell>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {myRecords.map(record => (
                                <TableRow key={record.id}>
                                    <TableCell>
                                        <Typography variant="subtitle2">{record.complianceRequirement?.name}</Typography>
                                        <Typography variant="caption" color="textSecondary">{record.complianceRequirement?.description}</Typography>
                                    </TableCell>
                                    <TableCell>{record.expiresAt ? format(new Date(record.expiresAt), 'MMM d, yyyy') : 'N/A'}</TableCell>
                                    <TableCell>
                                        <Chip label={record.status} color={getStatusColor(record.status) as any} size="small" />
                                    </TableCell>
                                    <TableCell>
                                        {record.completedAt ? format(new Date(record.completedAt), 'MMM d, yyyy') : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {record.status !== 'compliant' && (
                                            <Button
                                                size="small"
                                                startIcon={<UploadFile />}
                                                onClick={() => {
                                                    setSelectedRecordId(record.id);
                                                    setOpenUploadDialog(true);
                                                }}
                                            >
                                                Upload Proof
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {myRecords.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">No compliance records found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {tab === 1 && isAdmin && (
                <Grid container spacing={3}>
                    {requirements.map(req => (
                        <Grid item xs={12} md={6} key={req.id}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6">{req.name}</Typography>
                                    <Typography color="textSecondary" gutterBottom>Frequency: {req.frequency}</Typography>
                                    <Typography variant="body2" sx={{ mb: 2 }}>{req.description}</Typography>
                                    <Typography variant="caption">Due: {format(new Date(req.dueDate), 'MMM d, yyyy')}</Typography>
                                </CardContent>
                                <LoadingButton sx={{ ml: 1, mb: 1 }}>Assign to All (Coming Soon)</LoadingButton>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Create Requirement Dialog */}
            <Dialog open={openReqDialog} onClose={() => setOpenReqDialog(false)}>
                <DialogTitle>New Compliance Requirement</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 400 }}>
                        <TextField label="Name" value={newReq.name} onChange={e => setNewReq({ ...newReq, name: e.target.value })} />
                        <TextField label="Description" multiline rows={2} value={newReq.description} onChange={e => setNewReq({ ...newReq, description: e.target.value })} />
                        <TextField label="Due Date" type="date" InputLabelProps={{ shrink: true }} value={newReq.dueDate} onChange={e => setNewReq({ ...newReq, dueDate: e.target.value })} />
                        <TextField label="Frequency" value={newReq.frequency} onChange={e => setNewReq({ ...newReq, frequency: e.target.value })} helperText="e.g. Annually, One-time" />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenReqDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreateRequirement}>Create</Button>
                </DialogActions>
            </Dialog>

            {/* Upload Proof Dialog */}
            <Dialog open={openUploadDialog} onClose={() => setOpenUploadDialog(false)}>
                <DialogTitle>Submit Compliance Proof</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1, minWidth: 400 }}>
                        <Typography variant="body2" gutterBottom>Please provide a URL to your document (e.g. Google Drive link or S3 URL).</Typography>
                        <TextField
                            fullWidth
                            label="Document URL"
                            value={documentUrl}
                            onChange={e => setDocumentUrl(e.target.value)}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenUploadDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSubmitProof}>Submit</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

const LinearProgressWithLabel = (props: { value: number }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
        <Box sx={{ width: '100%', mr: 1 }}>
            <Box sx={{ width: `${props.value}%`, bgcolor: props.value === 100 ? 'success.main' : 'primary.main', height: 10, borderRadius: 5 }} />
        </Box>
    </Box>
);

const LoadingButton = (props: any) => <Button {...props} disabled>{props.children}</Button>;

export default CompliancePage;
