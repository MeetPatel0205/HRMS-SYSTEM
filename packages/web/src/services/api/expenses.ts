import apiClient from '../apiClient';

export const expensesApi = {
  getAll: async (params?: any) => {
    const response = await apiClient.get('/expenses', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/expenses/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post('/expenses', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/expenses/${id}`, data);
    return response.data;
  },

  approve: async (id: string, data: any) => {
    const response = await apiClient.post(`/expenses/${id}/approve`, data);
    return response.data;
  },

  reject: async (id: string, data: any) => {
    const response = await apiClient.post(`/expenses/${id}/reject`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/expenses/${id}`);
    return response.data;
  },
};
