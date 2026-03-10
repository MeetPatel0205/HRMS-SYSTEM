import apiClient from '../apiClient';
import { Document } from '../../types/documents';

export const documentService = {
    getAll: async (category?: string): Promise<Document[]> => {
        const query = category ? `?category=${category}` : '';
        const response = await apiClient.get<{ data: Document[] }>(`/documents${query}`);
        return response.data.data;
    },

    getById: async (id: string): Promise<Document> => {
        const response = await apiClient.get<{ data: Document }>(`/documents/${id}`);
        return response.data.data;
    },

    create: async (data: any): Promise<Document> => {
        const response = await apiClient.post<{ data: Document }>('/documents', data);
        return response.data.data;
    },

    update: async (id: string, data: any): Promise<Document> => {
        const response = await apiClient.put<{ data: Document }>(`/documents/${id}`, data);
        return response.data.data;
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/documents/${id}`);
    }
};
