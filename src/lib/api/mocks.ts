// Basic mock data and handlers
export const mockUsers = [
    {
        id: '1',
        type: 'users',
        attributes: {
            name: 'Doe',
            'first-name': 'John',
            email: 'admin@example.com',
            status: 3 // Admin
        }
    },
    {
        id: '2',
        type: 'users',
        attributes: {
            name: 'Smith',
            'first-name': 'Jane',
            email: 'user@example.com',
            status: 1 // Active
        }
    }
];

export const mockEvents = [
    {
        id: '101',
        type: 'events',
        attributes: {
            title: 'Morning Training',
            date: new Date().toISOString().split('T')[0], // Today
            'start-date': new Date().toISOString(),
            'end-date': new Date(Date.now() + 3600000).toISOString(),
            description: 'Intense rowing session'
        }
    }
];

export const mockResources = [
    {
        id: '201',
        type: 'resources',
        attributes: {
            title: 'Single Scull A',
            description: 'Top tier racing boat',
            'is-ready': true,
            'is-hidden': false
        }
    },
    {
        id: '202',
        type: 'resources',
        attributes: {
            title: 'Double Scull B',
            description: 'Training boat',
            'is-ready': false,
            'is-hidden': false
        }
    }
];

import { API_BASE, AUTH_BASE } from '../config';

export async function handleMockRequest(url: string, options: RequestInit): Promise<Response> {
    console.log(`[MOCK API] ${options.method || 'GET'} ${url}`);

    // Simulate network delay
    await new Promise(r => setTimeout(r, 500));

    // Strip base URLs to get path
    let path = url;
    if (path.startsWith(API_BASE)) path = path.replace(API_BASE, '');
    else if (path.startsWith(AUTH_BASE)) path = path.replace(AUTH_BASE, '');

    // Fallback for localhost if config mismatch in older env
    path = path.replace('http://localhost:3000', '').replace('http://localhost:3001', '');

    // Auth / Token
    if (path.includes('/token') && options.method === 'POST') {
        const body = JSON.parse(options.body as string);
        if (body.grant_type === 'password') {
            if (body.username === 'admin@example.com' && body.password === 'admin') {
                return new Response(JSON.stringify({
                    user_id: '1',
                    access_token: 'mock_access_token_admin',
                    refresh_token: 'mock_refresh_token_admin',
                    expires_in: 3600
                }), { status: 200 });
            }
            if (body.username === 'user@example.com' && body.password === 'user') {
                return new Response(JSON.stringify({
                    user_id: '2',
                    access_token: 'mock_access_token_user',
                    refresh_token: 'mock_refresh_token_user',
                    expires_in: 3600
                }), { status: 200 });
            }
            return new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 });
        }
    }

    // Users
    if (path.startsWith('/users')) {
        if (path === '/users' && (!options.method || options.method === 'GET')) {
            return new Response(JSON.stringify({ data: mockUsers }), { status: 200 });
        }
        const userId = path.split('/users/')[1];
        if (userId) {
            const user = mockUsers.find(u => u.id === userId);
            return user
                ? new Response(JSON.stringify({ data: user }), { status: 200 })
                : new Response(JSON.stringify({ errors: [{ status: '404', title: 'Not Found' }] }), { status: 404 });
        }
    }

    // Events
    if (path.startsWith('/events')) {
        if (!options.method || options.method === 'GET') {
            // In a real mock we would filter by year/month params here
            return new Response(JSON.stringify({ data: mockEvents }), { status: 200 });
        }
    }

    // Resources
    if (path.startsWith('/resources')) {
        if (!options.method || options.method === 'GET') {
            return new Response(JSON.stringify({ data: mockResources }), { status: 200 });
        }
    }

    return new Response(JSON.stringify({ errors: [{ status: '404', title: 'Route not mocked' }] }), { status: 404 });
}
