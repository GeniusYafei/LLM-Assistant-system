import React, {useEffect, useState} from 'react';
import {BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate} from 'react-router-dom';
import {AuthProvider, useAuth} from './contexts/AuthContext.jsx';
import {ThemeProvider} from './contexts/ThemeContext.jsx';
import {LoginPage} from './pages/auth/LoginPage.jsx';
import {SignupPage} from './pages/auth/SignupPage.jsx';
import {ForgotPasswordPage} from './pages/auth/ForgotPasswordPage.jsx';
import {IconSidebar} from './components/layout/IconSidebar.jsx';
import {ChatSidebar} from './components/chat/ChatSidebar.jsx';
import {MobileBottomNav} from './components/layout/MobileBottomNav.jsx';
import {StorageWarningDialog} from './components/storage/StorageWarningDialog.jsx';
import {useApi} from './hooks/useApi.jsx';
import {DashboardPage} from './pages/dashboard/DashboardPage.jsx';
import {DocumentsPage} from './pages/documents/DocumentsPage.jsx';
import {AnalyticsPage} from './pages/analytics/AnalyticsPage.jsx';
import {SettingsPage} from './pages/settings/SettingsPage.jsx';
import {BarChart3, Loader2,} from 'lucide-react';
import {toast, Toaster} from 'sonner';
import {getStorageWarningLevel, isStorageFull, STORAGE_CONFIG,} from './utils/storageConfig.jsx';
import {cn} from './components/ui/utils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const areUsersEqual = (a, b) => {
    if (a === b) return true;
    if (!a || !b) return false;

    const keys = [
        'id',
        'email',
        'name',
        'displayName',
        'role',
        'status',
        'createdAt',
        'lastLogin'
    ];

    return keys.every((key) => {
        const valueA = a[key] ?? null;
        const valueB = b[key] ?? null;
        if (Array.isArray(valueA) && Array.isArray(valueB)) {
            if (valueA.length !== valueB.length) {
                return false;
            }
            return valueA.every((item, index) => item.id === valueB[index]?.id);
        }
        return valueA === valueB;
    });
};

