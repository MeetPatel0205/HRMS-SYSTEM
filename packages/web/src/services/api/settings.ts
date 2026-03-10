import apiClient from '../apiClient';

export const settingsApi = {
  getAll: async (params?: any) => {
    const response = await apiClient.get('/settings', { params });
    return response.data;
  },

  getByKey: async (key: string, params?: any) => {
    const response = await apiClient.get(`/settings/key/${key}`, { params });
    return response.data;
  },

  getByCategory: async (category: string, params?: any) => {
    const response = await apiClient.get(`/settings/category/${category}`, { params });
    return response.data;
  },

  getPublic: async () => {
    const response = await apiClient.get('/settings/public');
    return response.data;
  },

  upsert: async (data: any) => {
    const response = await apiClient.post('/settings', data);
    return response.data;
  },

  update: async (key: string, data: any) => {
    const response = await apiClient.put(`/settings/${key}`, data);
    return response.data;
  },

  delete: async (key: string) => {
    const response = await apiClient.delete(`/settings/${key}`);
    return response.data;
  },
};
