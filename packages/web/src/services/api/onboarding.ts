import apiClient from '../apiClient';
import { OnboardingChecklist } from '../../types/onboarding';

export const onboardingService = {
    getMyChecklist: async (): Promise<OnboardingChecklist | null> => {
        try {
            const response = await apiClient.get<{ data: OnboardingChecklist }>('/onboarding/my-checklist');
            return response.data.data;
        } catch (error: any) {
            if (error.response && error.response.status === 404) {
                return null; // No checklist assigned
            }
            throw error;
        }
    },

    getAllChecklists: async (): Promise<OnboardingChecklist[]> => {
        const response = await apiClient.get<{ data: OnboardingChecklist[] }>('/onboarding/checklists');
        return response.data.data;
    },

    assignChecklist: async (data: any): Promise<OnboardingChecklist> => {
        const response = await apiClient.post<{ data: OnboardingChecklist }>('/onboarding/assign', data);
        return response.data.data;
    },

    updateTaskStatus: async (checklistId: string, taskId: string, status: 'pending' | 'completed'): Promise<OnboardingChecklist> => {
        const response = await apiClient.put<{ data: OnboardingChecklist }>(`/onboarding/${checklistId}/tasks`, { taskId, status });
        return response.data.data;
    }
};
