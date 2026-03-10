import { prisma } from '../utils/database';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

export class WellnessService {
    // Program Management (Admin)
    async createProgram(data: {
        name: string;
        description?: string;
        startDate: Date;
        endDate?: Date;
    }) {
        return prisma.wellnessProgram.create({
            data: {
                ...data,
                isActive: true
            }
        });
    }

    async updateProgram(id: string, data: any) {
        const program = await prisma.wellnessProgram.findUnique({ where: { id } });
        if (!program) throw new NotFoundError('Wellness program not found');

        return prisma.wellnessProgram.update({
            where: { id },
            data
        });
    }

    async getPrograms(activeOnly: boolean = true) {
        const where = activeOnly ? { isActive: true } : {};
        return prisma.wellnessProgram.findMany({
            where,
            orderBy: { startDate: 'desc' },
            include: {
                _count: {
                    select: { enrollments: true }
                }
            }
        });
    }

    async getProgram(id: string) {
        const program = await prisma.wellnessProgram.findUnique({
            where: { id },
            include: {
                enrollments: {
                    include: { employee: true }
                }
            }
        });
        if (!program) throw new NotFoundError('Wellness program not found');
        return program;
    }

    // Enrollments (Employee)
    async enroll(employeeId: string, programId: string) {
        const program = await prisma.wellnessProgram.findUnique({ where: { id: programId } });
        if (!program) throw new NotFoundError('Wellness program not found');
        if (!program.isActive) throw new ValidationError('Cannot enroll in inactive program');

        // Check existing
        const existing = await prisma.wellnessEnrollment.findFirst({
            where: { employeeId, programId }
        });

        if (existing) {
            return existing; // Already enrolled
        }

        return prisma.wellnessEnrollment.create({
            data: {
                employeeId,
                programId,
                status: 'enrolled',
                enrolledAt: new Date(),
                // progress is not in schema? let's check. 
                // Schema has points, status. No progress Json. 
                // Use points or stick to schema. Schema says points Int @default(0).
            }
        });
    }

    async getEmployeeEnrollments(employeeId: string) {
        return prisma.wellnessEnrollment.findMany({
            where: { employeeId },
            include: {
                program: true
            },
            orderBy: { enrolledAt: 'desc' }
        });
    }

    async updateProgress(id: string, data: any) {
        // id is enrollmentId
        // const enrollment = await prisma.wellnessEnrollment.findUnique({ where: { id } });
        // if (!enrollment) throw new NotFoundError('Enrollment not found');

        // data could be { progress: { steps: 10000 }, status: 'completed' }
        return prisma.wellnessEnrollment.update({
            where: { id },
            data
        });
    }
}
