import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Grid,
    Card,
    CardContent,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Chip,
    IconButton
} from '@mui/material';
import {
    Assessment as AssessmentIcon,
    Download as DownloadIcon,
    Visibility as VisibilityIcon,
    PictureAsPdf as PdfIcon,
    TableChart as ExcelIcon
} from '@mui/icons-material';

interface Report {
    id: string;
    name: string;
    description: string;
    category: string;
    lastRun: string;
    format: string;
}

const ReportsPage: React.FC = () => {
    const [reports] = useState<Report[]>([
        { id: '1', name: 'Employee Headcount', description: 'Total employees by department', category: 'HR', lastRun: '2026-02-07', format: 'PDF' },
        { id: '2', name: 'Attendance Summary', description: 'Monthly attendance report', category: 'Time', lastRun: '2026-02-06', format: 'Excel' },
        { id: '3', name: 'Payroll Report', description: 'Monthly payroll summary', category: 'Finance', lastRun: '2026-02-05', format: 'PDF' },
        { id: '4', name: 'Performance Reviews', description: 'Completed performance reviews', category: 'Performance', lastRun: '2026-02-04', format: 'Excel' },
        { id: '5', name: 'Leave Balance', description: 'Employee leave balances', category: 'HR', lastRun: '2026-02-03', format: 'PDF' },
    ]);

    const categories = Array.from(new Set(reports.map(r => r.category)));

    const handleRunReport = (reportId: string) => {
        console.log('Running report:', reportId);
    };

    const handleDownload = (reportId: string) => {
        console.log('Downloading report:', reportId);
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4">Reports</Typography>
                <Typography variant="body2" color="text.secondary">
                    Generate and download various reports
                </Typography>
            </Box>

            {/* Report Categories */}
            {categories.map((category) => (
                <Box key={category} sx={{ mb: 4 }}>
                    <Typography variant="h6" gutterBottom>
                        {category} Reports
                    </Typography>
                    <Grid container spacing={2}>
                        {reports
                            .filter(r => r.category === category)
                            .map((report) => (
                                <Grid item xs={12} md={6} key={report.id}>
                                    <Card>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                                                <Box sx={{ display: 'flex', gap: 2 }}>
                                                    <AssessmentIcon color="primary" sx={{ fontSize: 40 }} />
                                                    <Box>
                                                        <Typography variant="h6">{report.name}</Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {report.description}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Chip
                                                    icon={report.format === 'PDF' ? <PdfIcon /> : <ExcelIcon />}
                                                    label={report.format}
                                                    size="small"
                                                />
                                            </Box>

                                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                                                Last run: {new Date(report.lastRun).toLocaleDateString()}
                                            </Typography>

                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Button
                                                    variant="contained"
                                                    startIcon={<VisibilityIcon />}
                                                    fullWidth
                                                    onClick={() => handleRunReport(report.id)}
                                                >
                                                    Run Report
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    startIcon={<DownloadIcon />}
                                                    fullWidth
                                                    onClick={() => handleDownload(report.id)}
                                                >
                                                    Download
                                                </Button>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                    </Grid>
                </Box>
            ))}
        </Box>
    );
};

export default ReportsPage;
