import React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../ui/alert-dialog';
import {Progress} from '../ui/progress';
import {AlertCircle, AlertTriangle, Database} from 'lucide-react';
import {formatBytes, getStoragePercentage} from '../../utils/storageConfig';

export function StorageWarningDialog({
                                         isOpen,
                                         onClose,
                                         usedBytes,
                                         quotaBytes,
                                         level,
                                         onManageStorage,
                                     }) {
    const percentage = getStoragePercentage(usedBytes, quotaBytes);
    const isWarning = level === 'warning';
    const isCritical = level === 'critical';
    const isFull = level === 'full';
    const isDanger = isCritical || isFull;
    const remainingBytes = quotaBytes ? Math.max(quotaBytes - usedBytes, 0) : 0;

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            isDanger
                                ? 'bg-red-100 dark:bg-red-900/30'
                                : 'bg-amber-100 dark:bg-amber-900/30'
                        }`}>
                            {isDanger ? (
                                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400"/>
                            ) : (
                                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400"/>
                            )}
                        </div>
                        <div>
                            <AlertDialogTitle className="text-left">
                                {isFull ? 'Storage Full' : isCritical ? 'Storage Near Capacity' : 'Storage Quota Warning'}
                            </AlertDialogTitle>
                        </div>
                    </div>

                    <AlertDialogDescription className="text-left">
                        {isWarning && (
                            <>
                                You've used <strong>{percentage.toFixed(1)}%</strong> of your storage quota.
                                Keep an eye on your usage and consider deleting unused conversations or documents.
                            </>
                        )}

                        {isCritical && (
                            <>
                                You're using <strong>{percentage.toFixed(1)}%</strong> of your storage.
                                New uploads may fail soon. Delete older content to avoid hitting the limit.
                            </>
                        )}

                        {isFull && (
                            <>
                                You've reached <strong>100%</strong> of your storage quota.
                                New conversations and document uploads are paused until you free up space.
                            </>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-4 px-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Storage Used</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatBytes(usedBytes)} / {formatBytes(quotaBytes)}
              </span>
                        </div>

                        <Progress
                            value={percentage}
                            className={`h-2 ${
                                isDanger
                                    ? '[&>div]:bg-red-600'
                                    : '[&>div]:bg-amber-600'
                            }`}
                        />
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            Remaining: {formatBytes(remainingBytes)}
                        </div>
                    </div>

                    <div
                        className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-3">
                        <div
                            className="font-medium text-sm mb-2 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Database className="h-4 w-4"/>
                            What happens next?
                        </div>
                        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1.5 ml-6">
                            <li className="list-disc">Delete unused conversations or documents to free up space.</li>
                            <li className="list-disc">Large uploads must fit within the remaining quota.</li>
                            <li className="list-disc">Visit the Documents page to review sizable files.</li>
                            {isDanger && (
                                <li className="list-disc text-red-600 dark:text-red-400">
                                    {isFull
                                        ? 'New conversations and uploads are disabled until space is freed.'
                                        : 'New conversations may be blocked soon if space is not freed.'}
                                </li>
                            )}
                        </ul>
                    </div>
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onClose}>
                        I Understand
                    </AlertDialogCancel>
                    {onManageStorage && (
                        <AlertDialogAction onClick={() => {
                            onManageStorage();
                            onClose();
                        }}>
                            Manage Storage
                        </AlertDialogAction>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
