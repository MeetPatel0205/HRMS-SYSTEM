import apiClient from '../apiClient';
import { PayrollEntry, PayrollProcessingResult } from '../../types/payroll';

export const payrollService = {
    // Admin: Process Payroll
    processPayroll: async (startDate: Date, endDate: Date): Promise<PayrollProcessingResult> => {
        const response = await apiClient.post<{ data: PayrollProcessingResult }>('/payroll/process', {
            startDate,
            endDate
        });
        return response.data.data;
    },

    // Employee: Get History
    getHistory: async (): Promise<PayrollEntry[]> => {
        const response = await apiClient.get<{ data: PayrollEntry[] }>('/payroll/history');
        return response.data.data;
    },

    // Get specific entry
    getEntry: async (id: string): Promise<PayrollEntry> => {
        const response = await apiClient.get<{ data: PayrollEntry }>(`/payroll/${id}`);
        return response.data.data;
    }
};
