import { test, expect } from '@playwright/test';
import { setupMocks } from './test-utils';
import { createUser } from './factories';
import { AUTH_USERS, STORAGE_STATE } from './fixtures/auth';

/**
 * User Permissions View E2E Tests
 * 
 * Tests the permissions tab in the User Edit modal.
 */

const admin = AUTH_USERS.admin;

// User with permissions to view
const userWithPermissions = createUser({
    id: 'user-perm-test',
    firstName: 'Permissions',
    name: 'TestUser',
    email: 'perms@test.com',
    status: 2,
    role: { slug: 'user', name: 'Benutzer' }
});

// API response format for user with effective_permissions
const userApiResponseWithPerms = {
    id: userWithPermissions.id,
    type: 'users',
    attributes: {
        name: userWithPermissions.name,
        'first-name': userWithPermissions.firstName,
        email: userWithPermissions.email,
        status: userWithPermissions.status,
        'is-active': true,
        role: userWithPermissions.role,
        effective_permissions: {
            global: {
                role: 'user',
                roleName: 'Benutzer',
                permissions: ['events:read', 'resources:read']
            },
            contexts: [
                {
                    id: 'group-123',
                    name: 'Training Group A',
                    role: 'coach',
                    roleName: 'Trainer',
                    permissions: ['posts:create', 'posts:read']
                }
            ]
        }
    }
};

const toApiUser = (user: any) => ({
    id: user.id,
    type: 'users',
    attributes: {
        ...user,
        'first-name': user.firstName,
        'is-active': true
    }
});

test.describe('User Permissions View', () => {
    test.use({ storageState: STORAGE_STATE.admin });
    test.beforeEach(async ({ page }) => {
        await setupMocks(page, admin, {
            'GET /users': { data: [toApiUser(userWithPermissions)] },
            [`GET /users/${userWithPermissions.id}`]: { data: userApiResponseWithPerms }
        });
    });

    test('Can open permissions tab via dropdown menu', async ({ page }) => {
        await page.goto('/users');
        await expect(page.getByText('Lädt...')).not.toBeVisible();

        // Open the dropdown menu
        await page.locator('td button').filter({ has: page.locator('svg') }).first().click();

        // Click "Berechtigungen" option (exact text in the menu)
        const dropdown = page.locator('[class*="absolute"]').filter({ hasText: 'Berechtigungen' });
        await dropdown.getByText('Berechtigungen').click();

        // Modal should open with Permissions tab active (button with specific styling)
        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible();
        // The "Berechtigungen" button in the tab bar should be active (has blue styling)
        await expect(modal.locator('button').filter({ hasText: 'Berechtigungen' }).first()).toHaveClass(/border-blue-600/);
    });

    test('Permissions tab displays global role', async ({ page }) => {
        await page.goto('/users');
        await expect(page.getByText('Lädt...')).not.toBeVisible();

        await page.locator('td button').filter({ has: page.locator('svg') }).first().click();
        const dropdown = page.locator('[class*="absolute"]').filter({ hasText: 'Berechtigungen' });
        await dropdown.getByText('Berechtigungen').click();

        const modal = page.getByRole('dialog');
        await expect(modal.getByText('Globale Berechtigungen')).toBeVisible();

        // Scope to the badge area to avoid ambiguity with the form select if it's still visible
        // We use a locator that likely targets the permission badge container
        await expect(modal.locator('.rounded-full').getByText('Benutzer', { exact: true })).toBeVisible();

        // Permissions are grouped by resource and only list actions
        await expect(modal.getByText('events', { exact: true })).toBeVisible();
        await expect(modal.getByText('resources', { exact: true })).toBeVisible();
        await expect(modal.getByText('read', { exact: true }).first()).toBeVisible();
        await expect(modal.getByText('events:read', { exact: true })).toHaveCount(0);
    });

    test('Permissions tab displays context-specific roles', async ({ page }) => {
        await page.goto('/users');
        await expect(page.getByText('Lädt...')).not.toBeVisible();

        await page.locator('td button').filter({ has: page.locator('svg') }).first().click();
        const dropdown = page.locator('[class*="absolute"]').filter({ hasText: 'Berechtigungen' });
        await dropdown.getByText('Berechtigungen').click();

        const modal = page.getByRole('dialog');

        // Context section
        await expect(modal.getByText('Gruppenberechtigungen')).toBeVisible();
        await expect(modal.getByText('Training Group A')).toBeVisible();
        await expect(modal.getByText('Trainer')).toBeVisible(); // Context role
        await expect(modal.getByText('posts', { exact: true })).toBeVisible();
        await expect(modal.getByText('create', { exact: true })).toBeVisible();
        await expect(modal.getByText('posts:create', { exact: true })).toHaveCount(0);
    });

    test('Can switch between Details and Permissions tabs', async ({ page }) => {
        await page.goto('/users');
        await expect(page.getByText('Lädt...')).not.toBeVisible();

        // Open edit modal via Edit option
        await page.locator('td button').filter({ has: page.locator('svg') }).first().click();
        await page.getByText('Bearbeiten').click();

        const modal = page.getByRole('dialog');

        // Initially on Details tab - the button has active styling
        const detailsTab = modal.locator('button').filter({ hasText: 'Details' }).first();
        await expect(detailsTab).toHaveClass(/border-blue-600/);
        await expect(modal.getByLabel('First Name')).toBeVisible();

        // Switch to Permissions tab
        await modal.locator('button').filter({ hasText: 'Berechtigungen' }).first().click();

        // Wait for removal of details content to ensure transition is underway/done
        await expect(modal.getByLabel('First Name')).not.toBeVisible();

        // Now check for permissions content
        // This might wait for API + State Update
        await expect(modal.getByText('Globale Berechtigungen')).toBeVisible();

        // Switch back to Details
        await detailsTab.click();

        // Verify details are back
        await expect(modal.getByLabel('First Name')).toBeVisible();
    });
});
