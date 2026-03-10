import apiClient from '../apiClient';
import { ExitRequest, AssetReturn } from '../../types/offboarding';

export const offboardingService = {
    // Employee
    createRequest: async (data: any): Promise<ExitRequest> => {
        const response = await apiClient.post<{ data: ExitRequest }>('/offboarding/requests', data);
        return response.data.data;
    },

    getMyRequests: async (): Promise<ExitRequest[]> => {
        const response = await apiClient.get<{ data: ExitRequest[] }>('/offboarding/my-requests');
        return response.data.data;
    },

    // Admin
    getAllRequests: async (employeeId?: string): Promise<ExitRequest[]> => {
        const query = employeeId ? `?employeeId=${employeeId}&isAdmin=true` : '?isAdmin=true';
        const response = await apiClient.get<{ data: ExitRequest[] }>(`/offboarding/requests${query}`);
        return response.data.data;
    },

    updateRequest: async (id: string, data: any): Promise<ExitRequest> => {
        const response = await apiClient.put<{ data: ExitRequest }>(`/offboarding/requests/${id}`, data);
        return response.data.data;
    },

    addAsset: async (requestId: string, data: any): Promise<AssetReturn> => {
        const response = await apiClient.post<{ data: AssetReturn }>(`/offboarding/requests/${requestId}/assets`, data);
        return response.data.data;
    },

    updateAsset: async (assetId: string, data: any): Promise<AssetReturn> => {
        const response = await apiClient.put<{ data: AssetReturn }>(`/offboarding/assets/${assetId}`, data);
        return response.data.data;
    }
};
