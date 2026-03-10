import apiClient from '../apiClient';
import { Role, CreateRoleRequest, UpdateRoleRequest } from '../../types/role';

const BASE_URL = '/roles';

export const roleService = {
    getRoles: async (): Promise<Role[]> => {
        const response = await apiClient.get<{ data: Role[] }>(BASE_URL);
        return response.data.data;
    },

    getRole: async (id: string): Promise<Role> => {
        const response = await apiClient.get<{ data: Role }>(`${BASE_URL}/${id}`);
        return response.data.data;
    },

    createRole: async (data: CreateRoleRequest): Promise<Role> => {
        const response = await apiClient.post<{ data: Role }>(BASE_URL, data);
        return response.data.data;
    },

    updateRole: async (id: string, data: UpdateRoleRequest): Promise<Role> => {
        const response = await apiClient.put<{ data: Role }>(`${BASE_URL}/${id}`, data);
        return response.data.data;
    },

    deleteRole: async (id: string): Promise<void> => {
        await apiClient.delete(`${BASE_URL}/${id}`);
    },

    assignRole: async (userId: string, roleId: string): Promise<void> => {
        await apiClient.post(`${BASE_URL}/assign`, { userId, roleId });
    },

    initializeRoles: async (): Promise<void> => {
        await apiClient.post(`${BASE_URL}/initialize`);
    },
};
