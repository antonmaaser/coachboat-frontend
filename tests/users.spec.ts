import { test, expect, type Route } from '@playwright/test';
import { setupMocks } from './test-utils';
import { createUser } from './factories';
import { AUTH_USERS, STORAGE_STATE } from './fixtures/auth';

/**
 * Users Overview Page E2E Tests
 */

// Use standard admin fixture for the authenticated user
const admin = AUTH_USERS.admin;

// Test Data for other users in the list
const user1 = createUser({
    firstName: 'Alpha',
    name: 'Abel', // "Alpha Abel" - Sorts before "Admin" (Admin user)
    email: 'alpha@example.com',
    status: 2,
    role: { slug: 'user', name: 'Benutzer' }
});

const user2 = createUser({
    firstName: 'Zeta',
    name: 'Zussman', // "Zeta Zussman" - Sorts after "Admin"
    email: 'zeta@example.com',
    status: 1,
    role: { slug: 'group_only', name: 'Nur Gruppen' }
});

const inactiveUser = createUser({
    firstName: 'Inactive',
    name: 'Person',
    email: 'inactive@example.com',
    status: 0,
    role: { slug: 'user', name: 'Benutzer' }
});

const toApiUser = (user: any) => ({
    id: user.id,
    attributes: {
        ...user,
        'first-name': user.firstName
    }
});

const nameMatch = (first: string, last: string) => new RegExp(`${first}\\s+${last}`, 'i');

test.describe('Users - Listing & Sorting', () => {
    test.beforeEach(async ({ page }) => {
        // Mock API responses for the page
        // Use the authenticated admin user in the response to match state
        // Use setupMocks to ensure 'GET /users/me' and other defaults are handled
        await setupMocks(page, admin, {
            'GET /users': {
                data: [
                    toApiUser(admin),
                    toApiUser(user1),
                    toApiUser(user2)
                ]
            }
        });
    });

    test('Lists all users with correct role badges', async ({ page }) => {
        await page.goto('/users');
        await expect(page.getByText('Lädt...')).not.toBeVisible();

        const table = page.locator('tbody');
        await expect(table.getByText(nameMatch('System', 'Admin'))).toBeVisible(); // Matches fixtures/auth.ts
        await expect(table.getByText('Administrator')).toBeVisible();

        await expect(table.getByText(nameMatch('Alpha', 'Abel'))).toBeVisible();
        const row1 = table.locator('tr').filter({ hasText: nameMatch('Alpha', 'Abel') });
        await expect(row1.getByText('Benutzer')).toBeVisible();
    });

    test('Sorts users by name (A-Z and Z-A)', async ({ page }) => {
        await page.goto('/users');
        await expect(page.getByText('Lädt...')).not.toBeVisible();

        const rows = page.locator('tbody tr');

        await page.getByRole('button', { name: 'Name' }).click(); // Toggle to Desc (observed behavior)
        // Zeta (Z) > System (S) > Alpha (A)
        await expect(rows.first().getByText(nameMatch('Zeta', 'Zussman'))).toBeVisible();

        await page.getByRole('button', { name: 'Name' }).click(); // Toggle to Asc
        // Alpha (A) first
        await expect(rows.first().getByText(nameMatch('Alpha', 'Abel'))).toBeVisible();
    });

    test('Sorts users by email', async ({ page }) => {
        await page.goto('/users');
        await expect(page.getByText('Lädt...')).not.toBeVisible();

        await page.getByRole('button', { name: 'E-Mail' }).click();
        const rows = page.locator('tbody tr');
        // admin@ starts with a
        await expect(rows.first().getByText('admin@coachboat.com')).toBeVisible();

        await page.getByRole('button', { name: 'E-Mail' }).click();
        await expect(rows.first().getByText('zeta@example.com')).toBeVisible();
    });

    test('Sorts users by status', async ({ page }) => {
        await page.goto('/users');
        await expect(page.getByText('Lädt...')).not.toBeVisible();

        await page.getByRole('button', { name: 'Status' }).click();
        const rows = page.locator('tbody tr');

        // Status sort: Zeta (1) < Alpha (2) < Admin (4)
        await expect(rows.first().getByText(nameMatch('Zeta', 'Zussman'))).toBeVisible();

        await page.getByRole('button', { name: 'Status' }).click();
        // Admin first
        await expect(rows.first().getByText(nameMatch('System', 'Admin'))).toBeVisible();
    });
});

