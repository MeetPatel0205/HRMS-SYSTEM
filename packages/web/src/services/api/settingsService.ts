import apiClient from '../apiClient';

export interface SystemSetting {
    id: string;
    key: string;
    value: any;
    category: string;
    description?: string;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateSettingRequest {
    key: string;
    value: any;
    category: string;
    description?: string;
    isPublic?: boolean;
}

const BASE_URL = '/settings';

export const settingsService = {
    getAllSettings: async (category?: string): Promise<SystemSetting[]> => {
        const params = category ? { category } : {};
        const response = await apiClient.get<{ data: SystemSetting[] }>(BASE_URL, { params });
        return response.data.data || response.data as any;
    },

    getSettingByKey: async (key: string): Promise<SystemSetting> => {
        const response = await apiClient.get<{ data: SystemSetting }>(`${BASE_URL}/key/${key}`);
        return response.data.data || response.data as any;
    },

    getSettingsByCategory: async (category: string): Promise<SystemSetting[]> => {
        const response = await apiClient.get<{ data: SystemSetting[] }>(`${BASE_URL}/category/${category}`);
        return response.data.data || response.data as any;
    },

    updateSetting: async (key: string, value: any): Promise<SystemSetting> => {
        const response = await apiClient.put<{ data: SystemSetting }>(`${BASE_URL}/${key}`, { value });
        return response.data.data || response.data as any;
    },

    createSetting: async (data: CreateSettingRequest): Promise<SystemSetting> => {
        const response = await apiClient.post<{ data: SystemSetting }>(BASE_URL, data);
        return response.data.data || response.data as any;
    },

    deleteSetting: async (key: string): Promise<void> => {
        await apiClient.delete(`${BASE_URL}/${key}`);
    },
};
