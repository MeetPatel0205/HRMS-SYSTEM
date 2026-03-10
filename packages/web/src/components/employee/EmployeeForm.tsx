import React, { useState, useEffect } from 'react';
import {
    Box,
    TextField,
    Grid,
    Button,
    Tabs,
    Tab,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
    Divider,
} from '@mui/material';
import { EmployeeService, Employee, PersonalInfo, ContactInfo, EmploymentInfo } from '../../services/employeeService';

interface EmployeeFormProps {
    initialData?: Partial<Employee>;
    onSubmit: (data: any) => void;
    onCancel: () => void;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`employee-tabpanel-${index}`}
            aria-labelledby={`employee-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

export const EmployeeForm: React.FC<EmployeeFormProps> = ({ initialData, onSubmit, onCancel }) => {
    const [tabValue, setTabValue] = useState(0);

    // Initialize state with default values or provided data
    const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
        firstName: '',
        lastName: '',
        middleName: '',
        dateOfBirth: '',
        gender: '',
        maritalStatus: '',
        nationality: '',
        ssn: '',
        ...initialData?.personalInfo,
    });

    const [contactInfo, setContactInfo] = useState<ContactInfo>({
        email: '',
        phone: '',
        address: {
            street: '',
            city: '',
            state: '',
            zip: '',
            country: ''
        },
        emergencyContacts: [],
        ...initialData?.contactInfo,
    });

    const [employmentInfo, setEmploymentInfo] = useState<EmploymentInfo>({
        hireDate: '',
        terminationDate: '',
        employmentType: 'full_time',
        status: 'active',
        jobTitle: '',
        department: '',
        location: '',
        managerId: '',
        salaryInfo: {
            baseSalary: 0,
            currency: 'USD',
            frequency: 'annual'
        },
        ...initialData?.employmentInfo,
    });

    const [customFields, setCustomFields] = useState<any>(initialData?.customFields || {});
    const [managers, setManagers] = useState<Employee[]>([]);

    useEffect(() => {
        const fetchManagers = async () => {
            try {
                const response = await EmployeeService.getAll();
                setManagers(response.data.data || []);
            } catch (error) {
                console.error('Failed to load managers', error);
            }
        };
        fetchManagers();
    }, []);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const employeeData = {
            personalInfo,
            contactInfo,
            employmentInfo,
            customFields,
        };
        onSubmit(employeeData);
    };

    // Generic change handlers
    const handlePersonalChange = (prop: keyof PersonalInfo) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setPersonalInfo({ ...personalInfo, [prop]: event.target.value });
    };

    const handleContactChange = (prop: keyof ContactInfo) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setContactInfo({ ...contactInfo, [prop]: event.target.value });
    };

    // Initial address might be a string or object from API, ensure it's an object for the form
    const address = typeof contactInfo.address === 'string'
        ? { street: contactInfo.address, city: '', state: '', zip: '', country: '' }
        : (contactInfo.address || { street: '', city: '', state: '', zip: '', country: '' });

    const handleAddressChange = (prop: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setContactInfo({
            ...contactInfo,
            address: { ...address, [prop]: event.target.value }
        });
    };

    const handleEmploymentChange = (prop: keyof EmploymentInfo) => (event: any) => { // any for select
        setEmploymentInfo({ ...employmentInfo, [prop]: event.target.value });
    };

    const handleSalaryChange = (prop: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setEmploymentInfo({
            ...employmentInfo,
            salaryInfo: { ...employmentInfo.salaryInfo, [prop]: event.target.value }
        });
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="employee form tabs">
                    <Tab label="Personal Info" />
                    <Tab label="Contact Info" />
                    <Tab label="Employment" />
                    <Tab label="Review" />
                </Tabs>
            </Box>

            {/* Tab 1: Personal Info */}
            <TabPanel value={tabValue} index={0}>
                <Grid container spacing={3}>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="First Name" value={personalInfo.firstName} onChange={handlePersonalChange('firstName')} required />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Middle Name" value={personalInfo.middleName} onChange={handlePersonalChange('middleName')} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Last Name" value={personalInfo.lastName} onChange={handlePersonalChange('lastName')} required />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth type="date" label="Date of Birth" value={personalInfo.dateOfBirth ? new Date(personalInfo.dateOfBirth).toISOString().split('T')[0] : ''} onChange={handlePersonalChange('dateOfBirth')} InputLabelProps={{ shrink: true }} required />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel>Gender</InputLabel>
                            <Select value={personalInfo.gender} label="Gender" onChange={handlePersonalChange('gender') as any}>
                                <MenuItem value="male">Male</MenuItem>
                                <MenuItem value="female">Female</MenuItem>
                                <MenuItem value="other">Other</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel>Marital Status</InputLabel>
                            <Select value={personalInfo.maritalStatus} label="Marital Status" onChange={handlePersonalChange('maritalStatus') as any}>
                                <MenuItem value="single">Single</MenuItem>
                                <MenuItem value="married">Married</MenuItem>
                                <MenuItem value="divorced">Divorced</MenuItem>
                                <MenuItem value="widowed">Widowed</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Nationality" value={personalInfo.nationality} onChange={handlePersonalChange('nationality')} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="SSN / ID Number" value={personalInfo.ssn} onChange={handlePersonalChange('ssn')} />
                    </Grid>
                </Grid>
            </TabPanel>

            {/* Tab 2: Contact Info */}
            <TabPanel value={tabValue} index={1}>
                <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth type="email" label="Email" value={contactInfo.email} onChange={handleContactChange('email')} required />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Phone" value={contactInfo.phone} onChange={handleContactChange('phone')} required />
                    </Grid>

                    <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Address</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField fullWidth label="Street Address" value={address.street} onChange={handleAddressChange('street')} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="City" value={address.city} onChange={handleAddressChange('city')} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="State / Province" value={address.state} onChange={handleAddressChange('state')} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Zip / Postal Code" value={address.zip} onChange={handleAddressChange('zip')} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Country" value={address.country} onChange={handleAddressChange('country')} />
                    </Grid>
                </Grid>
            </TabPanel>

            {/* Tab 3: Employment */}
            <TabPanel value={tabValue} index={2}>
                <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Job Title" value={employmentInfo.jobTitle} onChange={handleEmploymentChange('jobTitle')} required />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Department" value={employmentInfo.department} onChange={handleEmploymentChange('department')} required />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel>Employment Type</InputLabel>
                            <Select value={employmentInfo.employmentType} label="Employment Type" onChange={handleEmploymentChange('employmentType') as any}>
                                <MenuItem value="full_time">Full Time</MenuItem>
                                <MenuItem value="part_time">Part Time</MenuItem>
                                <MenuItem value="contract">Contract</MenuItem>
                                <MenuItem value="intern">Intern</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select value={employmentInfo.status} label="Status" onChange={handleEmploymentChange('status') as any}>
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="on_leave">On Leave</MenuItem>
                                <MenuItem value="terminated">Terminated</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth type="date" label="Hire Date" value={employmentInfo.hireDate ? new Date(employmentInfo.hireDate).toISOString().split('T')[0] : ''} onChange={handleEmploymentChange('hireDate')} InputLabelProps={{ shrink: true }} required />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Location" value={employmentInfo.location} onChange={handleEmploymentChange('location')} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel>Reporting Manager</InputLabel>
                            <Select
                                value={employmentInfo.managerId || ''}
                                label="Reporting Manager"
                                onChange={handleEmploymentChange('managerId') as any}
                            >
                                <MenuItem value=""><em>None</em></MenuItem>
                                {managers.map((mgr) => (
                                    <MenuItem key={mgr.id} value={mgr.id}>
                                        {mgr.personalInfo.firstName} {mgr.personalInfo.lastName}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6" gutterBottom>Compensation</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth type="number" label="Base Salary" value={employmentInfo.salaryInfo?.baseSalary} onChange={handleSalaryChange('baseSalary')} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Currency" value={employmentInfo.salaryInfo?.currency} onChange={handleSalaryChange('currency')} />
                    </Grid>
                </Grid>
            </TabPanel>

            {/* Tab 4: Review (Simple summary for now) */}
            <TabPanel value={tabValue} index={3}>
                <Typography variant="h6">Review Information</Typography>
                <Typography variant="body1">Please review the information in the previous tabs before submitting.</Typography>
                <Box sx={{ mt: 2 }}>
                    <Typography><strong>Name:</strong> {personalInfo.firstName} {personalInfo.lastName}</Typography>
                    <Typography><strong>Email:</strong> {contactInfo.email}</Typography>
                    <Typography><strong>Job:</strong> {employmentInfo.jobTitle} at {employmentInfo.department}</Typography>
                </Box>
            </TabPanel>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
                <Button variant="outlined" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" variant="contained" color="primary">
                    Save Employee
                </Button>
            </Box>
        </Box>
    );
};
