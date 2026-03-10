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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
    Collapse
} from '@mui/material';
import { Add, ExpandMore, ExpandLess, CheckCircle, Cancel, Inventory } from '@mui/icons-material';
import { ExitRequest, AssetReturn } from '../types/offboarding';
import { offboardingService } from '../services/api/offboarding';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';

const OffboardingPage: React.FC = () => {
    const { hasPermission, user } = useAuth();
    const isAdmin = hasPermission('write_offboarding');

    const [tab, setTab] = useState(0);
    const [requests, setRequests] = useState<ExitRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    // Dialogs
    const [openResignDialog, setOpenResignDialog] = useState(false);
    const [newResignation, setNewResignation] = useState({
        type: 'resignation',
        reason: '',
        lastWorkingDate: format(new Date(new Date().setDate(new Date().getDate() + 30)), 'yyyy-MM-dd') // Default 30 days notice
    });

    const [openAssetDialog, setOpenAssetDialog] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
    const [newAsset, setNewAsset] = useState({ assetName: '', assetId: '' });

    useEffect(() => {
        loadData();
    }, [tab, isAdmin]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (isAdmin && tab === 1) {
                const data = await offboardingService.getAllRequests();
                setRequests(data);
            } else {
                const data = await offboardingService.getMyRequests();
                setRequests(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleResign = async () => {
        try {
            await offboardingService.createRequest(newResignation);
            setOpenResignDialog(false);
            loadData();
        } catch (err) {
            console.error(err);
            alert('Failed to submit request');
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await offboardingService.updateRequest(id, { status });
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddAsset = async () => {
        if (!selectedRequestId) return;
        try {
            await offboardingService.addAsset(selectedRequestId, newAsset);
            setOpenAssetDialog(false);
            setNewAsset({ assetName: '', assetId: '' });
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleAssetStatus = async (assetId: string, status: string) => {
        try {
            await offboardingService.updateAsset(assetId, { status });
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const StatusChip = ({ status }: { status: string }) => {
        let color: any = 'default';
        if (status === 'approved' || status === 'returned' || status === 'completed') color = 'success';
        if (status === 'rejected' || status === 'lost') color = 'error';
        if (status === 'pending') color = 'warning';
        return <Chip label={status} color={color} size="small" />;
    };

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4">Offboarding</Typography>
                {!isAdmin && (
                    <Button variant="contained" color="error" startIcon={<Cancel />} onClick={() => setOpenResignDialog(true)}>
                        Resign
                    </Button>
                )}
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                    <Tab label="My Requests" />
                    {isAdmin && <Tab label="Manage Offboarding" />}
                </Tabs>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell />
                            <TableCell>Employee</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Reason</TableCell>
                            <TableCell>Last Working Date</TableCell>
                            <TableCell>Status</TableCell>
                            {isAdmin && <TableCell>Actions</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {requests.map(req => (
                            <React.Fragment key={req.id}>
                                <TableRow>
                                    <TableCell>
                                        <IconButton size="small" onClick={() => setExpandedRow(expandedRow === req.id ? null : req.id)}>
                                            {expandedRow === req.id ? <ExpandLess /> : <ExpandMore />}
                                        </IconButton>
                                    </TableCell>
                                    <TableCell>
                                        {req.employee ? `${req.employee.firstName} ${req.employee.lastName}` : 'Me'}
                                    </TableCell>
                                    <TableCell>{req.type}</TableCell>
                                    <TableCell>{req.reason}</TableCell>
                                    <TableCell>{format(new Date(req.lastWorkingDate), 'MMM d, yyyy')}</TableCell>
                                    <TableCell><StatusChip status={req.status} /></TableCell>
                                    {isAdmin && (
                                        <TableCell>
                                            {req.status === 'pending' && (
                                                <>
                                                    <Button size="small" color="success" onClick={() => handleUpdateStatus(req.id, 'approved')}>Approve</Button>
                                                    <Button size="small" color="error" onClick={() => handleUpdateStatus(req.id, 'rejected')}>Reject</Button>
                                                </>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                                <TableRow>
                                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                                        <Collapse in={expandedRow === req.id} timeout="auto" unmountOnExit>
                                            <Box sx={{ margin: 2 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                    <Typography variant="h6" gutterBottom component="div">Asset Returns</Typography>
                                                    {isAdmin && (
                                                        <Button startIcon={<Inventory />} size="small" onClick={() => { setSelectedRequestId(req.id); setOpenAssetDialog(true); }}>
                                                            Add Asset
                                                        </Button>
                                                    )}
                                                </Box>
                                                <Table size="small" aria-label="assets">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell>Asset Name</TableCell>
                                                            <TableCell>Asset ID</TableCell>
                                                            <TableCell>Status</TableCell>
                                                            {isAdmin && <TableCell>Actions</TableCell>}
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {req.assets?.map(asset => (
                                                            <TableRow key={asset.id}>
                                                                <TableCell>{asset.assetName}</TableCell>
                                                                <TableCell>{asset.assetId || '-'}</TableCell>
                                                                <TableCell><StatusChip status={asset.status} /></TableCell>
                                                                {isAdmin && (
                                                                    <TableCell>
                                                                        {asset.status === 'pending' && (
                                                                            <Button size="small" onClick={() => handleAssetStatus(asset.id, 'returned')}>Mark Returned</Button>
                                                                        )}
                                                                    </TableCell>
                                                                )}
                                                            </TableRow>
                                                        ))}
                                                        {(!req.assets || req.assets.length === 0) && (
                                                            <TableRow>
                                                                <TableCell colSpan={4} align="center">No assets to return recorded.</TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </Box>
                                        </Collapse>
                                    </TableCell>
                                </TableRow>
                            </React.Fragment>
                        ))}
                        {requests.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} align="center">No records found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Resign Dialog */}
            <Dialog open={openResignDialog} onClose={() => setOpenResignDialog(false)}>
                <DialogTitle>Submit Resignation</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 400 }}>
                        <Typography color="error" variant="caption">This action is formal and will notify HR.</Typography>
                        <TextField
                            label="Reason"
                            multiline
                            rows={3}
                            value={newResignation.reason}
                            onChange={e => setNewResignation({ ...newResignation, reason: e.target.value })}
                        />
                        <TextField
                            label="Last Working Date (Proposed)"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={newResignation.lastWorkingDate}
                            onChange={e => setNewResignation({ ...newResignation, lastWorkingDate: e.target.value })}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenResignDialog(false)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleResign}>Submit Resignation</Button>
                </DialogActions>
            </Dialog>

            {/* Asset Dialog */}
            <Dialog open={openAssetDialog} onClose={() => setOpenAssetDialog(false)}>
                <DialogTitle>Add Asset to Return</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 300 }}>
                        <TextField
                            label="Asset Name"
                            value={newAsset.assetName}
                            onChange={e => setNewAsset({ ...newAsset, assetName: e.target.value })}
                        />
                        <TextField
                            label="Asset ID (Optional)"
                            value={newAsset.assetId}
                            onChange={e => setNewAsset({ ...newAsset, assetId: e.target.value })}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAssetDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddAsset}>Add</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default OffboardingPage;
