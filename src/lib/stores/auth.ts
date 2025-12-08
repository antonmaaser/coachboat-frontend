import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface User {
    id: string;
    email?: string;
    name?: string;
    firstName?: string;
    status?: number; // 0=inactive, 1=active, 3=admin etc.
}

export interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
}

const initialState: AuthState = {
    user: null,
    accessToken: null,
    refreshToken: null
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
