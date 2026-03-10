import apiClient from '../apiClient';
import { TrainingCourse, TrainingRecord } from '../../types/learning';

export const learningService = {
    // Courses
    getCourses: async (activeOnly: boolean = true): Promise<TrainingCourse[]> => {
        const response = await apiClient.get<{ data: TrainingCourse[] }>(`/learning/courses?active=${activeOnly}`);
        return response.data.data;
    },

    getCourse: async (id: string): Promise<TrainingCourse> => {
        const response = await apiClient.get<{ data: TrainingCourse }>(`/learning/courses/${id}`);
        return response.data.data;
    },

    createCourse: async (data: any): Promise<TrainingCourse> => {
        const response = await apiClient.post<{ data: TrainingCourse }>('/learning/courses', data);
        return response.data.data;
    },

    updateCourse: async (id: string, data: any): Promise<TrainingCourse> => {
        const response = await apiClient.put<{ data: TrainingCourse }>(`/learning/courses/${id}`, data);
        return response.data.data;
    },

    // Records
    getMyRecords: async (): Promise<TrainingRecord[]> => {
        const response = await apiClient.get<{ data: TrainingRecord[] }>('/learning/my-records');
        return response.data.data;
    },

    enroll: async (courseId: string): Promise<TrainingRecord> => {
        const response = await apiClient.post<{ data: TrainingRecord }>('/learning/enroll', { courseId });
        return response.data.data;
    },

    updateProgress: async (recordId: string, status: string, score?: number): Promise<TrainingRecord> => {
        const response = await apiClient.put<{ data: TrainingRecord }>(`/learning/records/${recordId}/progress`, { status, score });
        return response.data.data;
    }
};
