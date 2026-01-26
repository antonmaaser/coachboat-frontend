import { test, expect, type Page } from '@playwright/test';
import { setupMocks } from './test-utils';
import { createGroup } from './factories';
import { AUTH_USERS, STORAGE_STATE } from './fixtures/auth';

/**
 * Groups E2E Tests
 */

test.describe('Groups', () => {
    // Authenticate as a regular user with permission to view groups
    test.use({ storageState: STORAGE_STATE.user });

    const user = {
        ...AUTH_USERS.user,
        permissions: Array.from(new Set([...AUTH_USERS.user.permissions, 'groups:view']))
    };

    const group1 = createGroup({ title: 'Training A' });
    const group2 = createGroup({ title: 'Training B' });

    test.beforeEach(async ({ page }) => {
        // Setup shared mocks for detailed group views to avoid repetition in happy paths
        // Specific tests can override these if needed
        await setupMocks(page, user, {
            'GET /groups': {
                data: [
                    { id: group1.id, attributes: group1 },
                    { id: group2.id, attributes: group2 }
                ]
            },
            [`GET /groups/${group1.id}`]: {
                data: { id: group1.id, attributes: group1 }
            },
            // Empty sub-resources for details view
            [`GET /groups/${group1.id}/posts`]: { data: [] },
            [`GET /groups/${group1.id}/activity`]: { data: [] },
            [`GET /groups/${group1.id}/members`]: { data: [] },
            [`GET /groups/${group1.id}/feed`]: { data: [] },
            [`GET /groups/${group1.id}/stream`]: { data: [] },
        });
        await page.goto('/'); // Reset to home for clean navigation start if needed, though individual tests often nav
    });

    test('Lists available groups', async ({ page }) => {
        // Reset to home implies we might be there, but let's be explicit for the test flow
        await page.goto('/');

        await page.click('text=Gruppen verwalten');
        await expect(page).toHaveURL('/groups');

        await expect(page.getByText('Training A')).toBeVisible();
        await expect(page.getByText('Training B')).toBeVisible();
    });

    test('Navigates to group details', async ({ page }) => {
        await page.goto('/groups'); // Ensure we are on the list
        await page.click(`text=${group1.title}`);

        await expect(page).toHaveURL(`/groups/${group1.id}`);
        await expect(page.getByRole('heading', { name: group1.title })).toBeVisible();
    });
});

test.describe('Groups empty state', () => {
    test.use({ storageState: STORAGE_STATE.user });

    // We reuse the basic user but might not need extra permissions if we are just testing empty states?
    // Actually the app might hide the groups nav if no perms. So let's add it.
    const user = {
        ...AUTH_USERS.user,
        permissions: Array.from(new Set([...AUTH_USERS.user.permissions, 'groups:view']))
    };

    test('Shows empty state when no groups exist', async ({ page }) => {
        await setupMocks(page, user, {
            'GET /groups': { data: [] }
        });

        await page.goto('/groups');
        await expect(page.getByText('Keine Gruppen gefunden.')).toBeVisible();
    });

    test('Shows loading state while groups are fetched', async ({ page }) => {
        await setupMocks(page, user, {
            'GET /groups': async (route) => {
                await new Promise((resolve) => setTimeout(resolve, 500));
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ data: [] }),
                    headers: { 'Access-Control-Allow-Origin': '*' }
                });
            }
        });

        await page.goto('/groups');
        await expect(page.getByText('Lädt...')).toBeVisible();
        await expect(page.getByText('Keine Gruppen gefunden.')).toBeVisible();
    });
});

test.describe('Group errors', () => {
    test.use({ storageState: STORAGE_STATE.user });

    const user = {
        ...AUTH_USERS.user,
        permissions: Array.from(new Set([...AUTH_USERS.user.permissions, 'groups:view']))
    };

    test('Shows not found when group detail is non-OK', async ({ page }) => {
        const missingGroup = createGroup({ title: 'Missing Group' });

        await setupMocks(page, user, {
            [`GET /groups/${missingGroup.id}`]: {
                error: 'Not Found'
                // mockApi handles simple objects with 200 OK by default, 
                // but we need 404. explicit handler needed if we want status code.
            },
            // We can override the specific route with a function for status code
            [`GET /groups/${missingGroup.id}`]: async (route) => {
                await route.fulfill({
                    status: 404,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Not Found' }),
                    headers: { 'Access-Control-Allow-Origin': '*' }
                });
            },
            // Mocks for related calls that might happen before/during the error check
            [`GET /groups/${missingGroup.id}/posts`]: { data: [] },
            [`GET /groups/${missingGroup.id}/activity`]: { data: [] },
            [`GET /groups/${missingGroup.id}/members`]: { data: [] },
            [`GET /groups/${missingGroup.id}/feed`]: { data: [] },
            [`GET /groups/${missingGroup.id}/stream`]: { data: [] },
        });

        await page.goto(`/groups/${missingGroup.id}`);
        await expect(page.getByText('Gruppe nicht gefunden')).toBeVisible();
    });

    test('Shows not found when group detail returns 500', async ({ page }) => {
        const failingGroup = createGroup({ title: 'Failing Group' });

        await setupMocks(page, user, {
            [`GET /groups/${failingGroup.id}`]: async (route) => {
                await route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Server Error' }),
                    headers: { 'Access-Control-Allow-Origin': '*' }
                });
            },
            // Mock sub-resources to prevent 404s in console if fetched in parallel
            [`GET /groups/${failingGroup.id}/posts`]: { data: [] },
            [`GET /groups/${failingGroup.id}/activity`]: { data: [] },
            [`GET /groups/${failingGroup.id}/members`]: { data: [] },
            [`GET /groups/${failingGroup.id}/feed`]: { data: [] },
            [`GET /groups/${failingGroup.id}/stream`]: { data: [] },
        });

        await page.goto(`/groups/${failingGroup.id}`);
        // Assuming the UI handles 500 same as 404 or generic error
        await expect(page.getByText('Gruppe nicht gefunden')).toBeVisible();
    });
});
