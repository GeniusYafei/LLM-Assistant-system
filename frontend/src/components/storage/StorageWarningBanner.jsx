import React from 'react';
import {Alert, AlertDescription} from '../ui/alert';
import {Progress} from '../ui/progress';
import {AlertCircle, AlertTriangle, Database, X} from 'lucide-react';
import {Button} from '../ui/button';
import {formatBytes, getStoragePercentage} from '../../utils/storageConfig';
import {cn} from '../ui/utils';

export function StorageWarningBanner({
                                         usedBytes,
                                         quotaBytes,
                                         level,
                                         onDismiss,
                                         onManageStorage,
                                     }) {
    const percentage = getStoragePercentage(usedBytes, quotaBytes);
    const isCritical = level === 'critical' || level === 'full';
    const isFull = level === 'full';
    const remainingBytes = quotaBytes ? Math.max(quotaBytes - usedBytes, 0) : 0;

    return (
        <Alert
            className={cn(
                '!flex w-full mt-4 border-l-4 px-4 py-3',
                isCritical
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-600 dark:border-red-400'
                    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-600 dark:border-amber-400'
            )}
        >
            <AlertDescription className="!flex flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 w-full">
                    {/* Left: Icon + Content */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 mt-0.5">
                            {isCritical ? (
                                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400"/>
                            ) : (
                                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400"/>
                            )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                            {/* Title and Description */}
                            <div>
                <span className={cn(
                    'font-medium',
                    isCritical
                        ? 'text-red-900 dark:text-red-200'
                        : 'text-amber-900 dark:text-amber-200'
                )}>
                  {isFull ? 'Storage Full' : isCritical ? 'Storage Near Capacity' : 'Storage Quota Warning'}
                </span>
                                {' — '}
                                <span className="text-gray-700 dark:text-gray-300 text-sm">
                  {isFull ? (
                      <>You've reached your storage quota. New conversations and uploads are disabled until you free up
                          space.</>
                  ) : isCritical ? (
                      <>You're using {percentage.toFixed(1)}% of your storage. Please delete older conversations or
                          documents soon.</>
                  ) : (
                      <>You've used {percentage.toFixed(1)}% of your storage quota. Consider cleaning up older
                          conversations.</>
                  )}
                </span>
                            </div>

                            {/* Progress Bar and Stats */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">
                    {formatBytes(usedBytes)} / {formatBytes(quotaBytes)}
                  </span>
                                    <span className={cn(
                                        'font-medium',
                                        isCritical
                                            ? 'text-red-700 dark:text-red-300'
                                            : 'text-amber-700 dark:text-amber-300'
                                    )}>
                    {percentage.toFixed(1)}%
                  </span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Remaining: {formatBytes(remainingBytes)}
                                </div>
                                <Progress
                                    value={percentage}
                                    className={cn(
                                        'h-1.5',
                                        isCritical
                                            ? '[&>div]:bg-red-600'
                                            : '[&>div]:bg-amber-600'
                                    )}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right: Manage Button + Close Button */}
                    <div className="flex items-start gap-2 flex-shrink-0">
                        {onManageStorage && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onManageStorage}
                                className={cn(
                                    'text-xs h-8 px-3',
                                    isCritical
                                        ? 'border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30'
                                        : 'border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                                )}
                            >
                                <Database className="h-3 w-3 mr-1.5"/>
                                Manage
                            </Button>
                        )}

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onDismiss}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                            aria-label="Dismiss warning"
                        >
                            <X className="h-4 w-4"/>
                        </Button>
                    </div>
                </div>
            </AlertDescription>
        </Alert>
    );
}
