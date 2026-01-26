import { test, expect } from '@playwright/test';
import { setupAndLogin } from './test-utils';
import { createUser, createGroup } from './factories';

const user = createUser({ status: 2, permissions: ['groups:view'] });
const group1 = createGroup({ title: 'Training A' });
const group2 = createGroup({ title: 'Training B' });

test.describe('Groups', () => {
    test.beforeEach(async ({ page }) => {
        await setupAndLogin(page, user, {
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

test.describe('Group errors', () => {
    test('Shows not found when group detail is non-OK', async ({ page }) => {
        const missingGroup = createGroup({ title: 'Missing Group' });

        await setupAndLogin(page, user, {
            [`GET /groups/${missingGroup.id}`]: async (route) => {
                await route.fulfill({
                    status: 404,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Not Found' }),
                    headers: { 'Access-Control-Allow-Origin': '*' }
                });
            },
            [`GET /groups/${missingGroup.id}/posts`]: { data: [] },
            [`GET /groups/${missingGroup.id}/activity`]: { data: [] },
            [`GET /groups/${missingGroup.id}/members`]: { data: [] },
            [`GET /groups/${missingGroup.id}/feed`]: { data: [] },
            [`GET /groups/${missingGroup.id}/stream`]: { data: [] },
        });

        await page.goto(`/groups/${missingGroup.id}`);
        await expect(page.getByText('Gruppe nicht gefunden')).toBeVisible();
    });

    test('Shows error when group detail returns 500', async ({ page }) => {
        const failingGroup = createGroup({ title: 'Failing Group' });

        await setupAndLogin(page, user, {
            [`GET /groups/${failingGroup.id}`]: async (route) => {
                await route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Server Error' }),
                    headers: { 'Access-Control-Allow-Origin': '*' }
                });
            },
            [`GET /groups/${failingGroup.id}/posts`]: { data: [] },
            [`GET /groups/${failingGroup.id}/activity`]: { data: [] },
            [`GET /groups/${failingGroup.id}/members`]: { data: [] },
            [`GET /groups/${failingGroup.id}/feed`]: { data: [] },
            [`GET /groups/${failingGroup.id}/stream`]: { data: [] },
        });

        await page.goto(`/groups/${failingGroup.id}`);
        await expect(page.getByText('Fehler beim Laden der Gruppe')).toBeVisible();
    });
});
