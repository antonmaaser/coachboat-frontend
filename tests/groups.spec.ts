import { test, expect, type Page } from '@playwright/test';
import { setupMocks } from './test-utils';
import { createGroup } from './factories';
import { AUTH_USERS, STORAGE_STATE } from './fixtures/auth';

test.describe('Groups', () => {
    test.use({ storageState: STORAGE_STATE.user });

    const user = {
        ...AUTH_USERS.user,
        permissions: Array.from(new Set([...AUTH_USERS.user.permissions, 'groups:view']))
    };
    const group1 = createGroup({ title: 'Training A' });
    const group2 = createGroup({ title: 'Training B' });

    test.beforeEach(async ({ page }) => {
        await setupMocks(page, user, {
            'GET /groups': {
                data: [
                    { id: group1.id, attributes: group1 },
                    { id: group2.id, attributes: group2 }
                ]
            },
            // Detail mocks
            [`GET /groups/${group1.id}`]: {
                data: { id: group1.id, attributes: group1 }
            },
            [`GET /groups/${group1.id}/posts`]: { data: [] },
            [`GET /groups/${group1.id}/activity`]: { data: [] },
            [`GET /groups/${group1.id}/members`]: { data: [] },
            [`GET /groups/${group1.id}/feed`]: { data: [] },
            [`GET /groups/${group1.id}/stream`]: { data: [] },
        });
        await page.goto('/');
    });

    test('Lists available groups', async ({ page }) => {
        await page.click('text=Gruppen verwalten');
        await expect(page).toHaveURL('/groups');

        await expect(page.getByText('Training A')).toBeVisible();
        await expect(page.getByText('Training B')).toBeVisible();
    });

    test('Navigates to group details', async ({ page }) => {
        await page.goto('/groups');
        await page.click(`text=${group1.title}`);

        await expect(page).toHaveURL(`/groups/${group1.id}`);
        await expect(page.getByRole('heading', { name: group1.title })).toBeVisible();
    });
});

test.describe('Groups empty state', () => {
    const user = createUser({ status: 2, permissions: ['groups:view'] });

    async function login(page: Page) {
        await page.goto('/login');
        await page.fill('input[name="email"]', user.email);
        await page.fill('input[name="password"]', 'password');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/');
    }

    test('Shows empty state when no groups exist', async ({ page }) => {
        await setupMocks(page, user, {
            'GET /groups': { data: [] }
        });

        await login(page);
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

        await login(page);
        await page.goto('/groups');

        await expect(page.getByText('Lädt...')).toBeVisible();
        await expect(page.getByText('Keine Gruppen gefunden.')).toBeVisible();
    });
});
