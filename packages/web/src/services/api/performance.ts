import apiClient from '../apiClient';
import { PerformanceReview } from '../../types/performance';

export const performanceService = {
    getMyReviews: async (): Promise<PerformanceReview[]> => {
        const response = await apiClient.get<{ data: PerformanceReview[] }>('/performance/my-reviews');
        return response.data.data;
    },

    getReviewsToConduct: async (): Promise<PerformanceReview[]> => {
        const response = await apiClient.get<{ data: PerformanceReview[] }>('/performance/to-conduct');
        return response.data.data;
    },

    getReview: async (id: string): Promise<PerformanceReview> => {
        const response = await apiClient.get<{ data: PerformanceReview }>(`/performance/${id}`);
        return response.data.data;
    },

    createReview: async (data: any): Promise<PerformanceReview> => {
        const response = await apiClient.post<{ data: PerformanceReview }>('/performance', data);
        return response.data.data;
    },

    updateReview: async (id: string, data: any): Promise<PerformanceReview> => {
        const response = await apiClient.put<{ data: PerformanceReview }>(`/performance/${id}`, data);
        return response.data.data;
    },

    submitReview: async (id: string): Promise<PerformanceReview> => {
        const response = await apiClient.post<{ data: PerformanceReview }>(`/performance/${id}/submit`);
        return response.data.data;
    },

    approveReview: async (id: string, rating: number): Promise<PerformanceReview> => {
        const response = await apiClient.post<{ data: PerformanceReview }>(`/performance/${id}/approve`, { rating });
        return response.data.data;
    }
};
