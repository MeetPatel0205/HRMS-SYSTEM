import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Container,
  Button,
  Box,
  TextField,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  Chip,
} from '@mui/material';
import { EmployeeService, Employee } from '../services/employeeService';
import { EmployeeForm } from '../components/employee/EmployeeForm';
import { setEmployees, setLoading } from '../store/employeeSlice';
import { RootState, AppDispatch } from '../store/index';
import { usePermission } from '../hooks/usePermission';

const EmployeeListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { employees, loading } = useSelector((state: RootState) => state.employees);
  const [search, setSearch] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);

  const { hasPermission } = usePermission();
  const canManageEmployees = hasPermission('write_employee');

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEmployees = async () => {
    dispatch(setLoading(true));
    try {
      const response = await EmployeeService.getAll();
      dispatch(setEmployees(response.data.data || []));
    } catch (error) {
      console.error('Failed to load employees:', error);
      dispatch(setEmployees([]));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleAddEmployee = () => {
    setSelectedEmployee(undefined);
    setIsEditing(false); // Mode: Create
    setOpenDialog(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEditing(true); // Mode: Edit
    setOpenDialog(true);
  };

  const handleSubmit = async (employeeData: any) => {
    try {
      if (isEditing && selectedEmployee) {
        await EmployeeService.update(selectedEmployee.id, employeeData);
      } else {
        await EmployeeService.create(employeeData);
      }
      setOpenDialog(false);
      loadEmployees();
    } catch (error) {
      console.error('Failed to save employee:', error);
      // TODO: Show error notification
    }
  };

  const filteredEmployees = (employees || []).filter(
    (emp) =>
      emp.personalInfo.firstName.toLowerCase().includes(search.toLowerCase()) ||
      emp.personalInfo.lastName.toLowerCase().includes(search.toLowerCase()) ||
      emp.contactInfo.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
        <TextField
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: '300px' }}
        />
        {canManageEmployees && (
          <Button variant="contained" color="primary" onClick={handleAddEmployee}>
            Add Employee
          </Button>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Employee ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Job Title</TableCell>
                <TableCell>Status</TableCell>
                {canManageEmployees && <TableCell>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEmployees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell>{emp.employeeNumber}</TableCell>
                  <TableCell>
                    {emp.personalInfo.firstName} {emp.personalInfo.lastName}
                  </TableCell>
                  <TableCell>{emp.contactInfo.email}</TableCell>
                  <TableCell>{emp.employmentInfo.department}</TableCell>
                  <TableCell>{emp.employmentInfo.jobTitle}</TableCell>
                  <TableCell>
                    <Chip
                      label={emp.employmentInfo.status}
                      color={emp.employmentInfo.status === 'active' ? 'success' : 'default'}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  {canManageEmployees && (
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleEditEmployee(emp)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Employee Form Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{isEditing ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <EmployeeForm
              initialData={selectedEmployee}
              onSubmit={handleSubmit}
              onCancel={() => setOpenDialog(false)}
            />
          </Box>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default EmployeeListPage;
