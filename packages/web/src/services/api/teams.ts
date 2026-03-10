import apiClient from '../apiClient';

export interface Team {
  id: string;
  name: string;
  description?: string;
  leaderId: string;
  departmentId?: string;
  tenantId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  employeeId: string;
  role: string;
  joinedAt: string;
}

export const teamsApi = {
  getAll: async (params?: any) => {
    const response = await apiClient.get('/teams', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/teams/${id}`);
    return response.data;
  },

  create: async (data: Partial<Team>) => {
    const response = await apiClient.post('/teams', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Team>) => {
    const response = await apiClient.put(`/teams/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/teams/${id}`);
    return response.data;
  },

  addMember: async (teamId: string, data: Partial<TeamMember>) => {
    const response = await apiClient.post(`/teams/${teamId}/members`, data);
    return response.data;
  },

  removeMember: async (teamId: string, memberId: string) => {
    const response = await apiClient.delete(`/teams/${teamId}/members/${memberId}`);
    return response.data;
  },

  getStats: async (teamId: string) => {
    const response = await apiClient.get(`/teams/${teamId}/stats`);
    return response.data;
  },
  getTeams: async (params?: any) => teamsApi.getAll(params),
  createTeam: async (data: Partial<Team>) => teamsApi.create(data),
  updateTeam: async (id: string, data: Partial<Team>) => teamsApi.update(id, data),
  deleteTeam: async (id: string) => teamsApi.delete(id),
};
