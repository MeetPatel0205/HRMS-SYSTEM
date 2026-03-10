import apiClient from '../apiClient';
import { BenefitPlan, BenefitEnrollment } from '../../types/benefits';

export const benefitsService = {
    // Plans
    getPlans: async (activeOnly: boolean = true): Promise<BenefitPlan[]> => {
        const response = await apiClient.get<{ data: BenefitPlan[] }>(`/benefits/plans?active=${activeOnly}`);
        return response.data.data;
    },

    getPlan: async (id: string): Promise<BenefitPlan> => {
        const response = await apiClient.get<{ data: BenefitPlan }>(`/benefits/plans/${id}`);
        return response.data.data;
    },

    createPlan: async (data: any): Promise<BenefitPlan> => {
        const response = await apiClient.post<{ data: BenefitPlan }>('/benefits/plans', data);
        return response.data.data;
    },

    updatePlan: async (id: string, data: any): Promise<BenefitPlan> => {
        const response = await apiClient.put<{ data: BenefitPlan }>(`/benefits/plans/${id}`, data);
        return response.data.data;
    },

    deletePlan: async (id: string): Promise<void> => {
        await apiClient.delete(`/benefits/plans/${id}`);
    },

    // Enrollments
    getMyEnrollments: async (): Promise<BenefitEnrollment[]> => {
        const response = await apiClient.get<{ data: BenefitEnrollment[] }>('/benefits/my-enrollments');
        return response.data.data;
    },

    enroll: async (benefitPlanId: string, elections: any): Promise<BenefitEnrollment> => {
        const response = await apiClient.post<{ data: BenefitEnrollment }>('/benefits/enroll', { benefitPlanId, elections });
        return response.data.data;
    },

    terminateEnrollment: async (id: string): Promise<BenefitEnrollment> => {
        const response = await apiClient.post<{ data: BenefitEnrollment }>(`/benefits/enrollments/${id}/terminate`);
        return response.data.data;
    }
};
