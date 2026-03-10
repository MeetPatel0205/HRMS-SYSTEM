export interface TimeEntry {
    id: string;
    employeeId: string;
    date: string;
    clockIn: string;
    clockOut?: string;
    breaks: TimeBreak[];
    totalHours: number;
    regularHours: number;
    overtimeHours: number;
    status: 'pending' | 'approved' | 'rejected';
    notes?: string;
}

export interface TimeBreak {
    startTime: string;
    endTime?: string;
}

export interface TimeAttendanceStatus {
    status: 'clocked_in' | 'clocked_out' | 'on_break';
    entry?: TimeEntry;
}

export interface LocationData {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
}
