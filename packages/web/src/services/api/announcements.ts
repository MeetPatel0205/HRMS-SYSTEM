import apiClient from '../apiClient';

export const announcementsApi = {
  getAll: async (params?: any) => {
    const response = await apiClient.get('/announcements', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/announcements/${id}`);
    return response.data;
  },

  getActiveForUser: async (userId: string) => {
    const response = await apiClient.get(`/announcements/user/${userId}/active`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post('/announcements', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/announcements/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/announcements/${id}`);
    return response.data;
  },
  getAnnouncements: async () => announcementsApi.getAll(),
};
