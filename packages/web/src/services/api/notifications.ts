import apiClient from '../apiClient';

export const notificationsApi = {
  getByUser: async (userId: string, params?: any) => {
    const response = await apiClient.get(`/notifications/user/${userId}`, { params });
    return response.data;
  },

  getUnreadCount: async (userId: string) => {
    const response = await apiClient.get(`/notifications/user/${userId}/unread-count`);
    return response.data;
  },

  markAsRead: async (id: string) => {
    const response = await apiClient.put(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async (userId: string) => {
    const response = await apiClient.put(`/notifications/user/${userId}/read-all`);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/notifications/${id}`);
    return response.data;
  },
  getAll: async (params?: any) => {
    const response = await apiClient.get('/notifications', { params });
    return response.data;
  },
  getNotifications: async () => notificationsApi.getAll(),
};
