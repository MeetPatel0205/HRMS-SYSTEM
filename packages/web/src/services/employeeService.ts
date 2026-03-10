import apiClient from './apiClient';

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  ssn?: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
  address: any; // string or object
  emergencyContacts: any[];
}

export interface EmploymentInfo {
  hireDate: string;
  terminationDate?: string;
  employmentType: string;
  status: string;
  jobTitle: string;
  department: string;
  location: string;
  managerId?: string;
  salaryInfo: any;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  personalInfo: PersonalInfo;
  contactInfo: ContactInfo;
  employmentInfo: EmploymentInfo;
  customFields?: any;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
  };
  userId?: string;
  user?: any;
}

export interface SearchEmployeeParams {
  department?: string;
  jobTitle?: string;
  status?: string;
  location?: string;
  page?: number;
  limit?: number;
}

// Helper function to map API employee to UI employee
// The API now returns the structure we want, so mapping might be minimal or just passing through
const mapApiEmployeeToUI = (apiEmployee: any): Employee => {
  return {
    id: apiEmployee.id,
    employeeNumber: apiEmployee.employeeNumber,
    personalInfo: apiEmployee.personalInfo,
    contactInfo: apiEmployee.contactInfo,
    employmentInfo: apiEmployee.employmentInfo,
    customFields: apiEmployee.customFields,
    manager: apiEmployee.manager,
    userId: apiEmployee.userId,
    user: apiEmployee.user
  };
};

export const EmployeeService = {
  getAll: async (params?: SearchEmployeeParams) => {
    const response = await apiClient.get('/employees', { params });
    // Map API employees to UI format
    const apiData = response.data.data;
    return {
      ...response.data,
      data: {
        ...apiData,
        data: apiData.data.map(mapApiEmployeeToUI)
      }
    };
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/employees/${id}`);
    return {
      ...response.data,
      data: mapApiEmployeeToUI(response.data.data)
    };
  },

  create: async (employee: Partial<Employee>) => {
    const response = await apiClient.post('/employees', employee);
    return response.data;
  },

  update: async (id: string, employee: Partial<Employee>) => {
    const response = await apiClient.put(`/employees/${id}`, employee);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/employees/${id}`);
    return response.data;
  },

  search: async (params: SearchEmployeeParams) => {
    const response = await apiClient.get('/employees/search', { params });
    return response.data;
  },

  getOrgChart: async () => {
    const response = await apiClient.get('/employees/org-chart');
    return response.data;
  },

  getStatistics: async () => {
    const response = await apiClient.get('/employees/statistics');
    return response.data;
  },

  getEmployees: async (params?: SearchEmployeeParams) => EmployeeService.getAll(params),
  getEmployee: async (id: string) => EmployeeService.getById(id),
};

export const employeeService = EmployeeService;
