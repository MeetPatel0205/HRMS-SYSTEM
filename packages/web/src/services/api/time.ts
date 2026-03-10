import apiClient from '../apiClient';
import { TimeEntry, TimeAttendanceStatus, LocationData } from '../../types/time';

const BASE_URL = '/time';

export const timeService = {
    clockIn: async (location?: LocationData): Promise<TimeEntry> => {
        const response = await apiClient.post<{ data: TimeEntry }>(`${BASE_URL}/clock-in`, { location });
        return response.data.data;
    },

    clockOut: async (location?: LocationData): Promise<TimeEntry> => {
        const response = await apiClient.post<{ data: TimeEntry }>(`${BASE_URL}/clock-out`, { location });
        return response.data.data;
    },

    startBreak: async (): Promise<TimeEntry> => {
        const response = await apiClient.post<{ data: TimeEntry }>(`${BASE_URL}/break/start`);
        return response.data.data;
    },

    endBreak: async (): Promise<TimeEntry> => {
        const response = await apiClient.post<{ data: TimeEntry }>(`${BASE_URL}/break/end`);
        return response.data.data;
    },

    getStatus: async (): Promise<TimeAttendanceStatus> => {
        const response = await apiClient.get<{ data: TimeAttendanceStatus }>(`${BASE_URL}/status`);
        return response.data.data;
    },

    getTimesheet: async (startDate?: string, endDate?: string): Promise<TimeEntry[]> => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const response = await apiClient.get<{ data: TimeEntry[] }>(`${BASE_URL}/timesheet?${params.toString()}`);
        return response.data.data;
    }
};
