import { test, expect, type Route } from '@playwright/test';
import { setupMocks } from './test-utils';
import { createEvent, createResource, createResourceCategory } from './factories';
import { AUTH_USERS, STORAGE_STATE } from './fixtures/auth';

/**
 * Events Page E2E Tests
 */

// Get today's date for event placement
const today = new Date();
const year = today.getFullYear();
const month = today.getMonth() + 1; // 1-indexed for URL
const day = today.getDate();
const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

// Test Data
const category1 = createResourceCategory({ title: 'Boote', color: '#3b82f6', icon: 'Anchor' });
const category2 = createResourceCategory({ title: 'Zubehör', color: '#22c55e', icon: 'Wrench' });

const resource1 = createResource({ title: 'Coachboat Alpha' });
const resource2 = createResource({ title: 'Coachboat Beta' });

// Attach category IDs to resources
const resource1WithCategory = {
    id: resource1._id,
    attributes: { ...resource1, 'category-id': category1.id }
};
const resource2WithCategory = {
    id: resource2._id,
    attributes: { ...resource2, 'category-id': category2.id }
};

test.describe('Events - Calendar Navigation', () => {
    test.use({ storageState: STORAGE_STATE.user });
    const user = AUTH_USERS.user;

    test.beforeEach(async ({ page }) => {
        await setupMocks(page, user, {
            'GET /events': { data: [] },
            'GET /resources': { data: [resource1WithCategory, resource2WithCategory] },
            'GET /resource-categories': {
                data: [
                    { id: category1.id, attributes: category1 },
                    { id: category2.id, attributes: category2 }
                ]
            }
        });
    });

    test('Navigates to events page', async ({ page }) => {
        await page.goto('/');
        await page.click('text=Kalender anschauen');
        await expect(page).toHaveURL('/events');
        await expect(page.getByRole('heading', { name: 'Buchungen' })).toBeVisible();
    });

    test('Shows current month and year', async ({ page }) => {
        await page.goto('/events');

        const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
            'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
        const currentMonth = monthNames[today.getMonth()];

        await expect(page.getByText(currentMonth).first()).toBeVisible();
        await expect(page.getByText(String(year)).first()).toBeVisible();
    });
});

test.describe('Events - Display & Filtering', () => {
    test.use({ storageState: STORAGE_STATE.user });
    const user = AUTH_USERS.user;
    const event1 = createEvent({ title: 'Training Session', date: dateStr, resource: resource1._id });
    const event2 = createEvent({ title: 'Equipment Check', date: dateStr, resource: resource2._id });

    test.beforeEach(async ({ page }) => {
        await setupMocks(page, user, {
            'GET /events': {
                data: [
                    {
                        id: event1._id,
                        attributes: {
                            ...event1,
                            'start-date': 8 * 3600,
                            'end-date': 10 * 3600,
                            'is-recurring': false
                        }
                    },
                    {
                        id: event2._id,
                        attributes: {
                            ...event2,
                            'start-date': 14 * 3600,
                            'end-date': 16 * 3600,
                            'is-recurring': false
                        }
                    }
                ]
            },
            'GET /resources': { data: [resource1WithCategory, resource2WithCategory] },
            'GET /resource-categories': {
                data: [
                    { id: category1.id, attributes: category1 },
                    { id: category2.id, attributes: category2 }
                ]
            }
        });
    });

    test('Displays events on calendar', async ({ page }) => {
        await page.goto('/events');
        await expect(page.locator('.md\\:grid').getByText('Training Session').first()).toBeVisible();
        await expect(page.locator('.md\\:grid').getByText('Equipment Check').first()).toBeVisible();
    });

    test('Shows category filter buttons', async ({ page }) => {
        await page.goto('/events');
        await expect(page.getByRole('button', { name: 'Alle' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Boote' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Zubehör' })).toBeVisible();
    });

    test('Filters events by category', async ({ page }) => {
        await page.goto('/events');
        await page.getByRole('button', { name: 'Boote' }).click();
        await expect(page.locator('.md\\:grid').getByText('Training Session').first()).toBeVisible();
        await expect(page.locator('.md\\:grid').getByText('Equipment Check')).not.toBeVisible();
    });

    test('Shows "Alle" resets filter', async ({ page }) => {
        await page.goto('/events');
        await page.getByRole('button', { name: 'Boote' }).click();
        await page.getByRole('button', { name: 'Alle' }).click();
        await expect(page.locator('.md\\:grid').getByText('Training Session').first()).toBeVisible();
        await expect(page.locator('.md\\:grid').getByText('Equipment Check').first()).toBeVisible();
    });
});

