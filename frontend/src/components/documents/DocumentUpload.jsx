import React, {useMemo, useRef, useState} from 'react';
import {Button} from '../ui/button';
import {Badge} from '../ui/badge';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '../ui/card';
import {Download, File, FileText, Trash2} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '../ui/alert-dialog';
import {ALLOWED_DOCUMENT_EXTENSIONS, ALLOWED_DOCUMENT_MIME_TYPES} from '../../constants/documentTypes';

const FILE_TYPE_CATEGORIES = [
    {
        label: 'PDF',
        icon: '📄',
        matches: (type, name) => type === 'application/pdf' || name.endsWith('.pdf')
    },
    {
        label: 'Text',
        icon: '📝',
        matches: (type, name) => type === 'text/plain' || name.endsWith('.txt')
    },
    {
        label: 'Word',
        icon: '📄',
        matches: (type, name) =>
            type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')
    },
    {
        label: 'Excel',
        icon: '📊',
        matches: (type, name) =>
            type.includes('sheet') || type.includes('excel') || name.endsWith('.xls') || name.endsWith('.xlsx')
    },
    {
        label: 'Image',
        icon: '🖼️',
        matches: (type, name) => type.startsWith('image/') || /\.(png|jpg|jpeg)$/.test(name)
    },
    {
        label: 'CSV',
        icon: '📑',
        matches: (type, name) => type === 'text/csv' || type === 'application/csv' || name.endsWith('.csv')
    },
    {
        label: 'JSON',
        icon: '🧩',
        matches: (type, name) => type === 'application/json' || name.endsWith('.json')
    }
];

