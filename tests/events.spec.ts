import { test, expect } from '@playwright/test';
import { setupAndLogin, mockApi } from './test-utils';
import { createUser, createEvent, createResource, createResourceCategory } from './factories';

/**
 * Events Page E2E Tests
 * 
 * Tests cover:
 * 1. Calendar navigation and display
 * 2. Event creation with different permissions
 * 3. Event editing with owner vs admin permissions
 * 4. Category filtering
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
    const user = createUser({ status: 2, permissions: ['events:view'] });

    test.beforeEach(async ({ page }) => {
        await setupAndLogin(page, user, {
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
        await page.click('text=Kalender anschauen');
        await expect(page).toHaveURL('/events');
        await expect(page.getByRole('heading', { name: 'Buchungen' })).toBeVisible();
    });

    test('Shows current month and year', async ({ page }) => {
        await page.goto('/events');

        // Month name and year should be visible somewhere on the page
        const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
            'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
        const currentMonth = monthNames[today.getMonth()];

        // Just verify the month/year is displayed - navigation controls exist
        // Using .first() because it might appear in navigation and mobile list
        await expect(page.getByText(currentMonth).first()).toBeVisible();
        await expect(page.getByText(String(year)).first()).toBeVisible();
    });
});

test.describe('Events - Display & Filtering', () => {
    const user = createUser({ status: 2, permissions: ['events:view'] });
    const event1 = createEvent({ title: 'Training Session', date: dateStr, resource: resource1._id });
    const event2 = createEvent({ title: 'Equipment Check', date: dateStr, resource: resource2._id });

    test.beforeEach(async ({ page }) => {
        await setupAndLogin(page, user, {
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

        // Check desktop grid for events
        await expect(page.locator('.md\\:grid').getByText('Training Session').first()).toBeVisible();
        await expect(page.locator('.md\\:grid').getByText('Equipment Check').first()).toBeVisible();
    });

    test('Shows category filter buttons', async ({ page }) => {
        await page.goto('/events');

        // Category buttons should be visible
        await expect(page.getByRole('button', { name: 'Alle' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Boote' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Zubehör' })).toBeVisible();
    });

    test('Filters events by category', async ({ page }) => {
        await page.goto('/events');

        // Click on "Boote" category filter
        await page.getByRole('button', { name: 'Boote' }).click();

        // Training Session should be visible (uses resource1 in category1)
        await expect(page.locator('.md\\:grid').getByText('Training Session').first()).toBeVisible();

        // Equipment Check should be hidden (uses resource2 in category2)
        await expect(page.locator('.md\\:grid').getByText('Equipment Check')).not.toBeVisible();
    });

    test('Shows "Alle" resets filter', async ({ page }) => {
        await page.goto('/events');

        // Filter by category
        await page.getByRole('button', { name: 'Boote' }).click();

        // Then click "Alle" to reset
        await page.getByRole('button', { name: 'Alle' }).click();

        // Both events should be visible again
        await expect(page.locator('.md\\:grid').getByText('Training Session').first()).toBeVisible();
        await expect(page.locator('.md\\:grid').getByText('Equipment Check').first()).toBeVisible();
    });
});

test.describe('Events - Event Details Modal', () => {
    const user = createUser({ firstName: 'Max', name: 'Mustermann', status: 2, permissions: ['events:view'] });
    const event = createEvent({ title: 'Detailed Event', date: dateStr, resource: resource1._id, createdBy: user.id });

    test.beforeEach(async ({ page }) => {
        await setupAndLogin(page, user, {
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

        // Click on the event
        await page.locator('.md\\:grid').getByText('Detailed Event').first().click();

        // Modal should appear with event title
        await expect(page.getByRole('heading', { name: 'Detailed Event' })).toBeVisible();
        await expect(page.getByText('Buchungsdetails')).toBeVisible();
    });

    test('Shows event time range in details', async ({ page }) => {
        await page.goto('/events');
        await page.locator('.md\\:grid').getByText('Detailed Event').first().click();

        // Wait for modal and check that times are displayed
        const modal = page.getByRole('dialog');
        await expect(modal.getByText('09:00')).toBeVisible();
        await expect(modal.getByText('11:00')).toBeVisible();
    });

    test('Shows resource/coachboat in details', async ({ page }) => {
        await page.goto('/events');
        await page.locator('.md\\:grid').getByText('Detailed Event').first().click();

        // Scope to modal dialog, resource name should appear
        const modal = page.getByRole('dialog');
        await expect(modal.getByText('Coachboat Alpha')).toBeVisible();
    });

    test('Shows creator name in details', async ({ page }) => {
        await page.goto('/events');
        await page.locator('.md\\:grid').getByText('Detailed Event').first().click();

        // Creator name should appear
        await expect(page.getByText('Max Mustermann')).toBeVisible();
    });
});

test.describe('Events - Creation Permissions', () => {
    const resource = createResource({ title: 'Booking Boat' });
    const resourceData = { id: resource._id, attributes: { ...resource, 'category-id': category1.id } };

    test('User WITHOUT events:create cannot see create button', async ({ page }) => {
        const basicUser = createUser({ status: 1, permissions: ['events:view'] });

        await setupAndLogin(page, basicUser, {
            'GET /events': { data: [] },
            'GET /resources': { data: [resourceData] },
            'GET /resource-categories': { data: [] }
        });

        await page.goto('/events');

        // Create button should NOT be visible
        await expect(page.getByRole('button', { name: 'Neue Buchung' })).not.toBeVisible();
    });

    test('User WITH events:create can see create button', async ({ page }) => {
        const modUser = createUser({ status: 2, permissions: ['events:view', 'events:create'] });

        await setupAndLogin(page, modUser, {
            'GET /events': { data: [] },
            'GET /resources': { data: [resourceData] },
            'GET /resource-categories': { data: [] }
        });

        await page.goto('/events');

        // Create button SHOULD be visible
        await expect(page.getByRole('button', { name: 'Neue Buchung' })).toBeVisible();
    });

    test('Opens create modal when clicking create button', async ({ page }) => {
        const modUser = createUser({ status: 2, permissions: ['events:view', 'events:create'] });

        await setupAndLogin(page, modUser, {
            'GET /events': { data: [] },
            'GET /resources': { data: [resourceData] },
            'GET /resource-categories': { data: [] }
        });

        await page.goto('/events');
        await page.getByRole('button', { name: 'Neue Buchung' }).click();

        // Modal should open with form
        await expect(page.getByText('Neue Buchung erstellen')).toBeVisible();
        await expect(page.getByLabel('Titel')).toBeVisible();
        await expect(page.getByLabel('Datum')).toBeVisible();
    });

    test('Can create a new event', async ({ page }) => {
        const modUser = createUser({ status: 2, permissions: ['events:view', 'events:create'] });
        let createdEvent: any = null;

        await setupAndLogin(page, modUser, {
            'GET /events': { data: [] },
            'GET /resources': { data: [resourceData] },
            'GET /resource-categories': { data: [] },
            'POST /events': async (route) => {
                const body = await route.request().postDataJSON();
                createdEvent = body;
                await route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify({ data: { id: 'new-event-id', attributes: body.data.attributes } })
                });
            }
        });

        await page.goto('/events');
        await page.getByRole('button', { name: 'Neue Buchung' }).click();

        // Fill the form
        await page.getByLabel('Titel').fill('My New Booking');
        await page.getByLabel('Datum').fill(dateStr);

        // Select resource (using the searchable select)
        await page.locator('text=Coachboat auswählen').click();
        await page.getByText('Booking Boat').click();

        // Submit
        await page.getByRole('button', { name: 'Buchung erstellen' }).click();

        // Modal should close
        await expect(page.getByText('Neue Buchung erstellen')).not.toBeVisible();
    });
});

test.describe('Events - Edit Permissions', () => {
    const resource = createResource({ title: 'Edit Test Boat' });
    const resourceData = { id: resource._id, attributes: { ...resource, 'category-id': category1.id } };

    test('Owner can see edit button for their own event', async ({ page }) => {
        const owner = createUser({ firstName: 'Owner', name: 'User', status: 2, permissions: ['events:view'] });
        const ownEvent = createEvent({ title: 'My Event', date: dateStr, resource: resource._id, createdBy: owner.id });

        await setupAndLogin(page, owner, {
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

        // Edit button should be visible for owner
        await expect(page.getByRole('button', { name: 'Bearbeiten' })).toBeVisible();
    });

    test('Non-owner WITHOUT events:edit:any cannot see edit button', async ({ page }) => {
        const otherOwner = createUser({ firstName: 'Other', name: 'Person' });
        const viewer = createUser({ firstName: 'Viewer', name: 'User', status: 2, permissions: ['events:view'] });
        const otherEvent = createEvent({ title: 'Other Event', date: dateStr, resource: resource._id, createdBy: otherOwner.id });

        await setupAndLogin(page, viewer, {
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

        // Edit button should NOT be visible
        await expect(page.getByRole('button', { name: 'Bearbeiten' })).not.toBeVisible();
    });

    test('Admin WITH events:edit:any CAN see edit button for others events', async ({ page }) => {
        const otherOwner = createUser({ firstName: 'Other', name: 'Person' });
        const admin = createUser({ firstName: 'Admin', name: 'User', status: 3, permissions: ['events:view', 'events:create', 'events:edit:any'] });
        const otherEvent = createEvent({ title: 'Admin Edit Event', date: dateStr, resource: resource._id, createdBy: otherOwner.id });

        await setupAndLogin(page, admin, {
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

        // Edit button SHOULD be visible for admin
        await expect(page.getByRole('button', { name: 'Bearbeiten' })).toBeVisible();
    });

    test('Edit button opens edit modal with prefilled data', async ({ page }) => {
        const owner = createUser({ firstName: 'Owner', name: 'Edit', status: 2, permissions: ['events:view', 'events:create'] });
        const editEvent = createEvent({ title: 'Event To Edit', date: dateStr, resource: resource._id, createdBy: owner.id });

        await setupAndLogin(page, owner, {
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

        // Edit modal should open with title prefilled
        await expect(page.getByText('Buchung bearbeiten')).toBeVisible();
        await expect(page.getByLabel('Titel')).toHaveValue('Event To Edit');
    });
});

test.describe('Events - Recurring Events', () => {
    const user = createUser({ status: 2, permissions: ['events:view'] });
    const recurringEvent = createEvent({ title: 'Weekly Training', date: dateStr });

    test('Shows recurring event indicator in details', async ({ page }) => {
        await setupAndLogin(page, user, {
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
