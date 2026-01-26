import { test, expect } from '@playwright/test';
import { setupMocks } from './test-utils';
import { createUser, createGroup } from './factories';
import { AUTH_USERS, STORAGE_STATE } from './fixtures/auth';

const group1 = createGroup({ title: 'Training A' });
const group2 = createGroup({ title: 'Training B' });
const memberUser = createUser({
    id: 'member-user-id',
    firstName: 'Member',
    name: 'User',
    email: 'member@example.com'
});
const groupWithMembers = createGroup({
    title: 'Training C',
    members: [{ id: memberUser.id, role: 'moderator' }]
});

const toApiGroup = (group: any) => ({ id: group.id, attributes: group });
const listGroupsHandler = {
    'GET /groups': {
        data: [toApiGroup(group1), toApiGroup(group2), toApiGroup(groupWithMembers)]
    }
};

test.describe('Groups - Create permission', () => {
    test.describe('Admin role', () => {
        test.use({ storageState: STORAGE_STATE.admin });

        test('Shows create button with groups:create', async ({ page }) => {
            await setupMocks(page, AUTH_USERS.admin, listGroupsHandler);
            await page.goto('/groups');

            await expect(page.getByRole('button', { name: 'Gruppe erstellen' })).toBeVisible();
        });
    });

    test.describe('User role', () => {
        test.use({ storageState: STORAGE_STATE.user });

        test('Hides create button without groups:create', async ({ page }) => {
            await setupMocks(page, AUTH_USERS.user, listGroupsHandler);
            await page.goto('/groups');

            await expect(page.getByRole('button', { name: 'Gruppe erstellen' })).not.toBeVisible();
        });
    });
});

test.describe('Groups - Edit/Delete menu permissions', () => {
    test.describe('Admin role', () => {
        test.use({ storageState: STORAGE_STATE.admin });

        test('Shows edit and delete menu items with permissions', async ({ page }) => {
            await setupMocks(page, AUTH_USERS.admin, listGroupsHandler);
            await page.goto('/groups');

            await page.locator('tbody tr').first().locator('button').click();

            await expect(page.getByText('Bearbeiten')).toBeVisible();
            await expect(page.getByText('Löschen')).toBeVisible();
        });
    });

    test.describe('User role', () => {
        test.use({ storageState: STORAGE_STATE.user });

        test('Hides edit and delete menu items without permissions', async ({ page }) => {
            await setupMocks(page, AUTH_USERS.user, listGroupsHandler);
            await page.goto('/groups');

            await page.locator('tbody tr').first().locator('button').click();

            await expect(page.getByText('Bearbeiten')).not.toBeVisible();
            await expect(page.getByText('Löschen')).not.toBeVisible();
        });
    });
});

test.describe('Groups - Members modal permissions', () => {
    const membersHandlers = {
        ...listGroupsHandler,
        [`GET /groups/${groupWithMembers.id}`]: {
            data: toApiGroup(groupWithMembers)
        },
        'GET /users': {
            data: [{ id: memberUser.id, attributes: { ...memberUser, 'first-name': memberUser.firstName } }]
        }
    };

    test.describe('Admin role', () => {
        test.use({ storageState: STORAGE_STATE.admin });

        test('Allows member management with groups:manage', async ({ page }) => {
            await setupMocks(page, AUTH_USERS.admin, membersHandlers);
            await page.goto('/groups');

            await page.locator('tbody tr').filter({ hasText: groupWithMembers.title }).locator('button').click();
            await page.getByText('Mitglieder').click();

            await expect(page.getByRole('dialog')).toBeVisible();
            await expect(page.getByText('Mitglied hinzufügen')).toBeVisible();
        });
    });

    test.describe('User role', () => {
        test.use({ storageState: STORAGE_STATE.user });

        test('Hides member management without groups:manage', async ({ page }) => {
            await setupMocks(page, AUTH_USERS.user, membersHandlers);
            await page.goto('/groups');

            await page.locator('tbody tr').filter({ hasText: groupWithMembers.title }).locator('button').click();
            await page.getByText('Mitglieder').click();

            await expect(page.getByRole('dialog')).toBeVisible();
            await expect(page.getByText('Mitglied hinzufügen')).not.toBeVisible();
        });
    });
});
