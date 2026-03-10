import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Grid,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import {
    Add as AddIcon,
    AttachMoney as AttachMoneyIcon,
    Receipt as ReceiptIcon
} from '@mui/icons-material';
import { expensesAPI } from '../../services/api';

interface Expense {
    id: string;
    date: string;
    category: string;
    description: string;
    amount: number;
    status: string;
}

const ExpensesPage: React.FC = () => {
    const [expenses] = useState<Expense[]>([
        { id: '1', date: '2026-02-05', category: 'Travel', description: 'Flight to NYC', amount: 450.00, status: 'APPROVED' },
        { id: '2', date: '2026-02-03', category: 'Meals', description: 'Client dinner', amount: 125.50, status: 'PENDING' },
        { id: '3', date: '2026-02-01', category: 'Office Supplies', description: 'Laptop accessories', amount: 89.99, status: 'APPROVED' },
    ]);
    const [openDialog, setOpenDialog] = useState(false);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        category: '',
        description: '',
        amount: ''
    });

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const pendingExpenses = expenses.filter(e => e.status === 'PENDING').reduce((sum, exp) => sum + exp.amount, 0);

    const handleSubmit = async () => {
        try {
            // Implementation would call API
            console.log('Submitting expense:', formData);
            setOpenDialog(false);
            setFormData({
                date: new Date().toISOString().split('T')[0],
                category: '',
                description: '',
                amount: ''
            });
        } catch (error) {
            console.error('Failed to submit expense:', error);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">My Expenses</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenDialog(true)}
                >
                    Submit Expense
                </Button>
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <AttachMoneyIcon sx={{ fontSize: 40 }} color="primary" />
                                <Box>
                                    <Typography variant="h5">${totalExpenses.toFixed(2)}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Total Expenses
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <ReceiptIcon sx={{ fontSize: 40 }} color="warning" />
                                <Box>
                                    <Typography variant="h5">${pendingExpenses.toFixed(2)}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Pending Approval
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <ReceiptIcon sx={{ fontSize: 40 }} color="success" />
                                <Box>
                                    <Typography variant="h5">{expenses.length}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Total Submissions
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Expenses Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Category</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell align="right">Amount</TableCell>
                            <TableCell>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {expenses.map((expense) => (
                            <TableRow key={expense.id}>
                                <TableCell>
                                    {new Date(expense.date).toLocaleDateString()}
                                </TableCell>
                                <TableCell>{expense.category}</TableCell>
                                <TableCell>{expense.description}</TableCell>
                                <TableCell align="right">
                                    ${expense.amount.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={expense.status}
                                        size="small"
                                        color={
                                            expense.status === 'APPROVED' ? 'success' :
                                            expense.status === 'PENDING' ? 'warning' : 'error'
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Submit Expense Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Submit New Expense</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="Date"
                            type="date"
                            fullWidth
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Category</InputLabel>
                            <Select
                                value={formData.category}
                                label="Category"
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                <MenuItem value="Travel">Travel</MenuItem>
                                <MenuItem value="Meals">Meals</MenuItem>
                                <MenuItem value="Office Supplies">Office Supplies</MenuItem>
                                <MenuItem value="Equipment">Equipment</MenuItem>
                                <MenuItem value="Other">Other</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="Description"
                            fullWidth
                            multiline
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                        <TextField
                            label="Amount"
                            type="number"
                            fullWidth
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            InputProps={{
                                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
                            }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ExpensesPage;