test.describe('Users - Authorization Visibility', () => {
    test('Admin sees all management controls', async ({ page }) => {
        // Main project uses admin storage state by default
        await setupMocks(page, admin, { 'GET /users': { data: [toApiUser(admin)] } });
        await page.goto('/users');
        await expect(page.getByText('Lädt...')).not.toBeVisible();

        await expect(page.getByRole('button', { name: 'Benutzer hinzufügen' })).toBeVisible();

        await page.locator('td button').filter({ has: page.locator('svg') }).first().click();
        await expect(page.getByText('Bearbeiten')).toBeVisible();
        await expect(page.getByText('Passwort zurücksetzen')).toBeVisible();
    });

    test('Restricted user cannot see creation button', async ({ page }) => {
        // We need to use the restricted user fixture for mocks since we switched storageState
        const restrictedUser = AUTH_USERS.user;
        await setupMocks(page, restrictedUser, { 'GET /users': { data: [] } });
        await page.goto('/users');
        await expect(page.getByText('Lädt...')).not.toBeVisible();

        await expect(page.getByRole('button', { name: 'Benutzer hinzufügen' })).not.toBeVisible();
    });
    // Use specific storage state for this test
    test.use({ storageState: STORAGE_STATE.user });

    test('Delete option visibility constraints (Admin)', async ({ page }) => {
        // Reset to admin storage state explicitly if needed, but default is admin
        // This test case runs in admin context based on suite default

        await setupMocks(page, admin, {
            'GET /users': {
                data: [
                    toApiUser(user1), // Active
                    toApiUser(inactiveUser) // Inactive
                ]
            }
        });
        await page.goto('/users');
        await expect(page.getByText('Lädt...')).not.toBeVisible();

        // 1. Check active user row
        const rowActive = page.locator('tr').filter({ hasText: nameMatch('Alpha', 'Abel') });
        await rowActive.locator('button').filter({ has: page.locator('svg') }).click();

        // Check menu content
        await expect(page.getByText('Benutzer löschen')).not.toBeVisible();

        // Reload to reset state/close menu guarantees
        await page.reload();
        await expect(page.getByText('Lädt...')).not.toBeVisible();

        // 2. Check inactive user row
        const rowInactive = page.locator('tr').filter({ hasText: nameMatch('Inactive', 'Person') });
        await rowInactive.locator('button').filter({ has: page.locator('svg') }).click();
        await expect(page.getByText('Benutzer löschen')).toBeVisible();
    });
});

test.describe('Users - Management Actions', () => {
    test.beforeEach(async ({ page }) => {
        await setupMocks(page, admin, {
            'GET /users': { data: [toApiUser(user1)] }
        });
    });

    test('Can open creation modal', async ({ page }) => {
        await page.goto('/users');
        await expect(page.getByText('Lädt...')).not.toBeVisible();
        await page.getByRole('button', { name: 'Benutzer hinzufügen' }).click();

        await expect(page.getByRole('dialog').getByRole('heading', { name: 'Benutzer hinzufügen' })).toBeVisible();
        await expect(page.getByLabel('First Name')).toBeVisible();
    });

    test('Can open edit modal with prefilled data', async ({ page }) => {
        await page.goto('/users');
        await expect(page.getByText('Lädt...')).not.toBeVisible();

        await page.locator('td button').filter({ has: page.locator('svg') }).first().click();
        await page.getByText('Bearbeiten').click();

        const modal = page.getByRole('dialog');
        await expect(modal.getByRole('heading', { name: 'Benutzer bearbeiten' })).toBeVisible();
        await expect(modal.getByLabel('First Name')).toHaveValue('Alpha');
    });

    test('Password reset flow', async ({ page }) => {
        await page.goto('/users');
        await expect(page.getByText('Lädt...')).not.toBeVisible();

        await setupMocks(page, admin, {
            [`PATCH /users/${user1.id}`]: { ok: true },
            'GET /users': { data: [toApiUser(user1)] } // Re-mock listing
        });

        page.on('dialog', dialog => dialog.accept());

        await page.locator('td button').filter({ has: page.locator('svg') }).first().click();
        await page.getByText('Passwort zurücksetzen').click();

        const modal = page.locator('dialog').filter({ hasText: 'Passwort zurückgesetzt' });
        await expect(modal).toBeVisible();
        await modal.getByRole('button', { name: 'Fertig' }).click();
        await expect(modal).not.toBeVisible();
    });

    test('Can delete an inactive user', async ({ page }) => {
        let deleted = false;
        await setupMocks(page, admin, {
            'GET /users': async (route: Route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ data: deleted ? [] : [toApiUser(inactiveUser)] })
                });
            },
            [`DELETE /users/${inactiveUser.id}`]: async (route: Route) => {
                deleted = true;
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
            }
        });

        await page.goto('/users');
        await expect(page.getByText('Lädt...')).not.toBeVisible();
        page.on('dialog', dialog => dialog.accept());

        await page.locator('td button').filter({ has: page.locator('svg') }).first().click();
        await page.getByText('Benutzer löschen').click();

        await expect(page.locator('tbody').getByText(nameMatch('Inactive', 'Person'))).not.toBeVisible();
    });
});
