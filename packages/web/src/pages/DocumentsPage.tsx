import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    CardActions,
    Button,
    Chip,
    Box,
    TextField,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton
} from '@mui/material';
import { Add, InsertDriveFile, Download, Delete, Description } from '@mui/icons-material';
import { Document } from '../types/documents';
import { documentService } from '../services/api/documents';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';

const DocumentsPage: React.FC = () => {
    const { hasPermission, user } = useAuth();
    const isAdmin = hasPermission('write_documents');

    // Fallback categories if none exist in DB (DB schema defines type and category as strings)
    const CATEGORIES = ['Policy', 'Contract', 'Form', 'Template', 'Other'];
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(false);

    // Upload Dialog
    const [openUploadDialog, setOpenUploadDialog] = useState(false);
    const [newDoc, setNewDoc] = useState({
        title: '',
        description: '',
        category: 'Policy',
        type: 'General', // Default type
        fileUrl: '',
        roles: [] as string[]
    });

    useEffect(() => {
        loadDocuments();
    }, [selectedCategory]);

    const loadDocuments = async () => {
        setLoading(true);
        try {
            const data = await documentService.getAll(selectedCategory === 'All' ? undefined : selectedCategory);
            setDocuments(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        try {
            await documentService.create({
                ...newDoc,
                uploadedBy: user?.id
            });
            setOpenUploadDialog(false);
            loadDocuments();
            // Reset form
            setNewDoc({ title: '', description: '', category: 'Policy', type: 'General', fileUrl: '', roles: [] });
        } catch (err) {
            console.error(err);
            alert('Failed to upload document');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this document?')) return;
        try {
            await documentService.delete(id);
            loadDocuments();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4">Documents Center</Typography>
                {isAdmin && (
                    <Button variant="contained" startIcon={<Add />} onClick={() => setOpenUploadDialog(true)}>
                        Upload Document
                    </Button>
                )}
            </Box>

            <Box sx={{ mb: 4 }}>
                <TextField
                    select
                    label="Filter by Category"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    sx={{ width: 200 }}
                    size="small"
                >
                    <MenuItem value="All">All Categories</MenuItem>
                    {CATEGORIES.map(cat => (
                        <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                    ))}
                </TextField>
            </Box>

            <Grid container spacing={3}>
                {documents.map(doc => (
                    <Grid item xs={12} md={4} lg={3} key={doc.id}>
                        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <CardContent sx={{ flexGrow: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <InsertDriveFile color="primary" sx={{ fontSize: 40, mr: 1 }} />
                                    <Box>
                                        <Typography variant="h6" noWrap title={doc.title}>
                                            {doc.title.length > 20 ? doc.title.substring(0, 20) + '...' : doc.title}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {doc.category}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Typography variant="body2" color="textSecondary" sx={{ mb: 2, minHeight: 40 }}>
                                    {doc.description || 'No description provided.'}
                                </Typography>
                                <Typography variant="caption" display="block">
                                    Uploaded: {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                                </Typography>
                                {doc.uploader && (
                                    <Typography variant="caption" display="block">
                                        By: {doc.uploader.firstName} {doc.uploader.lastName}
                                    </Typography>
                                )}
                            </CardContent>
                            <CardActions>
                                <Button startIcon={<Download />} href={doc.fileUrl} target="_blank">
                                    Download
                                </Button>
                                {isAdmin && (
                                    <IconButton color="error" onClick={() => handleDelete(doc.id)} sx={{ ml: 'auto' }}>
                                        <Delete />
                                    </IconButton>
                                )}
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Dialog open={openUploadDialog} onClose={() => setOpenUploadDialog(false)}>
                <DialogTitle>Upload New Document</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 400 }}>
                        <TextField
                            label="Title"
                            value={newDoc.title}
                            onChange={e => setNewDoc({ ...newDoc, title: e.target.value })}
                        />
                        <TextField
                            label="Description"
                            multiline
                            rows={3}
                            value={newDoc.description}
                            onChange={e => setNewDoc({ ...newDoc, description: e.target.value })}
                        />
                        <TextField
                            select
                            label="Category"
                            value={newDoc.category}
                            onChange={e => setNewDoc({ ...newDoc, category: e.target.value })}
                        >
                            {CATEGORIES.map(cat => (
                                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="Document URL (S3/Link)"
                            value={newDoc.fileUrl}
                            onChange={e => setNewDoc({ ...newDoc, fileUrl: e.target.value })}
                            helperText="Paste the direct link to the file"
                        />
                        {/* Role selection could go here */}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenUploadDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleUpload}>Upload</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default DocumentsPage;
