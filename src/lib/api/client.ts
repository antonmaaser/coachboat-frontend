import { get } from 'svelte/store';
import { auth, logout } from '../stores/auth';
import { API_BASE, AUTH_BASE } from '../config';

interface RequestOptions extends RequestInit {
    params?: Record<string, string>;
    headers?: Record<string, string>;
    skipAuth?: boolean;
}

async function refreshAccessToken(): Promise<boolean> {
    const state = get(auth);
    if (!state.refreshToken) return false;

    try {
        let res;
        res = await fetch(`${AUTH_BASE}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'refresh_token',
                refresh_token: state.refreshToken
            })
        });

        if (res.ok) {
            const data = await res.json();

            auth.update(s => ({
                ...s,
                accessToken: data.access_token,
                refreshToken: data.refresh_token, // Update if rotated
                user: { ...s.user, id: data.user_id }, // Ensure ID is consistent
                organizationId: data.organizationId // Update organization context
            }));
            return true;
        }
    } catch (e) {
        console.error('RefreshToken failed', e);
    }
    return false;
}

export async function client<T = any>(endpoint: string, options: RequestOptions = {}): Promise<Response & { json: () => Promise<T>; ok: boolean; status: number; }> {
    const { params, skipAuth, ...init } = options;

    // Determine base URL (Auth endpoints go to AUTH_BASE, others API_BASE)
    // Constants are relative paths (proxied).
    // If endpoint starts with http, use it as is.
    // If endpoint starts with AUTH_BASE, use it as is (relative to root).
    // Otherwise, prepend API_BASE.
    let url = endpoint;
    if (!endpoint.startsWith('http')) {
        if (!endpoint.startsWith(AUTH_BASE)) {
            url = `${API_BASE}${endpoint}`;
        }
    }

    if (params) {
        const query = new URLSearchParams(params).toString();
        url += `?${query}`;
    }

    const headers = new Headers(init.headers);
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/vnd.api+json');
    }
    if (!headers.has('Accept')) {
        headers.set('Accept', 'application/vnd.api+json');
    }

    const state = get(auth);
    if (!skipAuth && state.accessToken) {
        headers.set('Authorization', `Bearer ${state.accessToken}`);
    }

    let response;
    response = await fetch(url, { ...init, headers });

    // Handle 401/403 (Token Expired)
    if ((response.status === 401 || response.status === 403) && !skipAuth) {
        // Try refresh
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            // Retry with new token
            const newState = get(auth);
            headers.set('Authorization', `Bearer ${newState.accessToken}`);

            response = await fetch(url, { ...init, headers });
        } else {
            // Refresh failed, logout
            logout();
        }
    }

    // Cast response to intersect with custom json method return type for convenience
    const typedResponse = response as Response & { json: () => Promise<T> };
    return typedResponse;
}

export async function switchOrganization(organizationId: string): Promise<boolean> {
    const state = get(auth);
    if (!state.refreshToken) return false;

    try {
        const res = await fetch(`${AUTH_BASE}/switch-organization`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                refreshToken: state.refreshToken,
                organizationId
            })
        });

        if (res.ok) {
            const data = await res.json();
            auth.update(s => ({
                ...s,
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                organizationId: data.organizationId
            }));

            // Optionally reload page to refresh data context
            window.location.reload();
            return true;
        }
    } catch (e) {
        console.error('Switch Organization failed', e);
    }
    return false;
}
