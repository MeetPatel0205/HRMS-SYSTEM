import { prisma } from '../utils/database';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

interface LocationData {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
}

export class TimeEntryService {
    async clockIn(employeeId: string, location?: LocationData, ipAddress?: string, deviceInfo?: any): Promise<any> {
        // Check if already clocked in today and not clocked out
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingEntry = await prisma.timeEntry.findFirst({
            where: {
                employeeId,
                date: { gte: today },
                clockOut: null
            }
        });

        if (existingEntry) {
            throw new ValidationError('Already clocked in');
        }

        // Create new entry
        return prisma.timeEntry.create({
            data: {
                employeeId,
                date: new Date(),
                clockIn: new Date(),
                location: location as any,
                ipAddress,
                deviceInfo: deviceInfo as any,
                status: 'pending',
                breaks: []
            }
        });
    }

    async clockOut(employeeId: string, location?: LocationData): Promise<any> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const entry = await prisma.timeEntry.findFirst({
            where: {
                employeeId,
                date: { gte: today },
                clockOut: null
            }
        });

        if (!entry) {
            throw new ValidationError('No active clock-in found');
        }

        // Check if on break, end it automatically or throw? 
        // Let's end it automatically if needed, or check breaks.
        // For simplicity, just clock out.

        const clockOut = new Date();
        const durationMs = clockOut.getTime() - entry.clockIn.getTime();

        // Subtract break times
        const breaks = (entry.breaks as any[]) || [];
        let breakDurationMs = 0;
        breaks.forEach((b: any) => {
            if (b.endTime) {
                breakDurationMs += (new Date(b.endTime).getTime() - new Date(b.startTime).getTime());
            }
        });

        const totalMinutes = Math.max(0, (durationMs - breakDurationMs) / (1000 * 60));
        const totalHours = parseFloat((totalMinutes / 60).toFixed(2));

        // Simple overtime rule: > 8 hours
        const regularHours = Math.min(totalHours, 8);
        const overtimeHours = Math.max(0, totalHours - 8);

        return prisma.timeEntry.update({
            where: { id: entry.id },
            data: {
                clockOut,
                totalHours,
                regularHours,
                overtimeHours,
                status: 'pending' // pending approval
            }
        });
    }

    async startBreak(employeeId: string): Promise<any> {
        const entry = await this.getActiveEntry(employeeId);

        const breaks = (entry.breaks as any[]) || [];
        // Check if already on break
        const currentBreak = breaks.find(b => !b.endTime);
        if (currentBreak) throw new ValidationError('Already on break');

        breaks.push({
            startTime: new Date(),
            endTime: null
        });

        return prisma.timeEntry.update({
            where: { id: entry.id },
            data: { breaks }
        });
    }

    async endBreak(employeeId: string): Promise<any> {
        const entry = await this.getActiveEntry(employeeId);

        const breaks = (entry.breaks as any[]) || [];
        const currentBreakIndex = breaks.findIndex(b => !b.endTime);

        if (currentBreakIndex === -1) throw new ValidationError('Not currently on break');

        breaks[currentBreakIndex].endTime = new Date();

        return prisma.timeEntry.update({
            where: { id: entry.id },
            data: { breaks }
        });
    }

    async getActiveEntry(employeeId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const entry = await prisma.timeEntry.findFirst({
            where: {
                employeeId,
                date: { gte: today },
                clockOut: null
            }
        });

        if (!entry) throw new NotFoundError('No active clock-in found');
        return entry;
    }

    async getEmployeeStatus(employeeId: string): Promise<any> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const entry = await prisma.timeEntry.findFirst({
            where: {
                employeeId,
                date: { gte: today },
                clockOut: null
            }
        });

        if (!entry) return { status: 'clocked_out' };

        const breaks = (entry.breaks as any[]) || [];
        const isOnBreak = breaks.some(b => !b.endTime);

        return {
            status: isOnBreak ? 'on_break' : 'clocked_in',
            entry
        };
    }

    async getTimesheet(employeeId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
        const where: any = { employeeId };

        if (startDate && endDate) {
            where.date = {
                gte: startDate,
                lte: endDate
            };
        }

        return prisma.timeEntry.findMany({
            where,
            orderBy: { date: 'desc' }
        });
    }
}