function AuthenticatedApp() {
    const {user, signOut, loading: authLoading, updateUserFromProfile, accessToken} = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [activeConversationId, setActiveConversationId] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [telemetry, setTelemetry] = useState(null);
    const [telemetryRange, setTelemetryRange] = useState('7d');
    const [isGenerating, setIsGenerating] = useState(false);
    const [canRetry, setCanRetry] = useState(false);
    const [lastPrompt, setLastPrompt] = useState(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [storageUsage, setStorageUsage] = useState({
        usedBytes: 0,
        limitBytes: STORAGE_CONFIG.DEFAULT_QUOTA,
        usedConversationBytes: 0,
        usedDocumentBytes: 0,
        warn: false,
    });

    // Organization and filtering state
    const [organizations, setOrganizations] = useState([]);
    const [selectedOrganizationId, setSelectedOrganizationId] = useState(null);
    const [filters, setFilters] = useState({
        organizationId: null,
        timeRange: 'all',
    });
    const [users, setUsers] = useState([]);
    const [currentUserData, setCurrentUserData] = useState(null);
    const [initializedUserId, setInitializedUserId] = useState(null);

    const effectiveUser = React.useMemo(
        () => currentUserData ?? user,
        [currentUserData, user]
    );

    const authUserId = user?.id ?? null;
    const authUserRole = (user?.role || '').toLowerCase();

    // Check if current user is admin
    const isAdmin = React.useMemo(
        () => ((effectiveUser?.role || '').toLowerCase() === 'admin'),
        [effectiveUser]
    );
    const currentPath = location.pathname;
    const isDashboard = currentPath === '/dashboard';

    // Storage management state
    const storageQuota = storageUsage?.limitBytes ?? STORAGE_CONFIG.DEFAULT_QUOTA;
    const storageUsed = storageUsage?.usedBytes ?? 0;
    const storageLevel = getStorageWarningLevel(storageUsed, storageQuota);
    const storageFull = isStorageFull(storageUsed, storageQuota);
    const [showStorageWarning, setShowStorageWarning] = useState(false);
    const [storageWarningLevel, setStorageWarningLevel] = useState(null);
    const lastWarningLevelRef = React.useRef(null);

    // Use refs to prevent concurrent loading without triggering re-renders
    const isLoadingOrgsRef = React.useRef(false);
    const hasLoadedOrgsRef = React.useRef(false);
    const isLoadingUsersRef = React.useRef(false);
    const hasLoadedUsersRef = React.useRef(false);

    const conversationsApi = useApi();
    const conversationApi = useApi();
    const documentsApi = useApi();
    const telemetryApi = useApi();
    const uploadApi = useApi();
    const deleteDocApi = useApi();
    const createConversationApi = useApi();
    const organizationsApi = useApi();
    const usersApi = useApi();
    const createUserApi = useApi();
    const activateUserApi = useApi();
    const deactivateUserApi = useApi();
    const passwordResetApi = useApi();
    const passwordForgotApi = useApi();
    const accountApi = useApi();
    const quotaApi = useApi();
    const userManagementLoading =
        usersApi.loading ||
        createUserApi.loading ||
        activateUserApi.loading ||
        deactivateUserApi.loading;

    const sendAbortControllerRef = React.useRef(null);
    const initializingRef = React.useRef(false);

    const mapOrganization = (org) => ({
        id: org.id,
        name: org.name,
        displayName: org.displayName || org.name,
        type: 'organization',
    });

    const mapConversation = (conv, existing) => ({
        id: conv.id,
        title: conv.title || 'New Conversation',
        status: conv.status,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
        messages: existing?.messages || [],
        messagesLoaded: existing?.messagesLoaded ?? false,
        archived: existing?.archived ?? false,
        storageSize: typeof conv.storage_size === 'number' ? conv.storage_size : existing?.storageSize ?? 0,
    });

    const mapMessage = (message) => {
        const meta = message.meta || {};
        const documentIds = Array.isArray(meta.document_ids)
            ? meta.document_ids
            : [];

        return {
            id: message.id,
            role: message.role,
            content: message.content_md,
            timestamp: message.created_at,
            status: 'completed',
            metadata: meta,
            attachedDocuments: documentIds,
        };
    };

    const parseDocumentDate = (value) => {
        if (!value) return null;
        if (value instanceof Date) return value;

        if (typeof value === 'string') {
            const trimmed = value.trim();
            const tzMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) (AEST|AEDT)$/);

            if (tzMatch) {
                const [, datePart, timePart, tzAbbrev] = tzMatch;
                const offset = tzAbbrev === 'AEDT' ? '+11:00' : '+10:00';
                const parsedTzDate = new Date(`${datePart}T${timePart}${offset}`);

                if (!Number.isNaN(parsedTzDate.getTime())) {
                    return parsedTzDate;
                }
            }

            const parsed = new Date(trimmed);
            if (!Number.isNaN(parsed.getTime())) {
                return parsed;
            }
        }

        return null;
    };

    const mapDocument = (doc) => ({
        id: doc.id,
        name: doc.filename,
        size: doc.size_bytes,
        type: doc.mime_type,
        uploadedAt: parseDocumentDate(doc.created_at) ?? doc.created_at,
        downloadUrl: doc.storage_url,
    });

    const normalizeRoleLabel = (role) => ((role || '').toLowerCase() === 'admin' ? 'admin' : 'user');

    // Reset state when authentication changes
    useEffect(() => {
        if (!authUserId) {
            setCurrentUserData(null);
            setOrganizations([]);
            setSelectedOrganizationId(null);
            setFilters({organizationId: null, timeRange: 'all'});
            setConversations([]);
            setActiveConversationId(null);
            setDocuments([]);
            setTelemetry(null);
            setUsers([]);
            setStorageUsage({
                usedBytes: 0,
                limitBytes: STORAGE_CONFIG.DEFAULT_QUOTA,
                usedConversationBytes: 0,
                usedDocumentBytes: 0,
                warn: false,
            });
            hasLoadedOrgsRef.current = false;
            hasLoadedUsersRef.current = false;
            isLoadingOrgsRef.current = false;
            isLoadingUsersRef.current = false;
            initializingRef.current = false;
            setInitializedUserId(null);
            return;
        }

        if (initializedUserId && initializedUserId !== authUserId) {
            hasLoadedOrgsRef.current = false;
            hasLoadedUsersRef.current = false;
            isLoadingOrgsRef.current = false;
            isLoadingUsersRef.current = false;
            setSelectedOrganizationId(null);
            setFilters(prev => ({...prev, organizationId: null}));
            setInitializedUserId(null);
        }
    }, [authUserId, initializedUserId]);

    // Load initial data once the user is authenticated
    useEffect(() => {
        if (!authUserId || initializingRef.current) {
            return;
        }

        const alreadyInitialized = initializedUserId === authUserId && (!isAdmin || hasLoadedUsersRef.current);
        if (alreadyInitialized) {
            return;
        }

        let cancelled = false;
        initializingRef.current = true;

        const initializeData = async () => {
            try {
                const orgs = await loadOrganizations();
                if (cancelled) return;

                await loadCurrentUser(orgs);
                if (cancelled) return;

                const [convs, docs] = await Promise.all([
                    loadConversations({preloadMessages: true}),
                    loadDocuments(),
                ]);

                await loadQuotaUsage();

                if (!cancelled && authUserRole === 'admin') {
                    await loadUsers();
                    await loadTelemetry({
                        conversationCount: convs.length,
                        documentCount: docs.length,
                    });
                }

                if (!cancelled) {
                    setInitializedUserId(authUserId);
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('Failed to initialize data', error);
                }
            } finally {
                if (!cancelled) {
                    initializingRef.current = false;
                }
            }
        };

        initializeData();

        return () => {
            cancelled = true;
            initializingRef.current = false;
        };
    }, [authUserId, authUserRole, isAdmin, initializedUserId]);

    // Reload conversations when the active organization changes
    useEffect(() => {
        if (!authUserId || !selectedOrganizationId) return;
        loadConversations({preloadMessages: true});
    }, [authUserId, selectedOrganizationId]);

    // Load admin user list when settings page is opened
    useEffect(() => {
        if (!authUserId || location.pathname !== '/settings' || !isAdmin) return;
        if (hasLoadedUsersRef.current) return;

        loadUsers();
    }, [authUserId, location.pathname, isAdmin]);

    const loadOrganizations = async () => {
        if (isLoadingOrgsRef.current) {
            return organizations;
        }

        if (hasLoadedOrgsRef.current && organizations.length > 0) {
            return organizations;
        }

        isLoadingOrgsRef.current = true;

        try {
            let mapped = [];
            const response = await organizationsApi.request('/api/v1/settings/user/organizations');
            if (response?.items) {
                mapped = response.items.map(mapOrganization);
            }

            if (mapped.length === 0 && isAdmin) {
                const allOrgs = await organizationsApi.request('/api/v1/auth/organizations', {requireAuth: true});
                if (Array.isArray(allOrgs)) {
                    mapped = allOrgs.map(mapOrganization);
                }
            }

            setOrganizations(mapped);
            if (!selectedOrganizationId && mapped.length > 0) {
                setSelectedOrganizationId(mapped[0].id);
                setFilters(prev => ({...prev, organizationId: mapped[0].id}));
            }

            hasLoadedOrgsRef.current = true;
            return mapped;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to load organizations');
            return organizations;
        } finally {
            isLoadingOrgsRef.current = false;
        }
    };

    const loadCurrentUser = async (orgsFromLoad = organizations) => {
        try {
            const data = await accountApi.request('/api/v1/settings/user');
            if (!data) return;

            const mappedOrgs = (orgsFromLoad || []).map(org => ({
                id: org.id,
                name: org.displayName || org.name,
                displayName: org.displayName || org.name,
                role: normalizeRoleLabel(data.role),
            }));

            const mappedUser = {
                id: data.id,
                email: data.email,
                name: data.display_name || data.email,
                displayName: data.display_name || data.email,
                role: normalizeRoleLabel(data.role),
                status: 'active',
                createdAt: data.created_at,
                lastLogin: data.last_login_at,
                organizations: mappedOrgs,
            };

            setCurrentUserData(prev => (areUsersEqual(prev, mappedUser) ? prev : mappedUser));

            updateUserFromProfile(data);
        } catch (error) {
            console.error('Failed to load current user', error);
        }
    };

    const loadUsers = async () => {
        if (isLoadingUsersRef.current || hasLoadedUsersRef.current || !isAdmin) {
            return;
        }

        isLoadingUsersRef.current = true;

        try {
            const data = await usersApi.request('/api/v1/admin/users?limit=50&offset=0');
            const items = Array.isArray(data?.items) ? data.items : [];

            const mappedUsers = items.map(userItem => ({
                id: userItem.id,
                name: userItem.display_name || userItem.email,
                email: userItem.email,
                role: normalizeRoleLabel(userItem.role),
                status: userItem.is_active ? 'active' : 'inactive',
                organizations: userItem.organization ? [userItem.organization] : [],
            }));

            setUsers(mappedUsers);
            hasLoadedUsersRef.current = true;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to load users');
            // Prevent repeated automatic retries that can spam the console
            hasLoadedUsersRef.current = true;
        } finally {
            isLoadingUsersRef.current = false;
        }
    };

    const loadConversations = async ({preloadMessages = false} = {}) => {
        try {
            const data = await conversationsApi.request('/api/v1/chat/conversations');
            if (!Array.isArray(data)) {
                setConversations([]);
                return [];
            }

            const mapped = data.map(conv => mapConversation(conv));

            if (preloadMessages && mapped.length > 0) {
                const conversationsWithMessages = await Promise.all(
                    mapped.map(async conv => {
                        try {
                            const msgs = await conversationApi.request(`/api/v1/chat/conversations/${conv.id}/messages`);
                            const mappedMsgs = Array.isArray(msgs) ? msgs.map(mapMessage) : [];
                            return {...conv, messages: mappedMsgs, messagesLoaded: true};
                        } catch {
                            return conv;
                        }
                    })
                );
                setConversations(conversationsWithMessages);
                return conversationsWithMessages;
            }

            setConversations(mapped);
            return mapped;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to load conversations');
            return [];
        }
    };

    const loadConversation = async (conversationId) => {
        try {
            const data = await conversationApi.request(`/api/v1/chat/conversations/${conversationId}/messages`);
            const mapped = Array.isArray(data) ? data.map(mapMessage) : [];

            setConversations(prev =>
                prev.map(conv =>
                    conv.id === conversationId
                        ? {...conv, messages: mapped, messagesLoaded: true}
                        : conv
                )
            );

            return mapped;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to load conversation');
            throw error;
        }
    };

    const loadQuotaUsage = async () => {
        try {
            const data = await quotaApi.request('/api/v1/quota/info');
            const limitBytes = data?.limit_bytes ?? STORAGE_CONFIG.DEFAULT_QUOTA;
            const usedBytes = data?.used_total_bytes ?? 0;
            const usedRatio = data?.used_ratio ?? (limitBytes > 0 ? usedBytes / limitBytes : 0);

            setStorageUsage({
                usedBytes,
                limitBytes,
                usedConversationBytes: data?.used_conv_bytes ?? 0,
                usedDocumentBytes: data?.used_doc_bytes ?? 0,
                warn: usedRatio >= STORAGE_CONFIG.WARNING_THRESHOLD,
            });

            return data;
        } catch (error) {
            console.error('Failed to load quota info', error);
            return null;
        }
    };

    const loadDocuments = async () => {
        try {
            const data = await documentsApi.request('/api/v1/files?page=1&page_size=100');
            const items = Array.isArray(data?.items) ? data.items : [];

            const mapped = items.map(mapDocument);
            setDocuments(mapped);
            // setStorageUsage({
            //   usedBytes: data?.used_bytes ?? 0,
            //   limitBytes: data?.limit_bytes ?? STORAGE_CONFIG.DEFAULT_QUOTA,
            //   warn: Boolean(data?.warn),
            // });
            return mapped;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to load documents');
            return [];
        }
    };

    const loadTelemetry = async ({conversationCount, documentCount, range} = {}) => {
        if (!isAdmin) return;

        const effectiveRange = range || telemetryRange || '7d';

        try {
            setTelemetryRange(effectiveRange);

            const [summary, trends] = await Promise.all([
                telemetryApi.fetchTelemetrySummary({range: effectiveRange}),
                telemetryApi.fetchTelemetryTrends({range: effectiveRange}),
            ]);

            if (!summary || !trends) {
                setTelemetry(null);
                return;
            }

            const currentSummary = summary?.current ?? {};
            const previousSummary = summary?.previous ?? {};

            const dailySource = Array.isArray(trends.daily) ? trends.daily : [];
            const dailyUsage = dailySource.map(point => ({date: point.date, tokens: point.tokens}));

            const hourlyDistribution = Array.isArray(trends.hourly_24h)
                ? trends.hourly_24h.map(point => ({hour: point.hour, tokens: point.tokens}))
                : [];

            setTelemetry({
                totalMessages: currentSummary.total_messages ?? 0,
                totalTokensUsed: currentSummary.tokens_used ?? 0,
                averageLatency: currentSummary.avg_latency_ms ?? 0,
                conversationCount: conversationCount ?? conversations.length,
                documentCount: documentCount ?? documents.length,
                selectedRange: effectiveRange,
                dailyUsage,
                modelUsage: [],
                hourlyDistribution,
                conversationStats: [],
                previousPeriod: {
                    totalMessages: previousSummary.total_messages ?? 0,
                    totalTokensUsed: previousSummary.tokens_used ?? 0,
                    averageLatency: previousSummary.avg_latency_ms ?? 0,
                    successRate: (previousSummary.success_rate ?? 0) * 100,
                },
                performanceMetrics: {
                    uptime: 99.9,
                    successRate: (currentSummary.success_rate ?? 0) * 100,
                    errorRate: Math.max(0, (1 - (currentSummary.success_rate ?? 0)) * 100),
                    avgResponseTime: currentSummary.avg_latency_ms ?? 0,
                },
            });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to load analytics');
        }
    };

    const handleNewConversation = async () => {
        if (!selectedOrganizationId) {
            toast.error('Please select an organization first');
            return null;
        }

        if (storageFull) {
            toast.error('Storage is full. Delete older conversations or documents to continue.');
            setStorageWarningLevel('full');
            setShowStorageWarning(true);
            return null;
        }

        try {
            const created = await createConversationApi.request('/api/v1/chat/conversations', {
                method: 'POST',
                body: {title: 'New Conversation'},
            });

            if (!created) return null;

            const mapped = mapConversation(created);
            setConversations(prev => [mapped, ...prev]);
            setActiveConversationId(mapped.id);
            navigate('/dashboard');
            toast.success('New conversation started');
            return mapped.id;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to create conversation');
            return null;
        }
    };

    const handleSelectOrganization = (organizationId) => {
        setSelectedOrganizationId(organizationId);
        setFilters(prev => ({...prev, organizationId}));
        setActiveConversationId(null); // Clear active conversation when switching orgs
        toast.success('Organization changed');
    };

    const handleFiltersChange = (newFilters) => {
        setFilters(newFilters);
        // Optionally reload conversations with new filters
    };

    const handleTimeRangeChange = (timeRange) => {
        setFilters(prev => ({
            ...prev,
            timeRange
        }));
    };

    const handleCreateUser = async (userData) => {
        if (!isAdmin) return;

        const organizationId = Array.isArray(userData.organizationIds) ? userData.organizationIds[0] : null;
        if (!organizationId) {
            toast.error('Please select an organization for the new user');
            return;
        }

        try {
            const payload = {
                email: userData.email,
                display_name: userData.name,
                role: userData.role === 'admin' ? 'Admin' : 'User',
                organization_id: organizationId,
            };

            const response = await createUserApi.request('/api/v1/admin/users', {
                method: 'POST',
                body: payload,
            });

            if (response?.user) {
                const createdUser = response.user;
                const mappedUser = {
                    id: createdUser.id,
                    name: createdUser.display_name || createdUser.email,
                    email: createdUser.email,
                    role: normalizeRoleLabel(createdUser.role),
                    status: createdUser.is_active ? 'active' : 'inactive',
                    organizations: createdUser.organization ? [createdUser.organization] : [],
                };
                setUsers(prev => [mappedUser, ...prev]);
            }

            toast.success('User created successfully');
            return response;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to create user');
            throw error;
        }
    };

    const handleActivateUser = async (userId) => {
        if (!isAdmin || !userId) return false;

        try {
            await activateUserApi.request(`/api/v1/admin/users/${userId}/activate`, {
                method: 'POST',
                body: {is_active: true},
            });

            setUsers(prev => prev.map(user => (user.id === userId ? {...user, status: 'active'} : user)));
            toast.success('User activated');
            return true;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to activate user');
            throw error;
        }
    };

    const handleDeactivateUser = async (userId) => {
        if (!isAdmin || !userId) return false;

        try {
            await deactivateUserApi.request(`/api/v1/admin/users/${userId}`, {
                method: 'DELETE',
            });

            setUsers(prev => prev.map(user => (user.id === userId ? {...user, status: 'inactive'} : user)));
            toast.success('User deactivated');
            return true;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to deactivate user');
            throw error;
        }
    };

    const handleRequestPasswordCode = async ({email, displayName} = {}) => {
        const targetEmail = email ?? effectiveUser?.email;
        const targetDisplayName = (displayName ?? effectiveUser?.displayName ?? effectiveUser?.name)?.trim();

        if (!targetEmail || !targetDisplayName) {
            toast.error('Unable to determine account details for password reset');
            return null;
        }

        try {
            const response = await passwordForgotApi.request('/api/v1/auth/password/forgot', {
                method: 'POST',
                body: {
                    email: targetEmail,
                    display_name: targetDisplayName,
                },
                requireAuth: false,
            });
            const devCode = response?.code ?? null;
            toast.success(
                devCode
                    ? `Verification code sent to ${targetEmail} (auto-filled below for development).`
                    : `Verification code sent to ${targetEmail}`
            );
            return {code: devCode};
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to send verification code');
            throw error;
        }
    };

    const handleResetPassword = async ({newPassword, confirmPassword, code}) => {
        const email = effectiveUser?.email;
        if (!email) {
            toast.error('Unable to determine account email');
            return false;
        }

        try {
            await passwordResetApi.request('/api/v1/auth/password/reset', {
                method: 'POST',
                body: {
                    email,
                    new_password: newPassword,
                    confirm_password: confirmPassword,
                    code,
                },
                requireAuth: false,
            });
            toast.success('Password updated successfully');
            return true;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to update password');
            throw error;
        }
    };

    const handleUpdateProfile = async (displayName) => {
        const trimmed = displayName?.trim();
        if (!trimmed) {
            toast.error('Display name is required');
            return false;
        }

        try {
            await accountApi.request('/api/v1/settings/user/name', {
                method: 'PATCH',
                body: {display_name: trimmed},
            });

            await loadCurrentUser(organizations);
            toast.success('Profile updated');
            return true;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to update profile');
            throw error;
        }
    };

    const handleSelectConversation = async (conversationId) => {
        setActiveConversationId(conversationId);
        const existing = conversations.find(conv => conv.id === conversationId);
        if (!existing?.messagesLoaded) {
            try {
                await loadConversation(conversationId);
            } catch {
                // Error already handled inside loadConversation
            }
        }
    };

    const handleSendMessage = async (message, attachedDocuments = []) => {
        const trimmed = message?.trim();
        if (!trimmed) return;

        let conversationId = activeConversationId;
        if (!conversationId) {
            conversationId = await handleNewConversation();
        }

        if (!conversationId) return;

        const documentList = Array.from(
            new Set(Array.isArray(attachedDocuments) ? attachedDocuments.filter(Boolean) : [])
        );
        const tempId = `msg-${Date.now()}-user`;
        const assistantTempId = `msg-${Date.now()}-assistant`;

        const userMessage = {
            id: tempId,
            role: 'user',
            content: trimmed,
            timestamp: new Date().toISOString(),
            status: 'completed',
            attachedDocuments: documentList,
            metadata: documentList.length > 0 ? {document_ids: documentList} : {},
        };

        const assistantMessage = {
            id: assistantTempId,
            role: 'assistant',
            content: '',
            timestamp: new Date().toISOString(),
            status: 'generating',
            metadata: {},
            attachedDocuments: [],
        };

        setConversations(prev =>
            prev.map(conv => {
                if (conv.id !== conversationId) return conv;
                const existingMessages = Array.isArray(conv.messages) ? conv.messages : [];
                return {
                    ...conv,
                    messages: [...existingMessages, userMessage, assistantMessage],
                    messagesLoaded: true,
                };
            })
        );

        setLastPrompt({message: trimmed, attachedDocuments: documentList});
        setIsGenerating(true);
        setCanRetry(false);

        const controller = new AbortController();
        sendAbortControllerRef.current = controller;
        let currentAssistantId = assistantTempId;
        let hasReceivedDelta = false;
        const charQueue = [];
        let flushInterval = null;

        const stopFlushInterval = () => {
            if (flushInterval) {
                clearInterval(flushInterval);
                flushInterval = null;
            }
        };

        const flushCharacters = () => {
            if (charQueue.length === 0) {
                stopFlushInterval();
                return;
            }
            const nextChunk = charQueue.splice(0, 3).join('');
            if (nextChunk) {
                updateAssistantMessage(prev => ({
                    ...prev,
                    content: `${prev.content || ''}${nextChunk}`,
                }));
            }
            if (charQueue.length === 0) {
                stopFlushInterval();
            }
        };

        const enqueueCharacters = (text) => {
            if (!text) return;
            for (const char of text) {
                charQueue.push(char);
            }
            if (!flushInterval) {
                flushInterval = setInterval(flushCharacters, 20);
            }
        };

        const updateAssistantMessage = (updater) => {
            setConversations(prev =>
                prev.map(conv => {
                    if (conv.id !== conversationId) return conv;
                    const existingMessages = Array.isArray(conv.messages) ? conv.messages : [];
                    const nextMessages = existingMessages.map(msg => {
                        if (msg.id !== currentAssistantId) return msg;
                        return typeof updater === 'function' ? updater(msg) : {...msg, ...updater};
                    });
                    return {...conv, messages: nextMessages};
                })
            );
        };

        const appendAssistantContent = (delta) => {
            if (!delta) return;
            enqueueCharacters(delta);
        };

        const drainCharacterQueue = () => {
            if (charQueue.length === 0) {
                stopFlushInterval();
                return;
            }
            const remainingText = charQueue.splice(0).join('');
            stopFlushInterval();
            if (remainingText) {
                updateAssistantMessage(prev => ({
                    ...prev,
                    content: `${prev.content || ''}${remainingText}`,
                }));
            }
        };

        try {
            const payload = {content: trimmed};
            if (documentList.length > 0) {
                payload.document_ids = documentList;
            }

            const response = await fetch(
                `${API_BASE_URL}/api/v1/chat/conversations/${conversationId}/messages/stream`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(accessToken ? {Authorization: `Bearer ${accessToken}`} : {}),
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                }
            );

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;
                try {
                    const text = await response.text();
                    if (text) {
                        const parsed = JSON.parse(text);
                        if (parsed?.error) {
                            errorMessage = parsed.error;
                        } else if (parsed?.detail) {
                            errorMessage = typeof parsed.detail === 'string' ? parsed.detail : errorMessage;
                        }
                    }
                } catch {
                    // Ignore parse errors
                }
                throw new Error(errorMessage);
            }

            if (!response.body) {
                throw new Error('Streaming response not supported');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            const processBuffer = () => {
                let boundary = buffer.indexOf('\n\n');
                while (boundary !== -1) {
                    const rawEvent = buffer.slice(0, boundary).trim();
                    buffer = buffer.slice(boundary + 2);
                    if (rawEvent) {
                        const dataLines = rawEvent
                            .split('\n')
                            .filter(line => line.startsWith('data:'))
                            .map(line => line.replace(/^data:\s*/, ''));
                        if (dataLines.length) {
                            let event;
                            try {
                                event = JSON.parse(dataLines.join('\n'));
                            } catch (err) {
                                console.error('Failed to parse stream chunk', err);
                                boundary = buffer.indexOf('\n\n');
                                continue;
                            }

                            if (event.type === 'delta') {
                                hasReceivedDelta = true;
                                appendAssistantContent(event.delta || '');
                            } else if (event.type === 'complete') {
                                if (!hasReceivedDelta && typeof event.answer === 'string' && event.answer) {
                                    appendAssistantContent(event.answer);
                                }
                                updateAssistantMessage(prev => ({
                                    ...prev,
                                    metadata: {
                                        ...(prev.metadata || {}),
                                        usage: event.usage || prev.metadata?.usage,
                                        latency_ms: event.latency_ms ?? prev.metadata?.latency_ms,
                                    },
                                }));
                            } else if (event.type === 'saved') {
                                updateAssistantMessage(prev => ({
                                    ...prev,
                                    id: event.message_id || prev.id,
                                    status: 'completed',
                                    timestamp: new Date().toISOString(),
                                }));
                                if (event.message_id) {
                                    currentAssistantId = event.message_id;
                                }
                            } else if (event.type === 'error') {
                                throw new Error(event.error || 'Streaming error');
                            }
                        }
                    }
                    boundary = buffer.indexOf('\n\n');
                }
            };

            while (true) {
                const {value, done} = await reader.read();
                const chunk = decoder.decode(value || new Uint8Array(), {stream: !done});
                if (chunk) {
                    buffer += chunk.replace(/\r/g, '');
                    processBuffer();
                }
                if (done) {
                    break;
                }
            }

            const remaining = decoder.decode();
            if (remaining) {
                buffer += remaining.replace(/\r/g, '');
                processBuffer();
            }

            sendAbortControllerRef.current = null;
            drainCharacterQueue();
            stopFlushInterval();

            setIsGenerating(false);
            setCanRetry(false);

            const updatedConversations = await loadConversations({preloadMessages: true});
            await loadQuotaUsage();

            setActiveConversationId(conversationId);
            toast.success('Response received');
            if (isAdmin) {
                loadTelemetry({conversationCount: updatedConversations.length});
            }
        } catch (error) {
            sendAbortControllerRef.current = null;
            drainCharacterQueue();
            stopFlushInterval();
            setIsGenerating(false);
            setCanRetry(true);

            const isAbort = error instanceof Error && error.name === 'AbortError';
            setConversations(prev =>
                prev.map(conv => {
                    if (conv.id !== conversationId) return conv;
                    const existingMessages = Array.isArray(conv.messages) ? conv.messages : [];
                    const nextMessages = existingMessages.map(msg => {
                        if (msg.id !== currentAssistantId) return msg;
                        return {...msg, status: isAbort ? 'cancelled' : 'error'};
                    });
                    return {...conv, messages: nextMessages};
                })
            );

            if (isAbort) {
                toast.info('Message sending cancelled');
            } else {
                toast.error(error instanceof Error ? error.message : 'Failed to send message');
            }
        }
    };


    const handleCancelGeneration = () => {
        if (sendAbortControllerRef.current) {
            sendAbortControllerRef.current.abort();
            sendAbortControllerRef.current = null;
        }
        if (activeConversationId) {
            setConversations(prev =>
                prev.map(conv => {
                    if (conv.id !== activeConversationId) return conv;
                    const updatedMessages = (conv.messages || []).map(msg =>
                        msg.role === 'assistant' && msg.status === 'generating'
                            ? {...msg, status: 'cancelled'}
                            : msg
                    );
                    return {...conv, messages: updatedMessages};
                })
            );
        }
        setIsGenerating(false);
        setCanRetry(true);
    };

    const handleRetryGeneration = () => {
        if (lastPrompt) {
            handleSendMessage(lastPrompt.message, lastPrompt.attachedDocuments);
        }
    };

    const handleUploadDocument = async (file) => {
        if (!file) return;

        if (storageFull) {
            toast.error('Storage is full. Delete files before uploading new documents.');
            setStorageWarningLevel('full');
            setShowStorageWarning(true);
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        if (activeConversationId) {
            formData.append('conversation_id', activeConversationId);
        }

        try {
            await uploadApi.request('/api/v1/files/upload', {
                method: 'POST',
                body: formData,
            });
            toast.success(`Uploaded ${file.name}`);
            const docs = await loadDocuments();
            await loadQuotaUsage();
            if (isAdmin) {
                loadTelemetry({documentCount: docs.length});
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to upload document');
            throw error;
        }
    };

    const handleDeleteDocument = async (documentId) => {
        try {
            await deleteDocApi.request(`/api/v1/files/${documentId}`, {method: 'DELETE'});
            toast.success('Document deleted');
            const docs = await loadDocuments();
            await loadQuotaUsage();
            if (isAdmin) {
                loadTelemetry({documentCount: docs.length});
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to delete document');
        }
    };

    const handleDeleteConversation = async (conversationId) => {
        if (!conversationId) {
            toast.error('Invalid conversation');
            return;
        }

        try {
            await conversationApi.deleteConversation(conversationId);

            let updatedList = [];
            setConversations(prev => {
                updatedList = prev.filter(conv => conv.id !== conversationId);
                return updatedList;
            });

            if (activeConversationId === conversationId) {
                setActiveConversationId(updatedList[0]?.id || null);
            }

            await loadQuotaUsage();
            toast.success('Conversation deleted');
            if (isAdmin) {
                loadTelemetry({conversationCount: updatedList.length});
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to delete conversation');
        }
    };

    const handleRenameConversation = async (conversationId, newTitle) => {
        const trimmedTitle = newTitle?.trim();
        if (!conversationId || !trimmedTitle) {
            toast.error('Conversation title is required');
            return;
        }

        try {
            const updated = await conversationApi.renameConversation(conversationId, trimmedTitle);
            if (!updated) return;

            setConversations(prev =>
                prev.map(conv => (conv.id === conversationId ? mapConversation(updated, conv) : conv))
            );

            toast.success('Conversation renamed');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to rename conversation');
        }
    };

    const handleNavigate = (path) => {
        if (path === currentPath) return;
        navigate(path);
    };

    const handleChatHistoryToggle = () => {
        if (!isDashboard) {
            handleNavigate('/dashboard');
            setSidebarCollapsed(false);
            return;
        }
        setSidebarCollapsed(prev => !prev);
    };

    const handleManageStorage = () => {
        navigate('/documents');
    };

    const handleLogout = async () => {
        try {
            await signOut();
            toast.success('Signed out successfully');
            navigate('/login');
        } catch (error) {
            toast.error('Failed to sign out');
        }
    };

    const activeConversation = conversations.find(conv => conv.id === activeConversationId);
    const messages = activeConversation?.messages || [];
    const displayMessages = messages;

    // Check storage warnings and show dialog
    React.useEffect(() => {
        if (!storageLevel) {
            lastWarningLevelRef.current = null;
            return;
        }
        if (lastWarningLevelRef.current === storageLevel) {
            return;
        }
        setStorageWarningLevel(storageLevel);
        setShowStorageWarning(true);
        lastWarningLevelRef.current = storageLevel;
    }, [storageLevel]);

    // Add timeout for loading to prevent infinite hang
    const [loadingTimeout, setLoadingTimeout] = React.useState(false);

    React.useEffect(() => {
        if (authLoading) {
            const timer = setTimeout(() => {
                setLoadingTimeout(true);
            }, 10000); // 10 second timeout
            return () => clearTimeout(timer);
        }
    }, [authLoading]);

    if (authLoading && !loadingTimeout) {
        return (
            <div
                className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
                <div className="text-center space-y-6">
                    {/* JinkoSolar Logo */}
                    <div
                        className="w-32 h-12 mx-auto bg-gray-900 dark:bg-gray-100 rounded-lg flex items-center justify-center mb-8">
                        <span className="text-white dark:text-gray-900 font-bold text-lg tracking-wider">JinkoSolar</span>
                    </div>

                    <div className="space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-600 dark:text-gray-400"/>
                        <div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">JinkoSolar AI
                                Assistant</h3>
                            <p className="text-gray-600 dark:text-gray-400">Initializing your intelligent
                                workspace...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (loadingTimeout) {
        console.warn('Authentication loading timeout - proceeding anyway');
    }

    return (
        <div className="h-screen bg-white dark:bg-gray-900 flex flex-col md:flex-row">
            <div className="hidden md:block">
                <IconSidebar
                    onNewConversation={handleNewConversation}
                    onToggleSidebar={handleChatHistoryToggle}
                    sidebarCollapsed={sidebarCollapsed}
                    telemetry={telemetry}
                    onLoadTelemetry={loadTelemetry}
                    telemetryLoading={telemetryApi.loading}
                    currentPath={currentPath}
                    onNavigate={handleNavigate}
                    user={effectiveUser}
                    onLogout={handleLogout}
                    isAdmin={isAdmin}
                    storageUsed={storageUsed}
                    storageQuota={storageQuota}
                    onShowStorageWarning={() => {
                        setStorageWarningLevel(storageLevel || storageWarningLevel || 'warning');
                        setShowStorageWarning(true);
                    }}
                />
            </div>

            <StorageWarningDialog
                isOpen={showStorageWarning}
                onClose={() => setShowStorageWarning(false)}
                usedBytes={storageUsed}
                quotaBytes={storageQuota}
                level={storageWarningLevel || storageLevel || 'warning'}
                onManageStorage={handleManageStorage}
            />

            {/* {!sidebarCollapsed && isDashboard && (
      <div
        className={cn(
          "hidden md:block w-80 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-all duration-300 ease-in-out overflow-hidden",
          sidebarCollapsed ? "w-0 border-r-0" : "w-80"
        )}
      >
          <ChatSidebar
            conversations={conversations.filter(conv => !conv.archived)}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
            onRenameConversation={handleRenameConversation}
            loading={conversationsApi.loading || createConversationApi.loading || isGenerating}
            timeRange={filters.timeRange}
            onTimeRangeChange={handleTimeRangeChange}
            newChatDisabled={storageFull}
            // documents={documents}
          />
        </div>
      )} */}

            {isDashboard && (
                <div
                    className={cn(
                        "hidden md:block border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-hidden",
                        sidebarCollapsed ? "border-r-0" : "border-r"
                    )}
                    style={{width: sidebarCollapsed ? 0 : 320, transition: 'width 300ms ease'}}
                    aria-hidden={sidebarCollapsed}
                >

                    <ChatSidebar
                        conversations={conversations.filter(conv => !conv.archived)}
                        activeConversationId={activeConversationId}
                        onSelectConversation={handleSelectConversation}
                        onNewConversation={handleNewConversation}
                        onDeleteConversation={handleDeleteConversation}
                        onRenameConversation={handleRenameConversation}
                        loading={conversationsApi.loading || createConversationApi.loading || isGenerating}
                        timeRange={filters.timeRange}
                        onTimeRangeChange={handleTimeRangeChange}
                        newChatDisabled={storageFull}
                        // documents={documents}
                    />

                </div>
            )}


            <div className="flex-1 flex flex-col overflow-hidden mb-16 md:mb-0">
                <Routes>
                    <Route
                        path="/dashboard"
                        element={
                            <DashboardPage
                                filters={filters}
                                onFiltersChange={handleFiltersChange}
                                organizations={organizations}
                                selectedOrganizationId={selectedOrganizationId}
                                onSelectOrganization={handleSelectOrganization}
                                onStartConversation={handleNewConversation}
                                activeConversationId={activeConversationId}
                                displayMessages={displayMessages}
                                isGenerating={isGenerating}
                                canRetry={canRetry}
                                onSendMessage={handleSendMessage}
                                onCancelGeneration={handleCancelGeneration}
                                onRetryGeneration={handleRetryGeneration}
                                documents={documents}
                                onUploadDocument={handleUploadDocument}
                                createConversationLoading={createConversationApi.loading}
                                storageUsed={storageUsed}
                                storageQuota={storageQuota}
                                user={effectiveUser}
                                onManageStorage={handleManageStorage}
                            />
                        }
                    />
                    <Route
                        path="/documents"
                        element={
                            <DocumentsPage
                                documents={documents}
                                onUpload={handleUploadDocument}
                                onDelete={handleDeleteDocument}
                                uploadLoading={uploadApi.loading || deleteDocApi.loading}
                                storageUsed={storageUsage?.usedBytes ?? 0}
                                storageQuota={storageQuota}
                            />
                        }
                    />
                    <Route
                        path="/analytics"
                        element={
                            isAdmin ? (
                                <AnalyticsPage
                                    telemetry={telemetry}
                                    loading={telemetryApi.loading}
                                    selectedRange={telemetryRange}
                                    onRangeChange={(range) => loadTelemetry({range})}
                                    onRefresh={() => loadTelemetry({range: telemetryRange})}
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                    <div className="text-center space-y-6 max-w-2xl px-8">
                                        <div
                                            className="w-20 h-20 mx-auto bg-gray-200 dark:bg-gray-700 rounded-3xl flex items-center justify-center">
                                            <BarChart3 className="h-10 w-10 text-gray-400 dark:text-gray-500"/>
                                        </div>
                                        <div>
                                            <h3 className="text-3xl font-semibold mb-4 text-gray-900 dark:text-white">Access
                                                Restricted</h3>
                                            <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                                                Analytics is only available to administrator users. Contact your admin
                                                for access.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        }
                    />
                    <Route
                        path="/settings"
                        element={
                            <SettingsPage
                                currentUser={currentUserData}
                                users={users}
                                organizations={organizations}
                                onCreateUser={handleCreateUser}
                                onActivateUser={handleActivateUser}
                                onDeactivateUser={handleDeactivateUser}
                                onUpdateProfile={handleUpdateProfile}
                                onRequestAccess={(organizationId) => {
                                    toast.success('Access request submitted. An admin will review your request.');
                                }}
                                onResetPassword={handleResetPassword}
                                onRequestPasswordCode={({email, displayName}) =>
                                    handleRequestPasswordCode({email, displayName})
                                }
                                loading={userManagementLoading}
                                resetPasswordLoading={passwordResetApi.loading}
                                requestPasswordCodeLoading={passwordForgotApi.loading}
                            />
                        }
                    />
                    <Route path="/" element={<Navigate to="/dashboard" replace/>}/>
                    <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
                </Routes>
            </div>

            <MobileBottomNav
                currentPath={currentPath}
                onNavigate={handleNavigate}
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
                onDeleteConversation={handleDeleteConversation}
                conversationsLoading={conversationsApi.loading || createConversationApi.loading || isGenerating}
                isAdmin={isAdmin}
                timeRange={filters.timeRange}
                onTimeRangeChange={handleTimeRangeChange}
            />
        </div>
    );
}

function AuthApp() {
    const {user, signIn, signUp, loading, error} = useAuth();

    const handleLogin = async (email, password) => {
        await signIn(email, password);
    };

    const handleSignup = async (email, password, name, organization) => {
        await signUp(email, password, name, organization);
    };

    if (loading) {
        return (
            <div
                className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
                <div className="text-center space-y-6">
                    {/* JinkoSolar Logo */}
                    <div
                        className="w-32 h-12 mx-auto bg-gray-900 dark:bg-gray-100 rounded-lg flex items-center justify-center mb-8">
                        <span className="text-white dark:text-gray-900 font-bold text-lg tracking-wider">JinkoSolar</span>
                    </div>

                    <div className="space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-600 dark:text-gray-400"/>
                        <div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">JinkoSolar AI
                                Assistant</h3>
                            <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (user) {
        return <AuthenticatedApp/>;
    }

    return (
        <Routes>
            <Route
                path="/login"
                element={
                    <LoginPage
                        onLogin={handleLogin}
                        loading={loading}
                        error={error}
                    />
                }
            />
            <Route
                path="/signup"
                element={
                    <SignupPage
                        onSignup={handleSignup}
                        loading={loading}
                        error={error}
                    />
                }
            />
            <Route
                path="/forgot-password"
                element={<ForgotPasswordPage/>}
            />
            <Route path="*" element={<Navigate to="/login" replace/>}/>
        </Routes>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter>
                    <AuthApp/>
                </BrowserRouter>
                <Toaster position="top-right"/>
            </AuthProvider>
        </ThemeProvider>
    );
}
