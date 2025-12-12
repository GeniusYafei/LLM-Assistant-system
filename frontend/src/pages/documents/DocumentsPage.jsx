import React from 'react';
import {DocumentUpload} from '../../components/documents/DocumentUpload.jsx';
import {Database, FileText, Upload} from 'lucide-react';
import {Badge} from '../../components/ui/badge.jsx';

export function DocumentsPage({
                                  documents,
                                  onUpload,
                                  onDelete,
                                  uploadLoading,
                                  storageUsed = 0,
                                  storageQuota,
                              }) {
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const totalSize = documents.reduce((sum, doc) => sum + doc.size, 0);
    const quotaBytes = typeof storageQuota === 'number' ? storageQuota : null;
    const remainingBytes = quotaBytes !== null ? Math.max(quotaBytes - storageUsed, 0) : null;

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className="hidden md:flex w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-lg items-center justify-center">
                            <FileText className="h-5 w-5 text-white"/>
                        </div>
                        <div>
                            <h1 className="font-semibold text-xl text-gray-900 dark:text-white">Document Manager</h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Upload and manage documents for your conversations
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <div className="flex items-center gap-2">
                                <Database className="h-4 w-4 text-gray-500 dark:text-gray-400"/>
                                <span
                                    className="text-sm font-medium text-gray-900 dark:text-gray-100">{documents.length}</span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Documents</span>
                        </div>

                        <div className="text-center">
                            <div className="flex items-center gap-2">
                                <Upload className="h-4 w-4 text-gray-500 dark:text-gray-400"/>
                                <span
                                    className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatFileSize(totalSize)}</span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Total Size</span>
                        </div>

                        <Badge variant="secondary"
                               className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-0">
                            Active
                        </Badge>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
                <div className="max-w-6xl mx-auto">
                    <DocumentUpload
                        documents={documents}
                        onUpload={onUpload}
                        onDelete={onDelete}
                        loading={uploadLoading}
                        quotaBytes={quotaBytes}
                        remainingBytes={remainingBytes}
                        disabled={remainingBytes === 0}
                    />
                </div>
            </div>
        </div>
    );
}
