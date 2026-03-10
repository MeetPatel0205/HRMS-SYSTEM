import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Snackbar,
    Alert,
} from '@mui/material';
import { X } from 'lucide-react';
import { EmployeeForm } from './EmployeeForm';
import { EmployeeService } from '../../services/employeeService';

interface AddEmployeeDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const AddEmployeeDialog: React.FC<AddEmployeeDialogProps> = ({
    open,
    onClose,
    onSuccess,
}) => {
    const [submitting, setSubmitting] = useState(false);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({ open: false, message: '', severity: 'success' });

    const handleSubmit = async (data: any) => {
        try {
            setSubmitting(true);

            // Clean up optional fields - remove empty strings that would fail validation
            const cleanOptional = (val: string | undefined) =>
                val && val.trim() !== '' ? val : undefined;

            // Build the address, mapping 'zip' to 'zipCode' for the backend schema
            const rawAddress = data.contactInfo.address || {};
            const address = {
                street: rawAddress.street || '',
                city: rawAddress.city || '',
                state: rawAddress.state || '',
                zipCode: rawAddress.zipCode || rawAddress.zip || '',
                country: rawAddress.country || 'US',
            };

            // Build salary info, mapping 'frequency' to 'payFrequency'
            const rawSalary = data.employmentInfo.salaryInfo || {};
            // Normalize frequency values: form uses 'annual' but backend expects 'annually'
            const freqMap: Record<string, string> = { annual: 'annually', yearly: 'annually' };
            const rawFreq = rawSalary.payFrequency || rawSalary.frequency || 'monthly';
            const salaryInfo = {
                baseSalary: Number(rawSalary.baseSalary) || 50000,
                currency: rawSalary.currency || 'USD',
                payFrequency: freqMap[rawFreq] || rawFreq,
                effectiveDate: new Date().toISOString(),
            };

            // Build personal info — strip empty optional fields
            const personalInfo: any = {
                firstName: data.personalInfo.firstName,
                lastName: data.personalInfo.lastName,
                dateOfBirth: data.personalInfo.dateOfBirth
                    ? new Date(data.personalInfo.dateOfBirth).toISOString()
                    : new Date('1990-01-01').toISOString(),
            };
            if (cleanOptional(data.personalInfo.middleName))
                personalInfo.middleName = data.personalInfo.middleName;
            if (cleanOptional(data.personalInfo.gender))
                personalInfo.gender = data.personalInfo.gender;
            if (cleanOptional(data.personalInfo.maritalStatus))
                personalInfo.maritalStatus = data.personalInfo.maritalStatus;
            if (cleanOptional(data.personalInfo.nationality))
                personalInfo.nationality = data.personalInfo.nationality;
            if (cleanOptional(data.personalInfo.ssn))
                personalInfo.ssn = data.personalInfo.ssn;

            // Build employment info — strip empty managerId
            const employmentInfo: any = {
                jobTitle: data.employmentInfo.jobTitle || 'Employee',
                department: data.employmentInfo.department || 'General',
                location: data.employmentInfo.location || 'Main Office',
                employmentType: data.employmentInfo.employmentType || 'full_time',
                status: data.employmentInfo.status || 'active',
                hireDate: data.employmentInfo.hireDate
                    ? new Date(data.employmentInfo.hireDate).toISOString()
                    : new Date().toISOString(),
                salaryInfo,
            };
            if (cleanOptional(data.employmentInfo.managerId))
                employmentInfo.managerId = data.employmentInfo.managerId;

            const payload = {
                personalInfo,
                contactInfo: {
                    email: data.contactInfo.email,
                    phone: data.contactInfo.phone || '+1-000-000-0000',
                    address,
                    emergencyContacts: data.contactInfo.emergencyContacts || [],
                },
                employmentInfo,
                customFields: data.customFields || {},
            };

            console.log('Submitting employee payload:', JSON.stringify(payload, null, 2));

            await EmployeeService.create(payload);

            setSnackbar({
                open: true,
                message: 'Employee created successfully!',
                severity: 'success',
            });

            // Close dialog and refresh dashboard data
            setTimeout(() => {
                onClose();
                onSuccess();
            }, 1000);
        } catch (error: any) {
            console.error('Error creating employee:', error);
            const errorMessage =
                error?.response?.data?.error?.message ||
                error?.response?.data?.message ||
                error?.message ||
                'Failed to create employee. Please try again.';

            // Log the full error details for debugging
            if (error?.response?.data) {
                console.error('Validation details:', JSON.stringify(error.response.data, null, 2));
            }

            setSnackbar({
                open: true,
                message: errorMessage,
                severity: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        onClose();
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        maxHeight: '90vh',
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        pb: 2,
                    }}
                >
                    Add New Employee
                    <IconButton onClick={onClose} size="small">
                        <X className="h-4 w-4" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <EmployeeForm onSubmit={handleSubmit} onCancel={handleCancel} />
                </DialogContent>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};
