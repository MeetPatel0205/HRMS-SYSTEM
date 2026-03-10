import React, { useState } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Button,
    Grid,
    TextField,
    Alert,
    CircularProgress
} from '@mui/material';
import { payrollService } from '../../services/api/payroll';

export const PayrollProcessing: React.FC = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleProcess = async () => {
        if (!startDate || !endDate) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const data = await payrollService.processPayroll(new Date(startDate), new Date(endDate));
            setResult(data);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to process payroll');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Run Payroll
                </Typography>

                <Grid container spacing={3} alignItems="flex-end">
                    <Grid item xs={12} md={4}>
                        <TextField
                            label="Period Start"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            label="Period End"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            onClick={handleProcess}
                            disabled={loading || !startDate || !endDate}
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                        >
                            {loading ? 'Processing...' : 'Run Payroll'}
                        </Button>
                    </Grid>
                </Grid>

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}

                {result && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                        Successfully processed {result.processed?.length} entries.
                        {result.errors?.length > 0 && (
                            <div>
                                <br />
                                <strong>Errors:</strong> {result.errors.length}
                                <ul>
                                    {result.errors.map((e: any, i: number) => (
                                        <li key={i}>{e.name}: {e.error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
};
