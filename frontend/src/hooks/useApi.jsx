import {useCallback, useState} from 'react';
import {useAuth} from '../contexts/AuthContext.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function useApi() {
    const {accessToken, signOut} = useAuth();
    const [state, setState] = useState({
        data: null,
        loading: false,
        error: null,
    });

    const request = useCallback(async (endpoint, config = {}) => {
        const {
            method = 'GET',
            headers = {},
            body,
            requireAuth = true,
            signal,
            timeoutMs = 15000,
        } = config;

        if (requireAuth && !accessToken) {
            const authError = new Error('Authentication required');
            setState(prev => ({...prev, loading: false, error: authError.message}));
            throw authError;
        }

        setState(prev => ({...prev, loading: true, error: null}));

        try {
            const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

            const requestHeaders = {...headers};
            const methodUpper = (method || 'GET').toUpperCase();

            if (body !== undefined && methodUpper !== 'GET' && !(body instanceof FormData)) {
                requestHeaders['Content-Type'] = requestHeaders['Content-Type'] || 'application/json';
            }

            if (requireAuth && accessToken) {
                requestHeaders['Authorization'] = `Bearer ${accessToken}`;
            }

            const requestConfig = {
                method: methodUpper,
                headers: requestHeaders,
            };

            if (body !== undefined && methodUpper !== 'GET') {
                if (body instanceof FormData) {
                    delete requestConfig.headers['Content-Type'];
                    requestConfig.body = body;
                } else {
                    requestConfig.body = JSON.stringify(body);
                }
            }

            let timeoutId;
            let timeoutController;
            let fetchSignal = signal || null;

            if (!fetchSignal && timeoutMs) {
                timeoutController = new AbortController();
                timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
                fetchSignal = timeoutController.signal;
            }

            if (fetchSignal) {
                requestConfig.signal = fetchSignal;
            }

            const response = await fetch(url, requestConfig);

            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;
                let errorData = null;

                try {
                    const text = await response.text();
                    errorData = text ? JSON.parse(text) : null;
                } catch {
                    errorData = null;
                }

                if (response.status === 401) {
                    await signOut();
                    errorMessage = 'Session expired. Please sign in again.';
                } else if (errorData?.error) {
                    errorMessage = errorData.error;
                } else if (response.status === 429 && errorData?.retryAfter) {
                    errorMessage = `Rate limit exceeded. Please wait ${errorData.retryAfter} seconds before trying again.`;
                } else if (response.statusText) {
                    errorMessage = response.statusText;
                }

                throw new Error(errorMessage);
            }

            let data = null;
            if (response.status !== 204) {
                const text = await response.text();
                if (text) {
                    try {
                        data = JSON.parse(text);
                    } catch (parseError) {
                        console.error('Failed to parse response JSON', parseError);
                        data = null;
                    }
                }
            }

            setState({data, loading: false, error: null});
            return data;
        } catch (error) {
            let errorMessage = 'Request failed';
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    errorMessage = 'Request was cancelled';
                } else {
                    errorMessage = error.message;
                }
            }
            setState(prev => ({...prev, loading: false, error: errorMessage}));
            throw error;
        }
    }, [accessToken, signOut]);

    const fetchOrganizations = useCallback(async () => {
        return request('/api/v1/auth/organizations', {requireAuth: false});
    }, [request]);

    const fetchUserOrganizations = useCallback(async () => {
        return request('/api/v1/settings/user/organizations');
    }, [request]);

    const fetchAccount = useCallback(async () => {
        return request('/api/v1/settings/user');
    }, [request]);

    const fetchUsers = useCallback(async ({limit = 50, offset = 0} = {}) => {
        const query = new URLSearchParams({limit: String(limit), offset: String(offset)}).toString();
        return request(`/api/v1/admin/users?${query}`);
    }, [request]);

    const fetchConversations = useCallback(async () => {
        return request('/api/v1/chat/conversations');
    }, [request]);

    const fetchConversationMessages = useCallback(async (conversationId) => {
        if (!conversationId) {
            throw new Error('conversationId is required');
        }
        return request(`/api/v1/chat/conversations/${conversationId}/messages`);
    }, [request]);

    const fetchDocuments = useCallback(async ({page = 1, pageSize = 100} = {}) => {
        const query = new URLSearchParams({page: String(page), page_size: String(pageSize)}).toString();
        return request(`/api/v1/files?${query}`);
    }, [request]);

    const fetchQuotaInfo = useCallback(async () => {
        return request('/api/v1/quota/info');
    }, [request]);

    const fetchTelemetrySummary = useCallback(async ({range = '7d'} = {}) => {
        const params = new URLSearchParams({range});
        return request(`/api/v1/admin/analytics/summary?${params.toString()}`);
    }, [request]);

    const fetchTelemetryTrends = useCallback(async (params = {}) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, String(value));
            }
        });
        const query = searchParams.toString();
        const endpoint = query ? `/api/v1/admin/analytics/trends?${query}` : '/api/v1/admin/analytics/trends';
        return request(endpoint);
    }, [request]);

    const createConversation = useCallback(async (payload) => {
        return request('/api/v1/chat/conversations', {
            method: 'POST',
            body: payload,
        });
    }, [request]);

    const renameConversation = useCallback(async (conversationId, title) => {
        if (!conversationId) {
            throw new Error('conversationId is required');
        }
        if (!title || !title.trim()) {
            throw new Error('title is required');
        }
        return request(`/api/v1/chat/conversations/${conversationId}`, {
            method: 'PATCH',
            body: {title: title.trim()},
        });
    }, [request]);

    const deleteConversation = useCallback(async (conversationId) => {
        if (!conversationId) {
            throw new Error('conversationId is required');
        }
        return request(`/api/v1/chat/conversations/${conversationId}`, {
            method: 'DELETE',
        });
    }, [request]);

    const createUser = useCallback(async (payload) => {
        return request('/api/v1/admin/users', {
            method: 'POST',
            body: payload,
        });
    }, [request]);

    const sendConversationMessage = useCallback(async (conversationId, payload, options = {}) => {
        if (!conversationId) {
            throw new Error('conversationId is required');
        }
        return request(`/api/v1/chat/conversations/${conversationId}/messages`, {
            method: 'POST',
            body: payload,
            signal: options.signal,
        });
    }, [request]);

    const uploadDocument = useCallback(async (formData) => {
        if (!(formData instanceof FormData)) {
            throw new Error('formData must be an instance of FormData');
        }
        return request('/api/v1/files/upload', {
            method: 'POST',
            body: formData,
        });
    }, [request]);

    const deleteDocument = useCallback(async (documentId) => {
        if (!documentId) {
            throw new Error('documentId is required');
        }
        return request(`/api/v1/files/${documentId}`, {
            method: 'DELETE',
        });
    }, [request]);

    const reset = useCallback(() => {
        setState({data: null, loading: false, error: null});
    }, []);

    return {
        ...state,
        request,
        reset,
        fetchOrganizations,
        fetchUserOrganizations,
        fetchAccount,
        fetchUsers,
        fetchConversations,
        fetchConversationMessages,
        fetchDocuments,
        fetchQuotaInfo,
        fetchTelemetrySummary,
        fetchTelemetryTrends,
        createConversation,
        renameConversation,
        deleteConversation,
        createUser,
        sendConversationMessage,
        uploadDocument,
        deleteDocument,
    };
}

