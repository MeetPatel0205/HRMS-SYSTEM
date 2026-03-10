import apiClient from '../apiClient';

export const surveysApi = {
  getAll: async (params?: any) => {
    const response = await apiClient.get('/surveys', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/surveys/${id}`);
    return response.data;
  },

  getActiveForUser: async (userId: string) => {
    const response = await apiClient.get(`/surveys/user/${userId}/active`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post('/surveys', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/surveys/${id}`, data);
    return response.data;
  },

  submitResponse: async (id: string, data: any) => {
    const response = await apiClient.post(`/surveys/${id}/responses`, data);
    return response.data;
  },

  getResponses: async (id: string) => {
    const response = await apiClient.get(`/surveys/${id}/responses`);
    return response.data;
  },

  getStats: async (id: string) => {
    const response = await apiClient.get(`/surveys/${id}/stats`);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/surveys/${id}`);
    return response.data;
  },
};