test.describe('Events - Event Details Modal', () => {
    test.use({ storageState: STORAGE_STATE.user });
    const user = AUTH_USERS.user;
    const event = createEvent({ title: 'Detailed Event', date: dateStr, resource: resource1._id, createdBy: user.id });

    test.beforeEach(async ({ page }) => {
        await setupMocks(page, user, {
            'GET /events': {
                data: [{
                    id: event._id,
                    attributes: {
                        ...event,
                        'start-date': 9 * 3600,
                        'end-date': 11 * 3600,
                        'is-recurring': false,
                        'created-by': user.id
                    }
                }]
            },
            'GET /resources': { data: [resource1WithCategory] },
            'GET /resource-categories': { data: [{ id: category1.id, attributes: category1 }] },
            [`GET /resources/${resource1._id}`]: { data: resource1WithCategory },
            [`GET /users/${user.id}`]: { data: { id: user.id, attributes: { 'first-name': user.firstName, name: user.name } } }
        });
    });

    test('Opens event details modal when clicking event', async ({ page }) => {
        await page.goto('/events');
        await page.locator('.md\\:grid').getByText('Detailed Event').first().click();
        await expect(page.getByRole('heading', { name: 'Detailed Event' })).toBeVisible();
        await expect(page.getByText('Buchungsdetails')).toBeVisible();
    });

    test('Shows event time range in details', async ({ page }) => {
        await page.goto('/events');
        await page.locator('.md\\:grid').getByText('Detailed Event').first().click();
        const modal = page.getByRole('dialog');
        await expect(modal.getByText('09:00')).toBeVisible();
        await expect(modal.getByText('11:00')).toBeVisible();
    });

    test('Shows resource/coachboat in details', async ({ page }) => {
        await page.goto('/events');
        await page.locator('.md\\:grid').getByText('Detailed Event').first().click();
        const modal = page.getByRole('dialog');
        await expect(modal.getByText('Coachboat Alpha')).toBeVisible();
    });

    test('Shows creator name in details', async ({ page }) => {
        await page.goto('/events');
        await page.locator('.md\\:grid').getByText('Detailed Event').first().click();
        const modal = page.getByRole('dialog');
        await expect(modal.getByText(`${user.firstName} ${user.name}`)).toBeVisible();
    });
});



test.describe('Events - Creation Permissions (Restricted)', () => {
    test.use({ storageState: STORAGE_STATE.group_only });
    const resource = createResource({ title: 'Booking Boat' });
    const resourceData = { id: resource._id, attributes: { ...resource, 'category-id': category1.id } };

    test('User WITHOUT events:create cannot see create button', async ({ page }) => {
        const basicUser = AUTH_USERS.group_only;
        await setupMocks(page, basicUser, {
            'GET /events': { data: [] },
            'GET /resources': { data: [resourceData] },
            'GET /resource-categories': { data: [] }
        });
        await page.goto('/events');
        await expect(page.getByRole('button', { name: 'Neue Buchung' })).not.toBeVisible();
    });
});

