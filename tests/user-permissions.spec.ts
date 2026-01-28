import { test, expect, type Page } from '@playwright/test';

// Define Mock Data locally
const mockAdmin = {
    id: '1',
    type: 'users',
    attributes: {
        name: 'Doe',
        'first-name': 'John',
        email: 'admin@example.com',
        status: 3, // Admin
        'is-active': true,
        permissions: ['users:create', 'users:edit', 'users:delete', 'items:read'], // Auth store permissions
        role: { slug: 'admin', name: 'Administrator' },
        effective_permissions: {
            global: {
                role: 'admin',
                roleName: 'Administrator',
                permissions: ['users:create', 'users:edit', 'users:delete', 'items:read']
            },
            contexts: []
        }
    }
};

const mockUserWithContext = {
    id: '2',
    type: 'users',
    attributes: {
        name: 'Smith',
        'first-name': 'Jane',
        email: 'user@example.com',
        status: 1, // Active
        'is-active': true,
        role: { slug: 'user', name: 'Benutzer' },
        effective_permissions: {
            global: {
                role: 'user',
                roleName: 'Benutzer',
                permissions: ['items:read']
            },
            contexts: [
                {
                    id: 'group_test_1',
                    name: 'Test Group A',
                    role: 'coach',
                    roleName: 'Trainer',
                    permissions: ['posts:create']
                }
            ]
        }
    }
};

// Simplified Mock API Helper
async function mockApiInternal(page: Page, handlers: Record<string, any>) {
    await page.route((url) => url.toString().includes('/api/') || url.hostname === 'api.coachboat-planer.de', async (route) => {
        const url = new URL(route.request().url());
        let path = url.pathname.replace('/api', '');
        const method = route.request().method();
        const key = `${method} ${path}`;

        if (handlers[key]) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(handlers[key]),
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
            return;
        }

        // Handle regex keys
        for (const [pattern, handler] of Object.entries(handlers)) {
            if (pattern.startsWith('^') && path.match(new RegExp(pattern))) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(handler),
                    headers: { 'Access-Control-Allow-Origin': '*' }
                });
                return;
            }
        }

        await route.fulfill({ status: 404, body: 'Not Found' });
    });
}

test.describe('User Permissions', () => {
    test.beforeEach(async ({ page }) => {
        // Inject Auth State to bypass login
        await page.addInitScript((user) => {
            const state = {
                user: {
                    id: user.id,
                    email: user.attributes.email,
                    name: user.attributes.name,
                    firstName: user.attributes['first-name'],
                    permissions: user.attributes.permissions,
                    isActive: true
                },
                accessToken: 'mock_token',
                refreshToken: 'mock_refresh'
            };
            localStorage.setItem('coachboat_auth', JSON.stringify(state));
        }, mockAdmin);

        // Setup API Mocks
        await mockApiInternal(page, {
            'GET /users': { data: [mockAdmin, mockUserWithContext] },
            [`GET /users/${mockAdmin.id}`]: { data: mockAdmin },
            [`GET /users/${mockUserWithContext.id}`]: { data: mockUserWithContext },
            'GET /todos': { data: [] }, // Dashboard calls
            'GET /resources': { data: [] },
            'GET /groups': { data: [] },
            'GET /events': { data: [] }
        });
    });

    test('can view user permissions via modal', async ({ page }) => {
        // Navigate directly to users page (auth is already injected)
        await page.goto('/users');

        // Find the second user (Jane Smith) and open menu
        const userRow = page.locator('tr').filter({ hasText: 'Jane' });
        await expect(userRow).toBeVisible();

        // Click the kebab menu
        await userRow.locator('button').first().click();

        // Click "Berechtigungen"
        await page.getByRole('button', { name: 'Berechtigungen' }).click();

        // Check if modal title is correct (Edit User)
        // We can find the dialog first to scope everything
        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible();
        await expect(modal.getByText('Benutzer bearbeiten')).toBeVisible();

        // Check tabs
        await expect(modal.getByText('Details', { exact: true })).toBeVisible();
        await expect(modal.getByText('Berechtigungen', { exact: true })).toBeVisible();

        // Ensure Permissions tab is active (colored blue)
        const permTab = modal.getByRole('button', { name: 'Berechtigungen' });
        await expect(permTab).toHaveClass(/text-blue-600/);

        // Verify Global Permissions
        await expect(modal.getByText('Globale Berechtigungen')).toBeVisible();
        await expect(modal.getByText('Benutzer', { exact: true })).toBeVisible(); // Role name
        await expect(modal.getByText('items:read')).toBeVisible(); // Permission badge

        // Verify Context Permissions
        await expect(modal.getByText('Gruppenberechtigungen')).toBeVisible();
        await expect(modal.getByText('Test Group A')).toBeVisible();
        await expect(modal.getByText('Trainer')).toBeVisible(); // Role name
        await expect(modal.getByText('posts:create')).toBeVisible(); // Permission badge
    });
});
