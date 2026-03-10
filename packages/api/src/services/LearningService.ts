import { prisma } from '../utils/database';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

export class LearningService {
    // Course Management (Admin/Instructor)
    async createCourse(data: {
        title: string;
        description?: string;
        type: string;
        duration?: number;
        provider?: string;
    }) {
        return prisma.trainingCourse.create({
            data
        });
    }

    async updateCourse(id: string, data: any) {
        const course = await prisma.trainingCourse.findUnique({ where: { id } });
        if (!course) throw new NotFoundError('Course not found');

        return prisma.trainingCourse.update({
            where: { id },
            data
        });
    }

    async getCourses(activeOnly: boolean = true) {
        const where = activeOnly ? { isActive: true } : {};
        return prisma.trainingCourse.findMany({
            where,
            orderBy: { title: 'asc' }
        });
    }

    async getCourse(id: string) {
        const course = await prisma.trainingCourse.findUnique({ where: { id } });
        if (!course) throw new NotFoundError('Course not found');
        return course;
    }

    // Training Records (Employee)
    async enroll(employeeId: string, courseId: string) {
        const course = await prisma.trainingCourse.findUnique({ where: { id: courseId } });
        if (!course) throw new NotFoundError('Course not found');
        if (!course.isActive) throw new ValidationError('Cannot enroll in inactive course');

        // Check existing enrollment
        const existing = await prisma.trainingRecord.findFirst({
            where: { employeeId, trainingCourseId: courseId }
        });

        if (existing) {
            if (existing.status === 'completed') throw new ValidationError('You have already completed this course');
            return existing; // Already enrolled
        }

        return prisma.trainingRecord.create({
            data: {
                employeeId,
                trainingCourseId: courseId,
                enrollmentDate: new Date(),
                status: 'enrolled'
            }
        });
    }

    async getEmployeeRecords(employeeId: string) {
        return prisma.trainingRecord.findMany({
            where: { employeeId },
            include: {
                trainingCourse: true
            },
            orderBy: { enrollmentDate: 'desc' }
        });
    }

    async updateProgress(recordId: string, status: 'in_progress' | 'completed', score?: number) {
        const record = await prisma.trainingRecord.findUnique({ where: { id: recordId } });
        if (!record) throw new NotFoundError('Training record not found');

        const data: any = { status };
        if (status === 'completed') {
            data.completionDate = new Date();
        }
        if (score !== undefined) {
            data.score = score;
        }

        return prisma.trainingRecord.update({
            where: { id: recordId },
            data
        });
    }
}
