export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  jobTitle: string;
  salary: number;
  startDate: string;
  status: 'active' | 'inactive' | 'on-leave';
  reportingManagerId?: string;
  location?: string;
}

export interface EmployeeFilter {
  department?: string;
  jobTitle?: string;
  status?: string;
  location?: string;
  page?: number;
  limit?: number;
}

export interface EmployeeResponse {
  employees: Employee[];
  total: number;
}
