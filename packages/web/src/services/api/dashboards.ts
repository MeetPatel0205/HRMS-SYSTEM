import apiClient from '../apiClient';

export const dashboardsApi = {
  getByUser: async (userId: string) => {
    const response = await apiClient.get(`/dashboards/user/${userId}`);
    return response.data;
  },

  getDefault: async (userId: string) => {
    const response = await apiClient.get(`/dashboards/user/${userId}/default`);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/dashboards/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post('/dashboards', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/dashboards/${id}`, data);
    return response.data;
  },

  setDefault: async (id: string, userId: string) => {
    const response = await apiClient.put(`/dashboards/${id}/set-default`, { userId });
    return response.data;
  },

  clone: async (id: string, data: any) => {
    const response = await apiClient.post(`/dashboards/${id}/clone`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/dashboards/${id}`);
    return response.data;
  },
};
