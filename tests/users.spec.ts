import { test, expect } from '@playwright/test';
import { setupAndLogin, mockApi } from './test-utils';
import { createUser } from './factories';

/**
 * Users Overview Page E2E Tests
 */

// Test Data
const admin = createUser({
    firstName: 'Admin',
    name: 'Boss',
    email: 'admin@example.com',
    status: 4,
    role: { slug: 'admin', name: 'Administrator' },
    permissions: ['users:read', 'users:create', 'users:edit', 'users:delete']
});

const user1 = createUser({
    firstName: 'Alpha',
    name: 'User',
    email: 'alpha@example.com',
    status: 2,
    role: { slug: 'user', name: 'Benutzer' }
});

const user2 = createUser({
    firstName: 'Zeta',
    name: 'Member',
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
        await setupAndLogin(page, admin, {
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
        await expect(table.getByText(nameMatch('Admin', 'Boss'))).toBeVisible();
        await expect(table.getByText('Administrator')).toBeVisible();

        await expect(table.getByText(nameMatch('Alpha', 'User'))).toBeVisible();
        const row1 = table.locator('tr').filter({ hasText: nameMatch('Alpha', 'User') });
        await expect(row1.getByText('Benutzer')).toBeVisible();
    });

    test('Sorts users by name (A-Z and Z-A)', async ({ page }) => {
        await page.goto('/users');
        await expect(page.getByText('Lädt...')).not.toBeVisible();

        const rows = page.locator('tbody tr');
        await expect(rows.first().getByText(nameMatch('Admin', 'Boss'))).toBeVisible();

        await page.getByRole('button', { name: 'Name' }).click();
        await expect(rows.first().getByText(nameMatch('Zeta', 'Member'))).toBeVisible();
    });

    test('Sorts users by email', async ({ page }) => {
        await page.goto('/users');
        await expect(page.getByText('Lädt...')).not.toBeVisible();

        await page.getByRole('button', { name: 'E-Mail' }).click();
        const rows = page.locator('tbody tr');
        await expect(rows.first().getByText('admin@example.com')).toBeVisible();

        await page.getByRole('button', { name: 'E-Mail' }).click();
        await expect(rows.first().getByText('zeta@example.com')).toBeVisible();
    });

    test('Sorts users by status', async ({ page }) => {
        await page.goto('/users');
        await expect(page.getByText('Lädt...')).not.toBeVisible();

        await page.getByRole('button', { name: 'Status' }).click();
        const rows = page.locator('tbody tr');

        // Status sort is likely Ascending first (1, 2, 4...)
        // Zeta (1) < Alpha (2) < Admin (4)
        await expect(rows.first().getByText(nameMatch('Zeta', 'Member'))).toBeVisible();

        await page.getByRole('button', { name: 'Status' }).click();
        // Descending: Admin (4) > ...
        await expect(rows.first().getByText(nameMatch('Admin', 'Boss'))).toBeVisible();
    });
});

test.describe('Users - Authorization Visibility', () => {
    test('Admin sees all management controls', async ({ page }) => {
        await setupAndLogin(page, admin, { 'GET /users': { data: [toApiUser(admin)] } });
        await page.goto('/users');
        await expect(page.getByText('Lädt...')).not.toBeVisible();

        await expect(page.getByRole('button', { name: 'Benutzer hinzufügen' })).toBeVisible();

        await page.locator('td button').filter({ has: page.locator('svg') }).first().click();
        await expect(page.getByText('Bearbeiten')).toBeVisible();
        await expect(page.getByText('Passwort zurücksetzen')).toBeVisible();
    });

    test('Restricted user cannot see creation button', async ({ page }) => {
        const viewer = createUser({ permissions: ['users:read'] });
        await setupAndLogin(page, viewer, { 'GET /users': { data: [] } });
        await page.goto('/users');
        await expect(page.getByText('Lädt...')).not.toBeVisible();

        await expect(page.getByRole('button', { name: 'Benutzer hinzufügen' })).not.toBeVisible();
    });

    test('Delete option visibility constraints', async ({ page }) => {
        await setupAndLogin(page, admin, {
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
        const rowActive = page.locator('tr').filter({ hasText: nameMatch('Alpha', 'User') });
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
        await setupAndLogin(page, admin, {
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

        await mockApi(page, {
            [`PATCH /users/${user1.id}`]: { ok: true }
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
        await mockApi(page, {
            'GET /users': async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ data: deleted ? [] : [toApiUser(inactiveUser)] })
                });
            },
            [`DELETE /users/${inactiveUser.id}`]: async (route) => {
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