// Specialized hook for streaming responses
export function useStreamingApi() {
    const {accessToken} = useAuth();
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState(null);

    const streamRequest = useCallback(async (endpoint, config, onChunk, onComplete) => {
        setIsStreaming(true);
        setError(null);

        try {
            const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

            const headers = {
                'Content-Type': 'application/json',
                ...(config.headers || {}),
            };

            if (accessToken) {
                headers['Authorization'] = `Bearer ${accessToken}`;
            }

            const response = await fetch(url, {
                method: config.method || 'POST',
                headers,
                body: config.body ? JSON.stringify(config.body) : undefined,
            });

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;

                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch {
                    errorMessage = response.statusText || errorMessage;
                }

                throw new Error(errorMessage);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const {done, value} = await reader.read();

                if (done) break;

                buffer += decoder.decode(value, {stream: true});

                // Process complete lines
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.trim().startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.type === 'error') {
                                throw new Error(data.error);
                            } else if (data.type === 'done') {
                                onComplete(data);
                            } else {
                                onChunk(data);
                            }
                        } catch (parseError) {
                            console.error('Error parsing SSE data:', parseError);
                        }
                    }
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Stream failed';
            setError(errorMessage);
            throw error;
        } finally {
            setIsStreaming(false);
        }
    }, [accessToken]);

    return {
        streamRequest,
        isStreaming,
        error,
        setError,
    };
}
