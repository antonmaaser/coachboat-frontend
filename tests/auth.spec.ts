import { test, expect } from '@playwright/test';
import { mockApi } from './test-utils';
import { createUser } from './factories';

test.describe('Authentication', () => {
    test('Login success redirects to dashboard', async ({ page }) => {
        const user = createUser({ firstName: 'Anton' });

        await mockApi(page, {
            'AUTH POST /token': {
                access_token: 'fake-access-token',
                refresh_token: 'fake-refresh-token',
                user_id: user.id
            },
            [`GET /users/${user.id}`]: {
                data: {
                    attributes: {
                        email: user.email,
                        name: user.name,
                        'first-name': user.firstName,
                        status: user.status,
                        permissions: user.permissions
                    }
                }
            },
            // Dashboard initial load mocks
            'GET /todos': [],
            'GET /groups': [],
            'GET /resources': [],
            'GET /resource-categories': [],
            'GET /events': [],
        });

        await page.goto('/login');

        // Fill form
        await page.fill('input[name="email"]', user.email);
        await page.fill('input[name="password"]', 'password123');
        // Wait for page to be fully loaded and hydrated
        await page.waitForLoadState('networkidle');
        await page.click('button[type="submit"]');

        // Assert redirection and content
        await expect(page).toHaveURL('/');
        await expect(page.getByText('Willkommen zurück')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Anton', exact: true })).toBeVisible().catch(() =>
            expect(page.getByText('Anton', { exact: true })).toBeVisible()
        );
    });

    test('Login failure shows error message', async ({ page }) => {
        await mockApi(page, {
            'AUTH POST /token': async (route) => {
                await route.fulfill({
                    status: 401,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'invalid_grant' })
                });
            }
        });

        await page.goto('/login');

        await page.fill('input[name="email"]', 'wrong@example.com');
        await page.fill('input[name="password"]', 'wrongpass');
        await page.click('button[type="submit"]');

        // Assert error message
        // The implementation shows "Ungültige E-Mail oder Passwort." for 400/401
        await expect(page.getByText('Ungültige E-Mail oder Passwort.')).toBeVisible();
        await expect(page).toHaveURL('/login');
    });

    test('Unauthenticated user is redirected to login', async ({ page }) => {
        // No auth mock means no token in store initially
        await page.goto('/');
        await expect(page).toHaveURL('/login');
    });
});
