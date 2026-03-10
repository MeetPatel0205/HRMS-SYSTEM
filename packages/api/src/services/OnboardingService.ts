import { prisma } from '../utils/database';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

export interface OnboardingTask {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'completed';
    completedAt?: string;
}

export class OnboardingService {
    async assignChecklist(data: {
        employeeId: string;
        tasks: OnboardingTask[];
        startDate: Date;
        dueDate: Date;
    }) {
        const existing = await prisma.onboardingChecklist.findUnique({
            where: { employeeId: data.employeeId }
        });

        if (existing) {
            throw new ValidationError('Onboarding checklist already exists for this employee');
        }

        return prisma.onboardingChecklist.create({
            data: {
                ...data,
                tasks: data.tasks as any,
                status: 'in_progress'
            }
        });
    }

    async getChecklist(employeeId: string) {
        const checklist = await prisma.onboardingChecklist.findUnique({
            where: { employeeId }
        });

        if (!checklist) {
            // Return null or throw? Let's return null to let controller handle "not assigned" vs "checked"
            return null;
        }
        return checklist;
    }

    async getAllChecklists() {
        return prisma.onboardingChecklist.findMany({
            include: {
                employee: {
                    select: { firstName: true, lastName: true, email: true, department: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async updateTaskStatus(checklistId: string, taskId: string, status: 'pending' | 'completed') {
        const checklist = await prisma.onboardingChecklist.findUnique({ where: { id: checklistId } });
        if (!checklist) throw new NotFoundError('Checklist not found');

        const tasks = checklist.tasks as unknown as OnboardingTask[];
        const taskIndex = tasks.findIndex(t => t.id === taskId);

        if (taskIndex === -1) throw new NotFoundError('Task not found');

        tasks[taskIndex].status = status;
        if (status === 'completed') {
            tasks[taskIndex].completedAt = new Date().toISOString();
        } else {
            delete tasks[taskIndex].completedAt;
        }

        // Check if all completed
        const allCompleted = tasks.every(t => t.status === 'completed');
        const checklistStatus = allCompleted ? 'completed' : 'in_progress';
        const completedAt = allCompleted ? new Date() : null;

        return prisma.onboardingChecklist.update({
            where: { id: checklistId },
            data: {
                tasks: tasks as any,
                status: checklistStatus,
                completedAt
            }
        });
    }

    async updateChecklist(id: string, data: any) {
        return prisma.onboardingChecklist.update({
            where: { id },
            data: {
                ...data,
                tasks: data.tasks ? data.tasks as any : undefined
            }
        });
    }
}
