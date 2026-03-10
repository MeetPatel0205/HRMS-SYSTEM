export interface Document {
    id: string;
    title: string;
    description?: string;
    category: string;
    fileUrl: string;
    uploadedBy: string;
    roles?: string[];
    createdAt: string;
    updatedAt: string;
    uploader?: {
        firstName: string;
        lastName: string;
    };
}
