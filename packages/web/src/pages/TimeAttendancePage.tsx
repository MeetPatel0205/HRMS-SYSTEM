import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Alert,
  Grid,
  Paper
} from '@mui/material';
import { ClockInCard } from '../components/time/ClockInCard';
import { TimesheetTable } from '../components/time/TimesheetTable';
import { timeService } from '../services/api/time';
import { TimeEntry } from '../types/time';

const TimeAttendancePage: React.FC = () => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTimesheet();
  }, []);

  const loadTimesheet = async () => {
    try {
      // Load last 30 days by default or just all
      const data = await timeService.getTimesheet();
      setEntries(data);
    } catch (err) {
      console.error('Failed to load timesheet', err);
      setError('Failed to load timesheet history');
    }
  };

  const handleStatusChange = () => {
    loadTimesheet();
  };

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Time & Attendance
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <ClockInCard onStatusChange={handleStatusChange} />
        </Grid>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <TimesheetTable entries={entries} />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default TimeAttendancePage;
