import apiClient from '../apiClient';
import { ComplianceRequirement, EmployeeCompliance, ComplianceStats } from '../../types/compliance';

export const complianceService = {
    // Requirements (Admin)
    getRequirements: async (activeOnly: boolean = true): Promise<ComplianceRequirement[]> => {
        const response = await apiClient.get<{ data: ComplianceRequirement[] }>(`/compliance/requirements?active=${activeOnly}`);
        return response.data.data;
    },

    createRequirement: async (data: any): Promise<ComplianceRequirement> => {
        const response = await apiClient.post<{ data: ComplianceRequirement }>('/compliance/requirements', data);
        return response.data.data;
    },

    updateRequirement: async (id: string, data: any): Promise<ComplianceRequirement> => {
        const response = await apiClient.put<{ data: ComplianceRequirement }>(`/compliance/requirements/${id}`, data);
        return response.data.data;
    },

    assignRequirement: async (employeeId: string, requirementId: string, expiresAt?: string): Promise<EmployeeCompliance> => {
        const response = await apiClient.post<{ data: EmployeeCompliance }>('/compliance/assign', { employeeId, requirementId, expiresAt });
        return response.data.data;
    },

    getStats: async (): Promise<ComplianceStats> => {
        const response = await apiClient.get<{ data: ComplianceStats }>('/compliance/stats');
        return response.data.data;
    },

    // Employee Records
    getMyRecords: async (): Promise<EmployeeCompliance[]> => {
        const response = await apiClient.get<{ data: EmployeeCompliance[] }>('/compliance/my-records');
        return response.data.data;
    },

    submitProof: async (recordId: string, documentUtl: string): Promise<EmployeeCompliance> => {
        const response = await apiClient.post<{ data: EmployeeCompliance }>(`/compliance/records/${recordId}/proof`, { documentUrl: documentUtl });
        return response.data.data;
    }
};
