import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const AuthContext = createContext(undefined);

async function readJsonSafe(res) {
    const text = await res.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function extractErrorMessage(data) {
    if (!data) return '';

    if (typeof data === 'string') return data;

    if (typeof data.detail === 'string') return data.detail;

    if (Array.isArray(data.detail) && data.detail.length) {
        const first = data.detail[0] || {};
        const loc = Array.isArray(first.loc) ? first.loc.filter(Boolean).join('.') : '';
        const msg = first.msg || first.message || 'Invalid value';
        return loc ? `${loc}: ${msg}` : msg;
    }

    if (typeof data.error === 'string') return data.error;
    if (typeof data.message === 'string') return data.message;

    return '';
}

const areUsersEqual = (a, b) => {
    if (a === b) {
        return true;
    }

    if (!a || !b) {
        return false;
    }

    const keysToCompare = ['id', 'email', 'role', 'organizationId', 'displayName', 'createdAt', 'lastLoginAt'];
    return keysToCompare.every((key) => {
        const valueA = a[key] ?? null;
        const valueB = b[key] ?? null;
        return valueA === valueB;
    });
};

const normalizeUser = (rawUser) => {
    if (!rawUser) {
        return null;
    }

    const roleValue = (rawUser.role ?? '').toString().toLowerCase();
    const normalizedRole = roleValue === 'admin' ? 'admin' : 'user';
    const organizationId = rawUser.organizationId ?? rawUser.organization_id ?? null;
    const displayName =
        rawUser.displayName ||
        rawUser.display_name ||
        rawUser.name ||
        rawUser.email ||
        '';

    return {
        ...rawUser,
        role: normalizedRole,
        organizationId,
        organization_id: organizationId,
        displayName,
        name: displayName,
        createdAt: rawUser.createdAt ?? rawUser.created_at ?? null,
        lastLoginAt: rawUser.lastLoginAt ?? rawUser.last_login_at ?? null,
    };
};

export function AuthProvider({children}) {
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const clearError = useCallback(() => setError(null), []);

    const persistUser = useCallback((nextUser) => {
        if (nextUser) {
            localStorage.setItem('user', JSON.stringify(nextUser));
        } else {
            localStorage.removeItem('user');
        }
    }, []);

    const clearStoredAuth = useCallback(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
    }, []);

    const updateUserFromProfile = useCallback((profile) => {
        const normalized = normalizeUser(profile);
        setUser((previous) => {
            if (areUsersEqual(previous, normalized)) {
                return previous;
            }
            return normalized;
        });
        persistUser(normalized);
        return normalized;
    }, [persistUser]);

    const signOut = useCallback(async () => {
        setUser(null);
        setAccessToken(null);
        setError(null);
        clearStoredAuth();
    }, [clearStoredAuth]);

    const fetchUserProfile = useCallback(
        async (tokenOverride) => {
            const tokenToUse = tokenOverride ?? accessToken ?? localStorage.getItem('accessToken');
            if (!tokenToUse) {
                throw new Error('No access token available');
            }

            const response = await fetch(`${API_BASE_URL}/api/v1/settings/user`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${tokenToUse}`,
                },
            });

            const text = await response.text();
            let data = null;
            if (text) {
                try {
                    data = JSON.parse(text);
                } catch (parseError) {
                    console.error('Failed to parse user profile response', parseError);
                }
            }

            if (!response.ok) {
                if (response.status === 401) {
                    await signOut();
                    throw new Error('Session expired. Please sign in again.');
                }

                const message = data?.detail || data?.error || `Failed to load user profile (${response.status})`;
                throw new Error(message);
            }

            if (!data) {
                throw new Error('Invalid user profile response');
            }

            return updateUserFromProfile(data);
        },
        [accessToken, signOut, updateUserFromProfile]
    );

    // Restore authentication state from localStorage
    useEffect(() => {
        const storedToken = localStorage.getItem('accessToken');
        const storedUserRaw = localStorage.getItem('user');

        const restore = async () => {
            try {
                if (storedToken) {
                    setAccessToken(storedToken);
                }

                if (storedUserRaw) {
                    try {
                        const parsedUser = JSON.parse(storedUserRaw);
                        updateUserFromProfile(parsedUser);
                    } catch (parseError) {
                        console.error('Failed to parse stored user', parseError);
                        clearStoredAuth();
                    }
                } else if (storedToken) {
                    await fetchUserProfile(storedToken);
                }
            } catch (err) {
                console.error('Failed to restore authentication state', err);
            } finally {
                setLoading(false);
            }
        };

        restore();
    }, [clearStoredAuth, fetchUserProfile, updateUserFromProfile]);

    const signIn = useCallback(async (email, password) => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email, password}),
            });

            // const text = await res.text();
            // const data = text ? JSON.parse(text) : null;
            const data = await readJsonSafe(res);

            if (!res.ok) {
                // const message = data?.detail?.[0]?.msg || data?.error || 'Email or password is incorrect.';
                const message = extractErrorMessage(data) || `Login failed (${res.status})`;
                throw new Error(message);
            }

            if (!data?.access_token || !data?.user) {
                throw new Error('Invalid login response');
            }

            setAccessToken(data.access_token);
            localStorage.setItem('accessToken', data.access_token);
            updateUserFromProfile(data.user);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Login failed';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, [updateUserFromProfile]);

    // organizationId（UUID）
    const signUp = useCallback(async (email, password, name, organizationId) => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    email,
                    password,
                    display_name: name || null,
                    organization_id: organizationId,
                }),
            });

            // const text = await res.text();
            // const data = text ? JSON.parse(text) : {};
            const data = await readJsonSafe(res);

            if (!res.ok) {
                // const msg =
                //   data.detail?.[0]?.msg ||
                //   data.detail?.[0]?.loc?.join('.') ||
                //   data.error ||
                //   // `Sign up failed (${res.status})`;
                //   `Email already registered`
                const msg = extractErrorMessage(data) || `Sign up failed (${res.status})`;
                throw new Error(msg);
            }

            await signIn(email, password);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Sign up failed';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, [signIn]);

    const refreshUser = useCallback(async () => {
        setError(null);
        try {
            return await fetchUserProfile();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to refresh user';
            setError(message);
            throw err;
        }
    }, [fetchUserProfile]);

    const value = {
        user,
        accessToken,
        signIn,
        signUp,
        signOut,
        refreshUser,
        updateUserFromProfile,
        loading,
        error,
        clearError,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return ctx;
}
