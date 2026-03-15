import { test, expect, type Route } from "@playwright/test";
import { setupMocks } from "./test-utils";
import { AUTH_USERS, STORAGE_STATE } from "./fixtures/auth";

const baseNotification = {
    id: "notif-1",
    type: "notification",
    attributes: {
        type: "system",
        title: "Neue Formulareinreichung",
        message: "Es gibt eine neue Einreichung.",
        url: "/forms/form-1/submissions",
        "created-at": "2026-02-06T12:00:00.000Z",
        read: false,
        "read-at": null,
    },
};

test.describe("Notifications - inbox behavior", () => {
    test.use({ storageState: STORAGE_STATE.user });
    const user = AUTH_USERS.user;

    test("opens notifications popover from sidebar footer", async ({ page }) => {
        await setupMocks(page, user, {
            "GET /notifications": {
                data: [baseNotification],
            },
        });

        await page.goto("/");

        const sidebar = page.locator("aside");
        await sidebar
            .getByRole("button", { name: /Benachrichtigungen/ })
            .click();

        await expect(
            page.getByRole("dialog", { name: "Benachrichtigungen" }),
        ).toBeVisible();
        await expect(page.getByText("Neue Formulareinreichung")).toBeVisible();
        await expect(
            page.getByRole("link", {
                name: "Alle Benachrichtigungen anzeigen",
            }),
        ).toBeVisible();
    });

    test("lists and marks notification as read", async ({ page }) => {
        let read = false;

        await setupMocks(page, user, {
            "GET /notifications": async (route: Route) => {
                const payload = {
                    data: [
                        {
                            ...baseNotification,
                            attributes: {
                                ...baseNotification.attributes,
                                read,
                                "read-at": read ? "2026-02-06T12:05:00.000Z" : null,
                            },
                        },
                    ],
                };
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify(payload),
                });
            },
            "PATCH /notifications/notif-1": async (route: Route) => {
                const body = await route.request().postDataJSON();
                read = !!body.data.attributes.read;
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({
                        data: {
                            ...baseNotification,
                            attributes: {
                                ...baseNotification.attributes,
                                read,
                                "read-at": read ? "2026-02-06T12:05:00.000Z" : null,
                            },
                        },
                    }),
                });
            },
        });

        await page.goto("/notifications");
        await expect(
            page.getByRole("heading", { name: "Benachrichtigungen" }),
        ).toBeVisible();
        await expect(page.getByText("Neue Formulareinreichung")).toBeVisible();
        await page.getByRole("button", { name: "Als gelesen markieren" }).click();
        await expect(page.getByRole("button", { name: "Als ungelesen markieren" })).toBeVisible();
    });
});

test.describe("Notifications - admin create", () => {
    test.use({ storageState: STORAGE_STATE.admin });
    const admin = AUTH_USERS.admin;

    test("creates a broadcast notification", async ({ page }) => {
        let posted = false;

        await setupMocks(page, admin, {
            "GET /notifications": { data: [] },
            "POST /notifications": async (route: Route) => {
                posted = true;
                await route.fulfill({
                    status: 201,
                    contentType: "application/json",
                    body: JSON.stringify({
                        data: {
                            id: "broadcast-1",
                            type: "notification-broadcast",
                            attributes: {
                                broadcast: true,
                                recipients: 5,
                                title: "Maintenance",
                                message: "Systemwartung heute Abend",
                            },
                        },
                    }),
                });
            },
        });

        await page.goto("/notifications");
        await page.getByLabel("Titel").fill("Maintenance");
        await page
            .getByLabel("Nachricht")
            .fill("Systemwartung heute Abend");
        await page.getByRole("button", { name: "Benachrichtigung senden" }).click();

        await expect(page.getByText("Broadcast erstellt für 5 Empfänger.")).toBeVisible();
        expect(posted).toBe(true);
    });
});
