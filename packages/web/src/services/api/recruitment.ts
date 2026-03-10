import apiClient from '../apiClient';
import { JobPosting, Application, Interview } from '../../types/recruitment';

export const recruitmentService = {
    // Jobs
    getJobs: async (filters: { status?: string; department?: string } = {}): Promise<JobPosting[]> => {
        const params = new URLSearchParams(filters as any);
        const response = await apiClient.get<{ data: JobPosting[] }>(`/recruitment/jobs?${params}`);
        return response.data.data;
    },

    getJob: async (id: string): Promise<JobPosting> => {
        const response = await apiClient.get<{ data: JobPosting }>(`/recruitment/jobs/${id}`);
        return response.data.data;
    },

    createJob: async (data: any): Promise<JobPosting> => {
        const response = await apiClient.post<{ data: JobPosting }>('/recruitment/jobs', data);
        return response.data.data;
    },

    updateJob: async (id: string, data: any): Promise<JobPosting> => {
        const response = await apiClient.put<{ data: JobPosting }>(`/recruitment/jobs/${id}`, data);
        return response.data.data;
    },

    publishJob: async (id: string): Promise<JobPosting> => {
        const response = await apiClient.post<{ data: JobPosting }>(`/recruitment/jobs/${id}/publish`);
        return response.data.data;
    },

    closeJob: async (id: string): Promise<JobPosting> => {
        const response = await apiClient.post<{ data: JobPosting }>(`/recruitment/jobs/${id}/close`);
        return response.data.data;
    },

    // Applications
    apply: async (data: any): Promise<Application> => {
        const response = await apiClient.post<{ data: Application }>('/recruitment/apply', data);
        return response.data.data;
    },

    getApplications: async (jobId?: string): Promise<Application[]> => {
        const url = jobId ? `/recruitment/applications?jobId=${jobId}` : '/recruitment/applications';
        const response = await apiClient.get<{ data: Application[] }>(url);
        return response.data.data;
    },

    updateApplicationStatus: async (id: string, status: string, feedback?: string): Promise<Application> => {
        const response = await apiClient.put<{ data: Application }>(`/recruitment/applications/${id}/status`, { status, feedback });
        return response.data.data;
    },

    scheduleInterview: async (data: any): Promise<Interview> => {
        const response = await apiClient.post<{ data: Interview }>('/recruitment/interviews', data);
        return response.data.data;
    }
};
