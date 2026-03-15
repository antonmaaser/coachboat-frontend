import { test, expect, type Route } from "@playwright/test";
import { setupMocks } from "./test-utils";
import { AUTH_USERS } from "./fixtures/auth";

test.describe("Organization context header propagation", () => {
    const user = AUTH_USERS.user;

    test("sends X-Organization-Id to API endpoints but not auth token endpoint", async ({ page }) => {
        let authHeader: string | undefined;
        let usersHeader: string | undefined;

        await setupMocks(page, user, {
            "AUTH POST /token": async (route: Route) => {
                authHeader = route.request().headers()["x-organization-id"];
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({
                        access_token: "access-token-1",
                        refresh_token: "refresh-token-1",
                        user_id: user.id,
                        organizationId: user.organizationId,
                    }),
                });
            },
            [`GET /users/${user.id}`]: async (route: Route) => {
                usersHeader = route.request().headers()["x-organization-id"];
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({
                        data: {
                            id: user.id,
                            attributes: {
                                email: user.email,
                                name: user.name,
                                "first-name": user.firstName,
                                permissions: user.permissions,
                                organizations: [
                                    { id: "org-test-1", name: "Org One", slug: "org-one" },
                                ],
                            },
                        },
                    }),
                });
            },
        });

        await page.goto("/login");
        await page.fill('input[name="email"]', user.email);
        await page.fill('input[name="password"]', user.password);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL("/");

        expect(authHeader).toBeUndefined();
        expect(usersHeader).toBe(user.organizationId);
    });

    test("uses updated org header after switch organization", async ({ page }) => {
        const userHeaders: string[] = [];

        await setupMocks(page, user, {
            "AUTH POST /token": {
                access_token: "access-token-1",
                refresh_token: "refresh-token-1",
                user_id: user.id,
                organizationId: "org-test-1",
            },
            "AUTH POST /switch-organization": {
                access_token: "access-token-2",
                refresh_token: "refresh-token-2",
                user_id: user.id,
                organizationId: "org-test-2",
            },
            [`GET /users/${user.id}`]: async (route: Route) => {
                userHeaders.push(route.request().headers()["x-organization-id"] || "");
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({
                        data: {
                            id: user.id,
                            attributes: {
                                email: user.email,
                                name: user.name,
                                "first-name": user.firstName,
                                permissions: user.permissions,
                                organizations: [
                                    { id: "org-test-1", name: "Org One", slug: "org-one" },
                                    { id: "org-test-2", name: "Org Two", slug: "org-two" },
                                ],
                            },
                        },
                    }),
                });
            },
        });

        await page.goto("/login");
        await page.fill('input[name="email"]', user.email);
        await page.fill('input[name="password"]', user.password);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL("/");

        await page.locator("select").first().selectOption("org-test-2");
        await expect.poll(() => userHeaders[userHeaders.length - 1]).toBe("org-test-2");
    });
});
