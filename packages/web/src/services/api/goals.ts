import apiClient from '../apiClient';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  employeeId: string;
  type: string;
  status: string;
  progress: number;
  startDate: string;
  endDate: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export const goalsApi = {
  getAll: async (params?: any) => {
    const response = await apiClient.get('/goals', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/goals/${id}`);
    return response.data;
  },

  getByEmployee: async (employeeId: string) => {
    const response = await apiClient.get(`/goals/employee/${employeeId}`);
    return response.data;
  },

  create: async (data: Partial<Goal>) => {
    const response = await apiClient.post('/goals', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Goal>) => {
    const response = await apiClient.put(`/goals/${id}`, data);
    return response.data;
  },

  updateProgress: async (id: string, progress: number) => {
    const response = await apiClient.put(`/goals/${id}/progress`, { progress });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/goals/${id}`);
    return response.data;
  },

  getStats: async (tenantId: string) => {
    const response = await apiClient.get(`/goals/tenant/${tenantId}/stats`);
    return response.data;
  },
  getGoals: async (params?: any) => goalsApi.getAll(params),
};
