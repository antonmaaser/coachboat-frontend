import { test as setup, expect } from '@playwright/test';
import { AUTH_USERS, STORAGE_STATE } from './fixtures/auth';
import { mockApi } from './test-utils';

// We perform login for each role and save the storage state
for (const [roleKey, user] of Object.entries(AUTH_USERS)) {
    setup(`authenticate as ${roleKey}`, async ({ page }) => {
        // Mock the login API to return success and user data matching our fixture
        // We use a simplified mock here just to get past the login page
        // The actual app might fetch /users/me or similar, so we mock that too if needed

        await mockApi(page, {
            'AUTH POST /token': {
                access_token: `mock-access-token-${roleKey}`,
                refresh_token: `mock-refresh-token-${roleKey}`,
                user_id: user.id,
                organizationId: user.organizationId || null,
            },
            [`GET /users/${user.id}`]: {
                data: {
                    id: user.id,
                    attributes: {
                        ...user,
                        'first-name': user.firstName,
                        organizations: user.organizationId
                            ? [{ id: user.organizationId, name: 'Test Org', slug: 'test-org' }]
                            : [],
                    }
                }
            },
            // Mock implicit calls that might happen on dashboard load
            'GET /todos': { data: [] },
            'GET /resources': { data: [] },
            'GET /users': { data: [] }
        });

        await page.goto('/login');
        await page.fill('input[name="email"]', user.email);
        await page.fill('input[name="password"]', user.password);
        await page.click('button[type="submit"]');

        // Wait for successful redirect to dashboard
        await expect(page).toHaveURL('/');

        // Ensure auth state is persisted in localStorage before saving
        await page.waitForFunction(() => localStorage.getItem('coachboat_auth') !== null);

        // Save storage state
        await page.context().storageState({ path: STORAGE_STATE[roleKey as keyof typeof STORAGE_STATE] });
    });
}
