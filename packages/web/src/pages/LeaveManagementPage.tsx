import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { LeaveBalanceCards } from '../components/leave/LeaveBalanceCards';
import { LeaveHistory } from '../components/leave/LeaveHistory';
import { LeaveRequestForm } from '../components/leave/LeaveRequestForm';
import { leaveService } from '../services/api/leave';
import { LeaveBalance, LeaveRequest } from '../types/leave';

const LeaveManagementPage: React.FC = () => {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const fetchData = async () => {
    try {
      const [balanceData, requestData] = await Promise.all([
        leaveService.getBalances(),
        leaveService.getRequests()
      ]);
      setBalances(balanceData);
      setRequests(requestData);
    } catch (error) {
      console.error('Failed to fetch leave data:', error);
    }
  };

  const handleSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography variant="h4" gutterBottom>
            Leave Management
          </Typography>
          <Typography variant="body1" color="textSecondary">
            View balances and manage leave requests
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Request Leave
        </Button>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Leave Balances
        </Typography>
        <LeaveBalanceCards balances={balances} />
      </Box>

      <Divider sx={{ my: 4 }} />

      <Box>
        <Typography variant="h6" gutterBottom>
          Request History
        </Typography>
        <LeaveHistory requests={requests} />
      </Box>

      <LeaveRequestForm
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onSuccess={handleSuccess}
      />
    </Container>
  );
};

export default LeaveManagementPage;
