import apiClient from './apiClient';

export interface TimeEntry {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  duration?: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
}

export interface LeaveType {
  id: string;
  name: string;
  maxDays: number;
}

export interface PayStub {
  id: string;
  employeeId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  grossPay: number;
  netPay: number;
  deductions: any;
  taxWithholding: number;
  status: string;
}

export const HRService = {
  // Time Attendance
  clockIn: async (employeeId: string) => {
    const response = await apiClient.post('/time/clock-in', { employeeId });
    return response.data;
  },

  clockOut: async (employeeId: string) => {
    const response = await apiClient.post('/time/clock-out', { employeeId });
    return response.data;
  },

  getTimesheet: async (employeeId: string, startDate: string, endDate: string) => {
    const response = await apiClient.get(`/time/timesheet/${employeeId}`, {
      params: { startDate, endDate },
    });
    return response.data;
  },

  // Leave Management
  getLeaveBalance: async () => {
    const response = await apiClient.get('/leave/balance');
    return response.data;
  },

  getLeaveTypes: async () => {
    const response = await apiClient.get('/leave/types');
    return response.data;
  },

  requestLeave: async (leave: Partial<LeaveRequest>) => {
    const response = await apiClient.post('/leave/requests', leave);
    return response.data;
  },

  getLeaveRequests: async () => {
    const response = await apiClient.get('/leave/requests');
    return response.data;
  },

  approveLeave: async (leaveId: string) => {
    const response = await apiClient.post(`/leave/requests/${leaveId}/approve`);
    return response.data;
  },

  // Payroll
  getPayStubs: async () => {
    const response = await apiClient.get('/payroll/history');
    return response.data;
  },

  processPayroll: async () => {
    const response = await apiClient.post('/payroll/process');
    return response.data;
  },

  // Performance
  getPerformanceReviews: async (employeeId: string) => {
    const response = await apiClient.get(`/performance/reviews/${employeeId}`);
    return response.data;
  },

  submitPerformanceReview: async (review: any) => {
    const response = await apiClient.post('/performance/reviews', review);
    return response.data;
  },

  // Benefits
  getBenefits: async (employeeId: string) => {
    const response = await apiClient.get(`/benefits/${employeeId}`);
    return response.data;
  },

  enrollBenefit: async (employeeId: string, benefitId: string) => {
    const response = await apiClient.post('/benefits/enroll', { employeeId, benefitId });
    return response.data;
  },

  // Learning
  getAvailableCourses: async () => {
    const response = await apiClient.get('/learning/courses');
    return response.data;
  },

  enrollCourse: async (employeeId: string, courseId: string) => {
    const response = await apiClient.post('/learning/courses/enroll', {
      employeeId,
      courseId,
    });
    return response.data;
  },

  // Recruitment
  getJobPostings: async () => {
    const response = await apiClient.get('/recruitment/job-postings');
    return response.data;
  },

  getApplications: async (employeeId: string) => {
    const response = await apiClient.get(`/recruitment/applications/${employeeId}`);
    return response.data;
  },

  // Wellness
  getWellnessPrograms: async () => {
    const response = await apiClient.get('/wellness/programs');
    return response.data;
  },

  enrollWellnessProgram: async (employeeId: string, programId: string) => {
    const response = await apiClient.post('/wellness/enroll', {
      employeeId,
      programId,
    });
    return response.data;
  },
};