test.describe('Events - Creation Permissions (Moderator)', () => {
    test.use({ storageState: STORAGE_STATE.moderator });
    const resource = createResource({ title: 'Booking Boat' });
    const resourceData = { id: resource._id, attributes: { ...resource, 'category-id': category1.id } };
    const modUser = AUTH_USERS.moderator;

    test('User WITH events:create can see create button', async ({ page }) => {
        await setupMocks(page, modUser, {
            'GET /events': { data: [] },
            'GET /resources': { data: [resourceData] },
            'GET /resource-categories': { data: [] }
        });

        await page.goto('/events');
        await expect(page.getByRole('button', { name: 'Neue Buchung' })).toBeVisible();
    });

    test('Opens create modal when clicking create button', async ({ page }) => {
        await setupMocks(page, modUser, {
            'GET /events': { data: [] },
            'GET /resources': { data: [resourceData] },
            'GET /resource-categories': { data: [] }
        });

        await page.goto('/events');
        await page.getByRole('button', { name: 'Neue Buchung' }).click();

        await expect(page.getByText('Neue Buchung erstellen')).toBeVisible();
        await expect(page.getByLabel('Titel')).toBeVisible();
        await expect(page.getByLabel('Datum')).toBeVisible();
    });

    test('Can create a new event', async ({ page }) => {
        await setupMocks(page, modUser, {
            'GET /events': { data: [] },
            'GET /resources': { data: [resourceData] },
            'GET /resource-categories': { data: [] },
            'POST /events': async (route: Route) => {
                const body = await route.request().postDataJSON();
                await route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify({ data: { id: 'new-event-id', attributes: body.data.attributes } })
                });
            }
        });

        await page.goto('/events');
        await page.getByRole('button', { name: 'Neue Buchung' }).click();

        await page.getByLabel('Titel').fill('My New Booking');
        await page.getByLabel('Datum').fill(dateStr);
        await page.locator('text=Coachboat auswählen').click();
        await page.getByText('Booking Boat').click();
        await page.getByRole('button', { name: 'Buchung erstellen' }).click();
        await expect(page.getByText('Neue Buchung erstellen')).not.toBeVisible();
    });
});

