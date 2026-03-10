import apiClient from '../apiClient';

export const activitiesApi = {
  getByUser: async (userId: string, params?: any) => {
    const response = await apiClient.get(`/activities/user/${userId}`, { params });
    return response.data;
  },

  getByTenant: async (tenantId: string, params?: any) => {
    const response = await apiClient.get(`/activities/tenant/${tenantId}`, { params });
    return response.data;
  },

  getByEntity: async (entityType: string, entityId: string, params?: any) => {
    const response = await apiClient.get(`/activities/entity/${entityType}/${entityId}`, { params });
    return response.data;
  },
};
