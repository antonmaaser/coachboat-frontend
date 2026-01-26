import { test, expect } from '@playwright/test';
import { setupAndLogin } from './test-utils';
import { createUser, createGroup } from './factories';

test.describe('Groups', () => {
    const user = createUser({ status: 2, permissions: ['groups:view'] });
    const group1 = createGroup({ title: 'Training A' });
    const group2 = createGroup({ title: 'Training B' });

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
