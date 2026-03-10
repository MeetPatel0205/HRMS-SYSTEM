import { prisma } from '../utils/database';
import { NotFoundError } from '../middleware/errorHandler';

export class DocumentService {
    async create(data: {
        title: string;
        category: string;
        type: string;
        description?: string;
        fileUrl: string;
        uploadedBy: string;
        roles?: string[]; // JSON array of allowed roles
    }) {
        return prisma.document.create({
            data: {
                ...data,
                status: 'active'
            }
        });
    }

    async update(id: string, data: any) {
        const doc = await prisma.document.findUnique({ where: { id } });
        if (!doc) throw new NotFoundError('Document not found');

        return prisma.document.update({
            where: { id },
            data
        });
    }

    async delete(id: string) {
        return prisma.document.update({
            where: { id },
            data: { status: 'archived' }
        });
    }

    async getAll(category?: string) {
        const where: any = { status: 'active' };
        if (category) {
            where.category = category;
        }

        return prisma.document.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { uploader: true } // Now valid
        });
    }

    async getById(id: string) {
        const doc = await prisma.document.findUnique({ where: { id }, include: { uploader: true } });
        if (!doc) throw new NotFoundError('Document not found');
        return doc;
    }
}
