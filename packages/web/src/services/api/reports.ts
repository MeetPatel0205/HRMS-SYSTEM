import apiClient from '../apiClient';

export const reportsApi = {
  getAll: async (params?: any) => {
    const response = await apiClient.get('/reports', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/reports/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post('/reports', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/reports/${id}`, data);
    return response.data;
  },

  execute: async (id: string, data: any) => {
    const response = await apiClient.post(`/reports/${id}/execute`, data);
    return response.data;
  },

  getExecutions: async (id: string, params?: any) => {
    const response = await apiClient.get(`/reports/${id}/executions`, { params });
    return response.data;
  },

  getExecutionById: async (executionId: string) => {
    const response = await apiClient.get(`/reports/executions/${executionId}`);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/reports/${id}`);
    return response.data;
  },
};
