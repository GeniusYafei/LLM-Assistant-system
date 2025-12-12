/**
 * Chat History Persistent Storage Utility
 * Manages localStorage-based persistence for chat conversations
 */

const STORAGE_PREFIX = 'lorgan_chat_';
const STORAGE_VERSION = 'v1';

/**
 * Generate storage key for user and organization
 */
function getStorageKey(userId, organizationId) {
    const orgId = organizationId || 'global';
    return `${STORAGE_PREFIX}${STORAGE_VERSION}_${userId}_${orgId}`;
}

/**
 * Load conversations from localStorage
 */
export function loadConversations(userId, organizationId) {
    try {
        const key = getStorageKey(userId, organizationId);
        const data = localStorage.getItem(key);

        if (!data) {
            return [];
        }

        const conversations = JSON.parse(data);
        return conversations;
    } catch (error) {
        console.error('Error loading conversations from localStorage:', error);
        return [];
    }
}

/**
 * Save conversations to localStorage
 */
export function saveConversations(userId, organizationId, conversations) {
    try {
        const key = getStorageKey(userId, organizationId);
        const data = JSON.stringify(conversations);

        localStorage.setItem(key, data);
        return true;
    } catch (error) {
        console.error('Error saving conversations to localStorage:', error);

        // Check if quota exceeded
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            console.warn('LocalStorage quota exceeded!');
        }

        return false;
    }
}

/**
 * Add or update a conversation
 */
export function saveConversation(userId, organizationId, conversation) {
    const conversations = loadConversations(userId, organizationId);
    const existingIndex = conversations.findIndex(c => c.id === conversation.id);

    if (existingIndex >= 0) {
        // Update existing
        conversations[existingIndex] = conversation;
    } else {
        // Add new
        conversations.unshift(conversation);
    }

    return saveConversations(userId, organizationId, conversations);
}

/**
 * Delete a conversation
 */
export function deleteConversation(userId, organizationId, conversationId) {
    const conversations = loadConversations(userId, organizationId);
    const filtered = conversations.filter(c => c.id !== conversationId);

    return saveConversations(userId, organizationId, filtered);
}

/**
 * Clear all conversations for a user and organization
 */
export function clearConversations(userId, organizationId) {
    try {
        const key = getStorageKey(userId, organizationId);
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Error clearing conversations:', error);
        return false;
    }
}

/**
 * Get all storage keys for a user (across all organizations)
 */
export function getUserStorageKeys(userId) {
    const keys = [];
    const prefix = `${STORAGE_PREFIX}${STORAGE_VERSION}_${userId}_`;

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
            keys.push(key);
        }
    }

    return keys;
}

/**
 * Calculate total storage size used by chat data
 */
export function calculateChatStorageSize(userId) {
    let totalSize = 0;
    const keys = getUserStorageKeys(userId);

    for (const key of keys) {
        const data = localStorage.getItem(key);
        if (data) {
            // Approximate size in bytes (2 bytes per character in UTF-16)
            totalSize += data.length * 2;
        }
    }

    return totalSize;
}

/**
 * Export conversations as JSON (for backup/download)
 */
export function exportConversations(userId, organizationId) {
    const conversations = loadConversations(userId, organizationId);
    return JSON.stringify(conversations, null, 2);
}

/**
 * Import conversations from JSON
 */
export function importConversations(userId, organizationId, jsonData, merge = false) {
    try {
        const imported = JSON.parse(jsonData);

        if (!Array.isArray(imported)) {
            throw new Error('Invalid data format');
        }

        if (merge) {
            // Merge with existing
            const existing = loadConversations(userId, organizationId);
            const merged = [...imported];

            // Add existing conversations that aren't in the import
            for (const conv of existing) {
                if (!imported.find(c => c.id === conv.id)) {
                    merged.push(conv);
                }
            }

            return saveConversations(userId, organizationId, merged);
        } else {
            // Replace all
            return saveConversations(userId, organizationId, imported);
        }
    } catch (error) {
        console.error('Error importing conversations:', error);
        return false;
    }
}
