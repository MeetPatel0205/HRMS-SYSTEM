import apiClient from '../apiClient';

export const schedulesApi = {
  getAll: async (params?: any) => {
    const response = await apiClient.get('/schedules', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/schedules/${id}`);
    return response.data;
  },

  getByEmployee: async (employeeId: string, params?: any) => {
    const response = await apiClient.get(`/schedules/employee/${employeeId}`, { params });
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post('/schedules', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/schedules/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/schedules/${id}`);
    return response.data;
  },
  getSchedules: async (params?: any) => schedulesApi.getAll(params),
};