const getFileCategory = (type = '', name = '') => {
    const normalizedName = (name || '').toLowerCase();
    const normalizedType = (type || '').toLowerCase();
    return FILE_TYPE_CATEGORIES.find(category => category.matches(normalizedType, normalizedName)) || {
        label: 'Document',
        icon: '📄'
    };
};

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function DocumentUpload({
                                   documents,
                                   onUpload,
                                   onDelete,
                                   loading = false,
                                   maxFileSize = 10 * 1024 * 1024, // 10MB
                                   allowedTypes = ALLOWED_DOCUMENT_MIME_TYPES,
                                   allowedExtensions = ALLOWED_DOCUMENT_EXTENSIONS,
                                   remainingBytes = null,
                                   quotaBytes = null,
                                   disabled = false,
                               }) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(null);
    const [uploadError, setUploadError] = useState(null);
    const [uploadSuccess, setUploadSuccess] = useState(null);
    const fileInputRef = useRef(null);
    const safeRemainingBytes = typeof remainingBytes === 'number' ? Math.max(0, remainingBytes) : null;
    const quotaLabel = typeof quotaBytes === 'number' ? formatFileSize(Math.max(quotaBytes, 0)) : null;
    const isAtCapacity = disabled || safeRemainingBytes === 0;
    const canSelectFile = !loading && !isAtCapacity;
    const acceptAttribute = useMemo(() => {
        const list = Array.isArray(allowedExtensions) && allowedExtensions.length > 0
            ? allowedExtensions
            : ALLOWED_DOCUMENT_EXTENSIONS;
        return list.join(',');
    }, [allowedExtensions]);

    const getFileIcon = (type, name = '') => getFileCategory(type, name).icon;

    const getFileTypeLabel = (type, name = '') => getFileCategory(type, name).label;

    const validateFile = (file) => {
        if (file.size > maxFileSize) {
            return `File size must be less than ${formatFileSize(maxFileSize)}`;
        }

        if (safeRemainingBytes !== null && file.size > safeRemainingBytes) {
            return `Not enough storage remaining. You have ${formatFileSize(safeRemainingBytes)} left.`;
        }

        const normalizedName = (file.name || '').toLowerCase();
        const mimeAllowed = allowedTypes.includes(file.type);
        const extensionAllowed = allowedExtensions.some(ext => normalizedName.endsWith(ext));

        if (!mimeAllowed && !extensionAllowed) {
            return `File type not supported. Please upload ${SUPPORTED_TYPE_MESSAGE} documents.`;
        }

        return null;
    };

    const handleFileSelect = async (files) => {
        if (!files || files.length === 0 || !canSelectFile) return;

        const file = files[0];
        const validationError = validateFile(file);

        if (validationError) {
            setUploadError(validationError);
            return;
        }

        setUploadError(null);
        setUploadSuccess(null);
        setUploadProgress(0);

        let progressInterval;

        try {
            progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev === null) return 0;
                    const next = prev + Math.random() * 30;
                    return next >= 95 ? 95 : next;
                });
            }, 200);

            await onUpload(file);

            if (progressInterval) {
                clearInterval(progressInterval);
            }
            setUploadProgress(100);
            setUploadSuccess(`Successfully uploaded ${file.name}`);

            setTimeout(() => {
                setUploadProgress(null);
                setUploadSuccess(null);
            }, 3000);
        } catch (error) {
            if (progressInterval) {
                clearInterval(progressInterval);
            }
            setUploadProgress(null);
            setUploadError(error instanceof Error ? error.message : 'Upload failed');
        }
    };

    const handleDragOver = (e) => {
        if (!canSelectFile) return;
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        if (!canSelectFile) return;
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        if (!canSelectFile) return;
        e.preventDefault();
        setIsDragOver(false);
        handleFileSelect(e.dataTransfer.files);
    };

    const handleFileInputChange = (e) => {
        handleFileSelect(e.target.files);
        if (e.target) {
            e.target.value = '';
        }
    };

    const openFileDialog = () => {
        if (!canSelectFile) return;
        fileInputRef.current?.click();
    };

    const formatDate = (value) => {
        if (!value) {
            return 'Unknown date';
        }
        const date = value instanceof Date ? value : new Date(value);
        if (!Number.isNaN(date.getTime())) {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        if (typeof value === 'string') {
            return value;
        }

        return 'Unknown date';
    };

    return (
        <div className="space-y-6">
            {/* <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Document
          </CardTitle>
          <CardDescription>
            Provide additional context to conversations. Supported formats: {SUPPORTED_DOCUMENT_TYPES_LABEL} (max {formatFileSize(maxFileSize)}).
            {quotaLabel && ` Total quota: ${quotaLabel}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-6 text-center transition-colors flex flex-col items-center gap-3',
              isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-muted-foreground/30',
              canSelectFile ? 'cursor-pointer hover:border-blue-400' : 'opacity-60 cursor-not-allowed'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={openFileDialog}
          >
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-base font-medium">
                {isAtCapacity ? 'Storage limit reached' : 'Click to upload or drag & drop'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isAtCapacity
                  ? 'Delete documents or conversations to free up space.'
                  : `Remaining storage: ${safeRemainingBytes !== null ? formatFileSize(safeRemainingBytes) : '—'}`}
              </p>
            </div>
            <Button variant="outline" type="button" disabled={!canSelectFile}>
              Choose File
            </Button>
            <p className="text-xs text-muted-foreground">
              Supported: {SUPPORTED_DOCUMENT_TYPES_LABEL}
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={acceptAttribute || DOCUMENT_ACCEPT}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={!canSelectFile}
          />

          {uploadProgress !== null && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {uploadError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          {uploadSuccess && (
            <Alert className="mt-4">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{uploadSuccess}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card> */}

            {/* Documents List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5"/>
                        Your Documents ({documents.length})
                    </CardTitle>
                    <CardDescription>
                        Manage your uploaded documents. You can attach them to conversations for context.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {documents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <File className="h-12 w-12 mx-auto mb-4 opacity-50"/>
                            <p>No documents uploaded yet</p>
                            <p className="text-sm">Upload documents to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {documents.map((document) => (
                                <div
                                    key={document.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                                        <div className="text-2xl">
                                            {getFileIcon(document.type, document.name)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{document.name}</p>
                                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                                <span>{formatFileSize(document.size)}</span>
                                                <Badge variant="outline">
                                                    {getFileTypeLabel(document.type, document.name)}
                                                </Badge>
                                                <span>Uploaded on <strong>{formatDate(document.uploadedAt)}</strong></span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        {document.downloadUrl && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => window.open(document.downloadUrl, '_blank')}
                                                title="Download document"
                                            >
                                                <Download className="h-4 w-4"/>
                                            </Button>
                                        )}

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive"
                                                    title="Delete document"
                                                >
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Document</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to delete "{document.name}"?
                                                        This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => onDelete(document.id)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
