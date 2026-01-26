import { test, expect } from '@playwright/test';
import { setupAndLogin } from './test-utils';
import { createUser, createResource } from './factories';

test.describe('Resources', () => {
    const user = createUser({ status: 2, permissions: ['resources:view'] });
    const resource1 = createResource({ title: 'Coachboat 1' });
    const resource2 = createResource({ title: 'Coachboat 2', isReady: false });

    test.beforeEach(async ({ page }) => {
        await setupAndLogin(page, user, {
            'GET /resources': {
                data: [
                    { id: resource1._id, attributes: resource1 },
                    { id: resource2._id, attributes: resource2 }
                ]
            }
        });
    });

    test('Lists available resources', async ({ page }) => {
        await page.click('text=Boot buchen'); // Or navigate via sidebar
        await expect(page).toHaveURL('/resources');

        await expect(page.getByText('Coachboat 1')).toBeVisible();
        await expect(page.getByText('Coachboat 2')).toBeVisible();
    });
});
