import { get } from 'svelte/store';
import { auth, logout } from '../stores/auth';
import { API_BASE, AUTH_BASE } from '../config';

type QueryParamValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryParamValue | QueryParamValue[]>;

interface RequestOptions extends RequestInit {
    params?: QueryParams;
    headers?: Record<string, string>;
    skipAuth?: boolean;
    organizationId?: string | null;
}

function buildQueryString(params: QueryParams): string {
    const query = new URLSearchParams();

    for (const [key, rawValue] of Object.entries(params)) {
        const values = Array.isArray(rawValue) ? rawValue : [rawValue];
        for (const value of values) {
            if (value === null || value === undefined) continue;
            query.append(key, String(value));
        }
    }

    return query.toString();
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
                organizationId: data.organizationId ?? s.organizationId // Update organization context
            }));
            return true;
        }
    } catch (e) {
        console.error('RefreshToken failed', e);
    }
    return false;
}

export async function client<T = any>(endpoint: string, options: RequestOptions = {}): Promise<Response & { json: () => Promise<T>; ok: boolean; status: number; }> {
    const { params, skipAuth, organizationId, ...init } = options;
    const isAbsolute = endpoint.startsWith('http');

    // Determine base URL (Auth endpoints go to AUTH_BASE, others API_BASE)
    // Constants are relative paths (proxied).
    // If endpoint starts with http, use it as is.
    // If endpoint starts with AUTH_BASE, use it as is (relative to root).
    // Otherwise, prepend API_BASE.
    let url = endpoint;
    let isApiRequest = false;
    if (!isAbsolute) {
        if (!endpoint.startsWith(AUTH_BASE)) {
            url = `${API_BASE}${endpoint}`;
            isApiRequest = true;
        }
    }

    if (params) {
        const query = buildQueryString(params);
        if (query) {
            url += `${url.includes('?') ? '&' : '?'}${query}`;
        }
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

    const resolvedOrgId = organizationId === undefined ? (state.organizationId ?? null) : organizationId;
    if (isApiRequest && typeof resolvedOrgId === 'string' && resolvedOrgId.trim() !== '') {
        headers.set('X-Organization-Id', resolvedOrgId);
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
                organizationId: data.organizationId ?? s.organizationId
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
