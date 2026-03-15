import { type Page, expect } from '@playwright/test';

const DEBUG = process.env.DEBUG === 'true';

export async function mockApi(page: Page, handlers: Record<string, any>) {
    // API Mock
    await page.route((url) => url.toString().includes('/api/') || url.hostname === 'api.coachboat-planer.de', async (route) => {
        const url = new URL(route.request().url());
        let path = url.pathname;
        if (path.startsWith('/api')) {
            path = path.replace('/api', '');
        }
        const method = route.request().method();
        const key = `${method} ${path}`;
        if (DEBUG) console.log(`[API] Intercepted: ${method} ${url.toString()} -> Key: '${key}'`);
        // if (DEBUG) console.log(`[API] Available keys:`, Object.keys(handlers));

        // Exact match
        if (handlers[key]) {
            const response = handlers[key];
            if (typeof response === 'function') {
                await response(route);
                return;
            }
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(response),
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
            return;
        }

        // Pattern matching
        for (const [pattern, handler] of Object.entries(handlers)) {
            try {
                if (path.match(new RegExp(pattern))) {
                    if (typeof handler === 'function') {
                        await handler(route);
                        return;
                    }
                    await route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify(handler),
                        headers: { 'Access-Control-Allow-Origin': '*' }
                    });
                    return;
                }
            } catch (e) {
                // Ignore invalid regex
            }
        }

        if (DEBUG) console.warn(`Unmocked API call: ${method} ${path} (${url.toString()})`);
        await route.fulfill({ status: 404, body: 'Not Found', headers: { 'Access-Control-Allow-Origin': '*' } });
    });

    // Auth Mock
    await page.route((url) => url.toString().includes('/auth/') || url.hostname === 'auth.coachboat-planer.de', async (route) => {
        const url = new URL(route.request().url());
        let path = url.pathname;
        if (path.startsWith('/auth')) {
            path = path.replace('/auth', '');
        }
        const method = route.request().method();
        const key = `AUTH ${method} ${path}`;
        if (DEBUG) console.log(`[AUTH] Intercepted: ${method} ${url.toString()} -> Key: '${key}'`);

        if (handlers[key]) {
            const response = handlers[key];
            if (typeof response === 'function') {
                await response(route);
                return;
            }
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(response),
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
            return;
        }

        if (DEBUG) console.warn(`Unmocked AUTH call: ${method} ${path} (${url.toString()})`);
        await route.continue();
    });
}

function getCommonHandlers(user: any) {
    return {
        'AUTH POST /token': {
            access_token: 'fake-access-token',
            refresh_token: 'fake-refresh-token',
            user_id: user.id,
            organizationId: user.organizationId || null,
        },
        [`GET /users/${user.id}`]: {
            data: {
                attributes: {
                    email: user.email,
                    name: user.name,
                    'first-name': user.firstName,
                    status: user.status,
                    permissions: user.permissions,
                    effective_permissions: user.effective_permissions,
                    organizations: user.organizationId
                        ? [{ id: user.organizationId, name: 'Test Org', slug: 'test-org' }]
                        : [],
                }
            }
        },
        'GET /todos': [],
        'GET /resources': [],
        'GET /groups': [],
        'GET /resource-categories': [],
        'GET /events': [],
        'GET /forms': { data: [] },
        'GET /notifications': { data: [] },
    };
}

export async function setupMocks(page: Page, user: any, extraHandlers: Record<string, any> = {}) {
    const commonHandlers = getCommonHandlers(user);
    await mockApi(page, { ...commonHandlers, ...extraHandlers });

    // Ensure user permissions/context are correctly set in localStorage for the test
    if (user.permissions || user.effective_permissions || user.organizationId) {
        await page.addInitScript(({ permissions, effectivePermissions, organizationId }) => {
            try {
                const stored = localStorage.getItem('coachboat_auth');
                if (stored) {
                    const state = JSON.parse(stored);
                    if (state.user) {
                        if (permissions) {
                            state.user.permissions = permissions;
                        }
                        if (effectivePermissions) {
                            state.user.effective_permissions = effectivePermissions;
                        }
                        if (organizationId) {
                            state.organizationId = organizationId;
                        }
                        localStorage.setItem('coachboat_auth', JSON.stringify(state));
                    }
                }
            } catch (e) { }
        }, {
            permissions: user.permissions,
            effectivePermissions: user.effective_permissions,
            organizationId: user.organizationId || null,
        });
    }
}

export async function setupAndLogin(page: Page, user: any, extraHandlers: Record<string, any> = {}) {
    await setupMocks(page, user, extraHandlers);

    await page.goto('/login');
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
}
