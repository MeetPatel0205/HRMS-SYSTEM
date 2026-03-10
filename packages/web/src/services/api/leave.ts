import apiClient from '../../services/apiClient';
import { LeaveBalance, LeaveRequest, CreateLeaveRequest, LeaveType } from '../../types/leave';

const BASE_URL = '/leave';

export const leaveService = {
    getBalances: async (): Promise<LeaveBalance[]> => {
        const response = await apiClient.get<{ data: Record<string, LeaveBalance> | LeaveBalance[] }>(`${BASE_URL}/balance`);

        // Handle potential different response structures (Object vs Array)
        // Backend currently returns Record<string, LeaveBalance> in 'data'
        // But Controller might wrap it in 'success: true, data: ...'
        // Let's assume standard ApiResponse wrapper from apiClient

        const data = response.data.data;
        if (Array.isArray(data)) return data;
        return Object.values(data);
    },

    getRequests: async (): Promise<LeaveRequest[]> => {
        const response = await apiClient.get<{ data: LeaveRequest[] }>(`${BASE_URL}/requests`);
        return response.data.data;
    },

    getAllRequests: async (): Promise<LeaveRequest[]> => {
        const response = await apiClient.get<{ data: LeaveRequest[] }>(`${BASE_URL}/requests/all`);
        return response.data.data;
    },

    getLeaveTypes: async (): Promise<LeaveType[]> => {
        const response = await apiClient.get<{ data: LeaveType[] }>(`${BASE_URL}/types`);
        return response.data.data;
    },

    submitRequest: async (request: CreateLeaveRequest): Promise<LeaveRequest> => {
        const response = await apiClient.post<{ data: LeaveRequest }>(`${BASE_URL}/requests`, request);
        return response.data.data;
    },

    approveRequest: async (requestId: string): Promise<LeaveRequest> => {
        const response = await apiClient.post<{ data: LeaveRequest }>(`${BASE_URL}/requests/${requestId}/approve`);
        return response.data.data;
    },

    rejectRequest: async (requestId: string, reason: string): Promise<LeaveRequest> => {
        const response = await apiClient.post<{ data: LeaveRequest }>(`${BASE_URL}/requests/${requestId}/reject`, { reason });
        return response.data.data;
    }
};