test.describe('Events - Edit Permissions', () => {
    const resource = createResource({ title: 'Edit Test Boat' });
    const resourceData = { id: resource._id, attributes: { ...resource, 'category-id': category1.id } };

    test.describe('As Owner', () => {
        test.use({ storageState: STORAGE_STATE.user });
        const owner = AUTH_USERS.user;

        test('Owner can see edit button for their own event', async ({ page }) => {
            const ownEvent = createEvent({ title: 'My Event', date: dateStr, resource: resource._id, createdBy: owner.id });

            await setupMocks(page, owner, {
                'GET /events': {
                    data: [{
                        id: ownEvent._id,
                        attributes: {
                            ...ownEvent,
                            'start-date': 10 * 3600,
                            'end-date': 12 * 3600,
                            'is-recurring': false,
                            'created-by': owner.id
                        }
                    }]
                },
                'GET /resources': { data: [resourceData] },
                'GET /resource-categories': { data: [] },
                [`GET /resources/${resource._id}`]: { data: resourceData },
                [`GET /users/${owner.id}`]: { data: { id: owner.id, attributes: { 'first-name': owner.firstName, name: owner.name } } }
            });

            await page.goto('/events');
            await page.locator('.md\\:grid').getByText('My Event').first().click();
            await expect(page.getByRole('button', { name: 'Bearbeiten' })).toBeVisible();
        });

        test('Edit button opens edit modal with prefilled data', async ({ page }) => {
            const editEvent = createEvent({ title: 'Event To Edit', date: dateStr, resource: resource._id, createdBy: owner.id });

            await setupMocks(page, owner, {
                'GET /events': {
                    data: [{
                        id: editEvent._id,
                        attributes: {
                            ...editEvent,
                            'start-date': 11 * 3600,
                            'end-date': 13 * 3600,
                            'is-recurring': false,
                            'created-by': owner.id
                        }
                    }]
                },
                'GET /resources': { data: [resourceData] },
                'GET /resource-categories': { data: [] },
                [`GET /resources/${resource._id}`]: { data: resourceData },
                [`GET /users/${owner.id}`]: { data: { id: owner.id, attributes: { 'first-name': owner.firstName, name: owner.name } } }
            });

            await page.goto('/events');
            await page.locator('.md\\:grid').getByText('Event To Edit').first().click();
            await page.getByRole('button', { name: 'Bearbeiten' }).click();

            await expect(page.getByText('Buchung bearbeiten')).toBeVisible();
            await expect(page.getByLabel('Titel')).toHaveValue('Event To Edit');
        });
    });

    test.describe('As Non-Owner View Only', () => {
        test.use({ storageState: STORAGE_STATE.group_only });
        const viewer = AUTH_USERS.group_only;
        const otherOwner = AUTH_USERS.admin; // Just someone else

        test('Non-owner WITHOUT events:edit:any cannot see edit button', async ({ page }) => {
            const otherEvent = createEvent({ title: 'Other Event', date: dateStr, resource: resource._id, createdBy: otherOwner.id });

            await setupMocks(page, viewer, {
                'GET /events': {
                    data: [{
                        id: otherEvent._id,
                        attributes: {
                            ...otherEvent,
                            'start-date': 14 * 3600,
                            'end-date': 16 * 3600,
                            'is-recurring': false,
                            'created-by': otherOwner.id
                        }
                    }]
                },
                'GET /resources': { data: [resourceData] },
                'GET /resource-categories': { data: [] },
                [`GET /resources/${resource._id}`]: { data: resourceData },
                [`GET /users/${otherOwner.id}`]: { data: { id: otherOwner.id, attributes: { 'first-name': otherOwner.firstName, name: otherOwner.name } } }
            });

            await page.goto('/events');
            await page.locator('.md\\:grid').getByText('Other Event').first().click();
            await expect(page.getByRole('button', { name: 'Bearbeiten' })).not.toBeVisible();
        });
    });

    test.describe('As Admin', () => {
        test.use({ storageState: STORAGE_STATE.admin }); // Default anyway
        const admin = AUTH_USERS.admin;
        const otherOwner = AUTH_USERS.user;

        test('Admin WITH events:edit:any CAN see edit button for others events', async ({ page }) => {
            const otherEvent = createEvent({ title: 'Admin Edit Event', date: dateStr, resource: resource._id, createdBy: otherOwner.id });

            await setupMocks(page, admin, {
                'GET /events': {
                    data: [{
                        id: otherEvent._id,
                        attributes: {
                            ...otherEvent,
                            'start-date': 15 * 3600,
                            'end-date': 17 * 3600,
                            'is-recurring': false,
                            'created-by': otherOwner.id
                        }
                    }]
                },
                'GET /resources': { data: [resourceData] },
                'GET /resource-categories': { data: [] },
                [`GET /resources/${resource._id}`]: { data: resourceData },
                [`GET /users/${otherOwner.id}`]: { data: { id: otherOwner.id, attributes: { 'first-name': otherOwner.firstName, name: otherOwner.name } } }
            });

            await page.goto('/events');
            await page.locator('.md\\:grid').getByText('Admin Edit Event').first().click();
            await expect(page.getByRole('button', { name: 'Bearbeiten' })).toBeVisible();
        });
    });
});

test.describe('Events - Recurring Events', () => {
    test.use({ storageState: STORAGE_STATE.user });
    const user = AUTH_USERS.user;
    const recurringEvent = createEvent({ title: 'Weekly Training', date: dateStr });

    test('Shows recurring event indicator in details', async ({ page }) => {
        await setupMocks(page, user, {
            'GET /events': {
                data: [{
                    id: recurringEvent._id,
                    attributes: {
                        ...recurringEvent,
                        'start-date': 8 * 3600,
                        'end-date': 10 * 3600,
                        'is-recurring': true,
                        'recurrence-freq': 'weekly',
                        'recurrence-interval': 1,
                        'recurrence-end-date': '2026-12-31'
                    }
                }]
            },
            'GET /resources': { data: [] },
            'GET /resource-categories': { data: [] }
        });

        await page.goto('/events');
        await page.locator('.md\\:grid').getByText('Weekly Training').first().click();

        // Should show recurring indicator - scope to modal
        const modal = page.getByRole('dialog');
        await expect(modal.getByText('Wiederkehrende Buchung')).toBeVisible();
        await expect(modal.getByText('wöchentlichen')).toBeVisible();
    });
});
