import { test, expect } from '@playwright/test';
import { setupAndLogin } from './test-utils';
import { createUser } from './factories';

test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        // Setup default user and login
        const user = createUser({
            firstName: 'Anton',
            status: 2,
            permissions: ['events:read', 'resources:read', 'groups:read']
        });
        // No extra handlers needed for basic dashboard
        await setupAndLogin(page, user);
    });

    test('Displays user greeting and status', async ({ page }) => {
        await expect(page.getByText('Willkommen zurück')).toBeVisible();
        await expect(page.getByText('Anton', { exact: true })).toBeVisible();
        await expect(page.getByText('Aktiver Status')).toBeVisible();
    });

    test('Displays quick actions for admin/mod user', async ({ page }) => {
        // User status 2 should show all actions
        await expect(page.getByRole('link', { name: 'Kalender anschauen' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Boot buchen' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Gruppen verwalten' })).toBeVisible();
    });
});
