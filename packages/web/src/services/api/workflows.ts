import apiClient from '../apiClient';

export const workflowsApi = {
  getAll: async (params?: any) => {
    const response = await apiClient.get('/workflows', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/workflows/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post('/workflows', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/workflows/${id}`, data);
    return response.data;
  },

  start: async (id: string, data: any) => {
    const response = await apiClient.post(`/workflows/${id}/start`, data);
    return response.data;
  },

  getInstances: async (id: string, params?: any) => {
    const response = await apiClient.get(`/workflows/${id}/instances`, { params });
    return response.data;
  },

  approveStep: async (instanceId: string, data: any) => {
    const response = await apiClient.post(`/workflows/instances/${instanceId}/approve`, data);
    return response.data;
  },

  rejectStep: async (instanceId: string, data: any) => {
    const response = await apiClient.post(`/workflows/instances/${instanceId}/reject`, data);
    return response.data;
  },

  getStats: async (id: string) => {
    const response = await apiClient.get(`/workflows/${id}/stats`);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/workflows/${id}`);
    return response.data;
  },
};
