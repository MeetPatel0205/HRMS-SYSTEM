import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Tab, Tabs } from '@mui/material';
import { PayrollHistoryTable } from '../components/payroll/PayrollHistoryTable';
import { PayrollProcessing } from '../components/payroll/PayrollProcessing';
import { payrollService } from '../services/api/payroll';
import { PayrollEntry } from '../types/payroll';
import { useAuth } from '../hooks/useAuth';
import { Permission } from '../types/auth'; // Ensure this matches web types

const PayrollPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [tab, setTab] = useState(0);
  const [history, setHistory] = useState<PayrollEntry[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await payrollService.getHistory();
      setHistory(data);
    } catch (err) {
      console.error('Failed to load payroll history', err);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  const canProcessPayroll = hasPermission('process_payroll'); // Or check role

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Payroll
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={handleTabChange}>
          <Tab label="My Pay Stubs" />
          {canProcessPayroll && <Tab label="Process Payroll" />}
        </Tabs>
      </Box>

      {tab === 0 && (
        <PayrollHistoryTable entries={history} />
      )}

      {tab === 1 && canProcessPayroll && (
        <PayrollProcessing />
      )}
    </Container>
  );
};

export default PayrollPage;
