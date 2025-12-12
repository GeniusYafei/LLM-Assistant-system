/**
 * Storage Quota Configuration
 *
 * This file contains configuration for user storage quotas and limits.
 * You can easily modify these values to adjust storage limits.
 */

// Storage quota settings (in bytes)
export const STORAGE_CONFIG = {
    // Default storage quota per user (100MB)
    DEFAULT_QUOTA: 100 * 1024 * 1024, // 100MB in bytes

    // Warning threshold (80% of quota)
    WARNING_THRESHOLD: 0.8, // 80%

    // Critical warning threshold (95% of quota)
    CRITICAL_THRESHOLD: 0.95, // 95%

    // Hard limit (100% of quota)
    MAX_THRESHOLD: 1.0,
};

/**
 * Calculate storage usage from conversations and documents
 */
export function calculateStorageUsage(conversations, documents) {
    let totalBytes = 0;

    // Calculate size of all messages
    conversations.forEach(conv => {
        conv.messages.forEach(msg => {
            // Approximate size: character count * 2 (UTF-16)
            totalBytes += msg.content.length * 2;
        });
    });

    // Calculate size of all documents
    documents.forEach(doc => {
        totalBytes += doc.size;
    });

    return totalBytes;
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get storage usage percentage
 */
export function getStoragePercentage(usedBytes, quotaBytes = STORAGE_CONFIG.DEFAULT_QUOTA) {
    return Math.min((usedBytes / quotaBytes) * 100, 100);
}

/**
 * Check if storage is at warning level
 */
export function isStorageWarning(usedBytes, quotaBytes = STORAGE_CONFIG.DEFAULT_QUOTA) {
    if (!quotaBytes) return false;
    const percentage = usedBytes / quotaBytes;
    return percentage >= STORAGE_CONFIG.WARNING_THRESHOLD && percentage < STORAGE_CONFIG.CRITICAL_THRESHOLD;
}

/**
 * Check if storage is at critical level
 */
export function isStorageCritical(usedBytes, quotaBytes = STORAGE_CONFIG.DEFAULT_QUOTA) {
    if (!quotaBytes) return false;
    const percentage = usedBytes / quotaBytes;
    return percentage >= STORAGE_CONFIG.CRITICAL_THRESHOLD && percentage < STORAGE_CONFIG.MAX_THRESHOLD;
}

export function isStorageFull(usedBytes, quotaBytes = STORAGE_CONFIG.DEFAULT_QUOTA) {
    if (!quotaBytes) return false;
    const percentage = usedBytes / quotaBytes;
    return percentage >= STORAGE_CONFIG.MAX_THRESHOLD;
}

export function getStorageWarningLevel(usedBytes, quotaBytes = STORAGE_CONFIG.DEFAULT_QUOTA) {
    if (!quotaBytes) return null;
    const ratio = usedBytes / quotaBytes;
    if (ratio >= STORAGE_CONFIG.MAX_THRESHOLD) {
        return 'full';
    }
    if (ratio >= STORAGE_CONFIG.CRITICAL_THRESHOLD) {
        return 'critical';
    }
    if (ratio >= STORAGE_CONFIG.WARNING_THRESHOLD) {
        return 'warning';
    }
    return null;
}
