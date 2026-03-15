import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { get } from 'svelte/store';

export interface Organization {
    id: string;
    name: string;
    slug: string;
}

export interface User {
    id: string;
    email?: string;
    name?: string;
    firstName?: string;
    isActive?: boolean;
    status?: number; // Legacy status field (deprecated, use permissions)
    permissions?: string[]; // Legacy RBAC permissions (kept for backward compatibility)
    effective_permissions?: {
        global: { role: string; roleName: string; permissions: string[] } | null;
        contexts: {
            id: string;
            name: string;
            role: string;
            roleName: string;
            permissions: string[];
        }[];
    };
    organizations?: Organization[];
}

export interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    organizationId?: string | null;
}

const initialState: AuthState = {
    user: null,
    accessToken: null,
    refreshToken: null,
    organizationId: null
};

const getStoredAuth = (): AuthState => {
    if (!browser) return initialState;
    try {
        const stored = localStorage.getItem('coachboat_auth');
        return stored ? JSON.parse(stored) : initialState;
    } catch {
        return initialState;
    }
};

export const auth = writable<AuthState>(getStoredAuth());

if (browser) {
    auth.subscribe((value) => {
        if (value.accessToken) {
            localStorage.setItem('coachboat_auth', JSON.stringify(value));
        } else {
            localStorage.removeItem('coachboat_auth');
        }
    });
}

export const logout = () => {
    auth.set(initialState);
    if (browser) {
        localStorage.removeItem('coachboat_auth');
        // Optional: window.location.href = '/login';
    }
};

export const hasPermission = (
    user: User | null,
    permission: string,
    contextId?: string | null,
): boolean => {
    if (!user) return false;

    // 1. Check Global Permissions (from effective_permissions.global)
    if (user.effective_permissions?.global?.permissions.includes(permission)) {
        return true;
    }

    // 2. Check Context Permissions (from effective_permissions.contexts)
    const resolvedContextId =
        contextId === undefined ? (get(auth).organizationId ?? null) : contextId;
    if (resolvedContextId && user.effective_permissions?.contexts) {
        const context = user.effective_permissions.contexts.find(
            (c) => c.id === resolvedContextId,
        );
        if (context && context.permissions.includes(permission)) {
            return true;
        }
    }

    // 3. Fallback: Legacy permissions array (global)
    if (user.permissions && user.permissions.includes(permission)) {
        return true;
    }

    return false;
};
