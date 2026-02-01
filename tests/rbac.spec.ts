import { test, expect } from '@playwright/test';
import { setupMocks } from './test-utils';
import { createRole } from './factories';
import { AUTH_USERS, STORAGE_STATE } from './fixtures/auth';

/**
 * RBAC Matrix View E2E Tests
 * 
 * Tests the admin-only RBAC permission matrix visualization.
 */

const admin = AUTH_USERS.admin;
const regularUser = AUTH_USERS.user;

// Mock role data mirroring the database schema
const mockRoles = [
    createRole({
        id: 'role-admin',
        name: 'Administrator',
        slug: 'admin',
        type: 'global',
        permissions: ['users:create', 'users:update', 'users:delete', 'roles:read', 'events:update:any']
    }),
    createRole({
        id: 'role-user',
        name: 'Benutzer',
        slug: 'user',
        type: 'global',
        permissions: ['events:read', 'resources:read', 'groups:read']
    }),
    createRole({
        id: 'role-coach',
        name: 'Trainer',
        slug: 'coach',
        type: 'group',
        permissions: ['posts:create', 'posts:read']
    })
];

test.describe('RBAC Matrix View - Admin Access', () => {
    test.beforeEach(async ({ page }) => {
        await setupMocks(page, admin, {
            'GET /roles': { data: mockRoles }
        });
    });

    test('Admin can access the RBAC matrix page', async ({ page }) => {
        await page.goto('/settings/rbac');

        // Wait for page to load
        await expect(page.getByRole('heading', { name: 'Berechtigungsmatrix' })).toBeVisible();
        await expect(page.getByText('Übersicht aller Rollen')).toBeVisible();
    });

    test('Matrix displays all roles as columns', async ({ page }) => {
        await page.goto('/settings/rbac');
        await expect(page.getByText('Berechtigungsmatrix')).toBeVisible();

        // Check for role names in header
        await expect(page.getByRole('columnheader', { name: /Administrator/i })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: /Benutzer/i })).toBeVisible();
    });

    test('Matrix displays permissions grouped by resource', async ({ page }) => {
        await page.goto('/settings/rbac');
        await expect(page.getByText('Berechtigungsmatrix')).toBeVisible();

        // Check for resource groupings
        await expect(page.getByText('Resource: users')).toBeVisible();
        await expect(page.getByText('Resource: events')).toBeVisible();

        // Check for specific permissions
        await expect(page.getByText('users:create')).toBeVisible();
        await expect(page.getByText('events:read')).toBeVisible();
    });

    test('Sidebar shows RBAC link for admin', async ({ page }) => {
        await page.goto('/');

        const sidebar = page.locator('aside');
        await expect(sidebar.getByText('Berechtigungen')).toBeVisible();
    });
});

test.describe('RBAC Matrix View - Authorization', () => {
    test('Non-admin cannot see sidebar link', async ({ page }) => {
        await setupMocks(page, regularUser, {});
        await page.goto('/');

        const sidebar = page.locator('aside');
        await expect(sidebar.getByText('Berechtigungen')).not.toBeVisible();
    });

    test('Non-admin gets error if navigating directly', async ({ page }) => {
        await setupMocks(page, regularUser, {
            'GET /roles': async (route: any) => {
                await route.fulfill({
                    status: 403,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        errors: [{ status: '403', title: 'Forbidden', detail: 'You do not have permission to access this resource.' }]
                    })
                });
            }
        });

        await page.goto('/settings/rbac');

        await expect(page.getByText('Zugriff verweigert oder Fehler')).toBeVisible();
    });
});
