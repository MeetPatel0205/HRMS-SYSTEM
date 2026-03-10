import apiClient from '../apiClient';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate: string;
  endDate?: string;
  budget?: number;
  tenantId: string;
  managerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignedTo?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export const projectsApi = {
  getAll: async (params?: any) => {
    const response = await apiClient.get('/projects', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/projects/${id}`);
    return response.data;
  },

  create: async (data: Partial<Project>) => {
    const response = await apiClient.post('/projects', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Project>) => {
    const response = await apiClient.put(`/projects/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/projects/${id}`);
    return response.data;
  },

  createTask: async (projectId: string, data: Partial<Task>) => {
    const response = await apiClient.post(`/projects/${projectId}/tasks`, data);
    return response.data;
  },

  updateTask: async (projectId: string, taskId: string, data: Partial<Task>) => {
    const response = await apiClient.put(`/projects/${projectId}/tasks/${taskId}`, data);
    return response.data;
  },

  deleteTask: async (projectId: string, taskId: string) => {
    const response = await apiClient.delete(`/projects/${projectId}/tasks/${taskId}`);
    return response.data;
  },

  getStats: async (projectId: string) => {
    const response = await apiClient.get(`/projects/${projectId}/stats`);
    return response.data;
  },
  getProjects: async (params?: any) => projectsApi.getAll(params),
};
