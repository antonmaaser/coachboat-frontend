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
            description: 'Intense rowing session',
            resource: '201'
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
            'is-hidden': false,
            'category-id': '1'
        }
    },
    {
        id: '202',
        type: 'resources',
        attributes: {
            title: 'Double Scull B',
            description: 'Training boat',
            'is-ready': false,
            'is-hidden': false,
            'category-id': '2'
        }
    }
];

export const mockResourceCategories = [
    {
        id: '1',
        type: 'resource-categories',
        attributes: {
            title: 'Motorboote',
            color: '#3b82f6', // blue-500
            icon: 'Ship'
        }
    },
    {
        id: '2',
        type: 'resource-categories',
        attributes: {
            title: 'Ruderboote',
            color: '#ef4444', // red-500
            icon: 'Anchor'
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
            const userIndex = mockUsers.findIndex(u => u.id === userId);
            const user = mockUsers[userIndex];

            if (options.method === 'PATCH') {
                if (!user) {
                    return new Response(JSON.stringify({ errors: [{ status: '404', title: 'Not Found' }] }), { status: 404 });
                }
                const body = JSON.parse(options.body as string);
                const updates = body.data?.attributes || {};

                // Merge updates
                const updatedUser = {
                    ...user,
                    attributes: { ...user.attributes, ...updates }
                };

                // In a real mock with persistence we'd save this back to mockUsers
                // mockUsers[userIndex] = updatedUser; 

                return new Response(JSON.stringify({ data: updatedUser }), { status: 200 });
            }

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
        if (options.method === 'POST') {
            const body = JSON.parse(options.body as string);
            const newEvent = {
                id: String(Date.now()),
                type: 'events',
                attributes: body.data.attributes
            };
            mockEvents.push(newEvent);
            return new Response(JSON.stringify({ data: newEvent }), { status: 201 });
        }
        const eventId = path.split('/events/')[1];
        if (eventId) {
            const idx = mockEvents.findIndex(e => e.id === eventId);
            if (idx !== -1) {
                if (options.method === 'DELETE') {
                    mockEvents.splice(idx, 1);
                    return new Response(null, { status: 204 });
                }
                if (options.method === 'PATCH') {
                    const body = JSON.parse(options.body as string);
                    mockEvents[idx].attributes = { ...mockEvents[idx].attributes, ...body.data.attributes };
                    return new Response(JSON.stringify({ data: mockEvents[idx] }), { status: 200 });
                }
            }
        }
    }

    // Resources
    if (path.startsWith('/resources')) {
        if (!options.method || options.method === 'GET') {
            return new Response(JSON.stringify({ data: mockResources }), { status: 200 });
        }
        const resourceId = path.split('/resources/')[1];
        if (resourceId && options.method === 'DELETE') {
            const idx = mockResources.findIndex(r => r.id === resourceId);
            if (idx !== -1) mockResources.splice(idx, 1);
            return new Response(null, { status: 204 });
        }
        if (options.method === 'POST') {
            const body = JSON.parse(options.body as string);
            const newRes = {
                id: String(Date.now()),
                type: 'resources',
                attributes: body.data.attributes
            };
            mockResources.push(newRes);
            return new Response(JSON.stringify({ data: newRes }), { status: 201 });
        }
        if (resourceId && options.method === 'PATCH') {
            const idx = mockResources.findIndex(r => r.id === resourceId);
            if (idx !== -1) {
                const body = JSON.parse(options.body as string);
                mockResources[idx].attributes = { ...mockResources[idx].attributes, ...body.data.attributes };
                return new Response(JSON.stringify({ data: mockResources[idx] }), { status: 200 });
            }
        }
    }

    // Resource Categories
    if (path.startsWith('/resource-categories')) {
        if (!options.method || options.method === 'GET') {
            return new Response(JSON.stringify({ data: mockResourceCategories }), { status: 200 });
        }
        if (options.method === 'POST') {
            const body = JSON.parse(options.body as string);
            const newCat = {
                id: String(Date.now()),
                type: 'resource-categories',
                attributes: body.data.attributes
            };
            mockResourceCategories.push(newCat);
            return new Response(JSON.stringify({ data: newCat }), { status: 201 });
        }
        const catId = path.split('/resource-categories/')[1];
        if (catId) {
            const idx = mockResourceCategories.findIndex(c => c.id === catId);
            if (idx !== -1) {
                if (options.method === 'DELETE') {
                    mockResourceCategories.splice(idx, 1);
                    // Set resources with this category to null
                    mockResources.forEach(r => {
                        if (r.attributes['category-id'] === catId) {
                            r.attributes['category-id'] = null as any;
                        }
                    });
                    return new Response(null, { status: 204 });
                }
                if (options.method === 'PATCH') {
                    const body = JSON.parse(options.body as string);
                    mockResourceCategories[idx].attributes = { ...mockResourceCategories[idx].attributes, ...body.data.attributes };
                    return new Response(JSON.stringify({ data: mockResourceCategories[idx] }), { status: 200 });
                }
            }
        }
    }

    return new Response(JSON.stringify({ errors: [{ status: '404', title: 'Route not mocked' }] }), { status: 404 });
}
