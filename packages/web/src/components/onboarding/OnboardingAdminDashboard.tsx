import React, { useState, useEffect } from 'react';
import {
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    DialogActions,
    Grid,
    IconButton,
    Box
} from '@mui/material';
import { Add, Visibility } from '@mui/icons-material';
import { OnboardingChecklist, OnboardingTask } from '../../types/onboarding';
import { onboardingService } from '../../services/api/onboarding';
import { format } from 'date-fns';
import { OnboardingChecklistView } from './OnboardingChecklistView';

export const OnboardingAdminView: React.FC = () => {
    const [checklists, setChecklists] = useState<OnboardingChecklist[]>([]);
    const [selectedChecklist, setSelectedChecklist] = useState<OnboardingChecklist | null>(null);
    const [openAssign, setOpenAssign] = useState(false);

    // Form state
    const [employeeId, setEmployeeId] = useState('');
    const [dueDate, setDueDate] = useState('');
    // Simple default tasks for MVP
    const defaultTasks: OnboardingTask[] = [
        { id: '1', title: 'Complete Profile', description: 'Fill out personal information', status: 'pending' },
        { id: '2', title: 'Upload Documents', description: 'ID, Tax forms, etc.', status: 'pending' },
        { id: '3', title: 'Read Handbook', description: 'Read and sign employee handbook', status: 'pending' }
    ];

    useEffect(() => {
        loadChecklists();
    }, []);

    const loadChecklists = async () => {
        try {
            const data = await onboardingService.getAllChecklists();
            setChecklists(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAssign = async () => {
        try {
            await onboardingService.assignChecklist({
                employeeId,
                startDate: new Date(),
                dueDate: new Date(dueDate),
                tasks: defaultTasks
            });
            setOpenAssign(false);
            loadChecklists();
            alert('Checklist assigned successfully');
        } catch (err) {
            console.error(err);
            alert('Failed to assign checklist. Ensure employee ID is correct and they don\'t already have one.');
        }
    };

    return (
        <>
            <Paper sx={{ p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">Onboarding Overview</Typography>
                    <Button variant="contained" startIcon={<Add />} onClick={() => setOpenAssign(true)}>
                        Assign Checklist
                    </Button>
                </Box>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Employee</TableCell>
                                <TableCell>Department</TableCell>
                                <TableCell>Start Date</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Progress</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {checklists.map((cl) => {
                                const completed = cl.tasks.filter(t => t.status === 'completed').length;
                                const total = cl.tasks.length;
                                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                                return (
                                    <TableRow key={cl.id}>
                                        <TableCell>
                                            {cl.employee ? `${cl.employee.firstName} ${cl.employee.lastName}` : 'Unknown'}
                                            <Typography variant="caption" display="block">{cl.employee?.email}</Typography>
                                        </TableCell>
                                        <TableCell>{cl.employee?.department}</TableCell>
                                        <TableCell>{format(new Date(cl.createdAt), 'MMM d, yyyy')}</TableCell>
                                        <TableCell>{cl.status}</TableCell>
                                        <TableCell>{pct}%</TableCell>
                                        <TableCell align="right">
                                            <IconButton onClick={() => setSelectedChecklist(cl)}>
                                                <Visibility />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Dialog open={openAssign} onClose={() => setOpenAssign(false)}>
                <DialogTitle>Assign Onboarding Checklist</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Employee ID"
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value)}
                                helperText="Enter the UUID of the new hire"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Due Date"
                                type="date"
                                InputLabelProps={{ shrink: true }}
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAssign(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAssign}>Assign</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={!!selectedChecklist} onClose={() => setSelectedChecklist(null)} maxWidth="md" fullWidth>
                <DialogContent>
                    {selectedChecklist && (
                        <OnboardingChecklistView
                            checklist={selectedChecklist}
                            onUpdate={loadChecklists}
                            readOnly // Admin views as read-only for now
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedChecklist(null)}>Close</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
