import apiClient from '../apiClient';
import { WellnessProgram, WellnessEnrollment } from '../../types/wellness';

export const wellnessService = {
    // Programs
    getPrograms: async (activeOnly: boolean = true): Promise<WellnessProgram[]> => {
        const response = await apiClient.get<{ data: WellnessProgram[] }>(`/wellness/programs?active=${activeOnly}`);
        return response.data.data;
    },

    getProgram: async (id: string): Promise<WellnessProgram> => {
        const response = await apiClient.get<{ data: WellnessProgram }>(`/wellness/programs/${id}`);
        return response.data.data;
    },

    createProgram: async (data: any): Promise<WellnessProgram> => {
        const response = await apiClient.post<{ data: WellnessProgram }>('/wellness/programs', data);
        return response.data.data;
    },

    updateProgram: async (id: string, data: any): Promise<WellnessProgram> => {
        const response = await apiClient.put<{ data: WellnessProgram }>(`/wellness/programs/${id}`, data);
        return response.data.data;
    },

    // Enrollments
    getMyEnrollments: async (): Promise<WellnessEnrollment[]> => {
        const response = await apiClient.get<{ data: WellnessEnrollment[] }>('/wellness/my-enrollments');
        return response.data.data;
    },

    enroll: async (programId: string): Promise<WellnessEnrollment> => {
        const response = await apiClient.post<{ data: WellnessEnrollment }>('/wellness/enroll', { programId });
        return response.data.data;
    },

    updateProgress: async (enrollmentId: string, data: any): Promise<WellnessEnrollment> => {
        const response = await apiClient.put<{ data: WellnessEnrollment }>(`/wellness/enrollments/${enrollmentId}`, data);
        return response.data.data;
    }
};
