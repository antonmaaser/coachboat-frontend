import { expect, test, type Page, type Route } from "@playwright/test";
import { createGroup } from "./factories";
import { AUTH_USERS, STORAGE_STATE } from "./fixtures/auth";
import { setupMocks } from "./test-utils";

const group = createGroup({
    id: "group-members-rbac-1",
    title: "RBAC Crew",
});

const currentUserMember = {
    id: AUTH_USERS.user.id,
    type: "user",
    attributes: {
        name: AUTH_USERS.user.name,
        "first-name": AUTH_USERS.user.firstName,
        email: AUTH_USERS.user.email,
        role: "member",
    },
};

const teammateMember = {
    id: "group-member-teammate",
    type: "user",
    attributes: {
        name: "Teammate",
        "first-name": "Taylor",
        email: "teammate@example.com",
        role: "member",
    },
};

const memberListResponse = {
    data: [currentUserMember, teammateMember],
};

const groupResponse = {
    data: {
        id: group.id,
        attributes: {
            ...group,
            members: [currentUserMember, teammateMember],
        },
    },
};

const streamHandler = async (route: Route) => {
    await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: ":\n\n",
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
};

async function openMembersModal(page: Page) {
    await page.goto(`/groups/${group.id}`);
    await page.getByRole("button", { name: /^Mitglieder/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
}

test.describe("Group members permissions", () => {
    test.use({ storageState: STORAGE_STATE.user });

    test("Read-only users cannot edit group members", async ({ page }) => {
        const readOnlyUser = {
            ...AUTH_USERS.user,
            permissions: ["groups:read"],
        };

        await setupMocks(page, readOnlyUser, {
            [`GET /groups/${group.id}`]: groupResponse,
            [`GET /groups/${group.id}/posts`]: { data: [] },
            [`GET /groups/${group.id}/feed`]: { data: [] },
            [`GET /groups/${group.id}/stream`]: streamHandler,
            [`GET /groups/${group.id}/users`]: memberListResponse,
            "GET /users": { data: [currentUserMember, teammateMember] },
        });

        await openMembersModal(page);

        const modal = page.getByRole("dialog");
        await expect(
            modal.getByTestId("group-members-add-section"),
        ).toHaveCount(0);
        await expect(
            modal.getByRole("button", { name: "Mitgliedsaktionen" }),
        ).toHaveCount(0);
    });

    test("Context groups:update:any enables member edits", async ({ page }) => {
        let patchedRole: string | undefined;

        const contextManagerUser = {
            ...AUTH_USERS.user,
            permissions: ["groups:read"],
            effective_permissions: {
                global: null,
                contexts: [
                    {
                        id: group.id,
                        name: group.title,
                        role: "group_manager",
                        roleName: "Group Manager",
                        permissions: ["groups:read", "groups:update:any"],
                    },
                ],
            },
        };

        await setupMocks(page, contextManagerUser, {
            [`GET /groups/${group.id}`]: groupResponse,
            [`GET /groups/${group.id}/posts`]: { data: [] },
            [`GET /groups/${group.id}/feed`]: { data: [] },
            [`GET /groups/${group.id}/stream`]: streamHandler,
            [`GET /groups/${group.id}/users`]: memberListResponse,
            [`PATCH /groups/${group.id}/users/${teammateMember.id}`]: async (
                route: Route,
            ) => {
                const payload = route.request().postDataJSON();
                patchedRole = payload?.data?.attributes?.role;
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({ data: {} }),
                    headers: { "Access-Control-Allow-Origin": "*" },
                });
            },
            "GET /users": { data: [currentUserMember, teammateMember] },
        });

        await openMembersModal(page);

        const modal = page.getByRole("dialog");
        await expect(modal.getByTestId("group-members-add-section")).toBeVisible();
        await expect(
            modal.getByRole("button", { name: "Mitgliedsaktionen" }),
        ).toHaveCount(1);

        await modal
            .getByRole("button", { name: "Mitgliedsaktionen" })
            .first()
            .click();
        await page.getByRole("button", { name: "Admin" }).click();

        await expect.poll(() => patchedRole).toBe("admin");
    });

    test("Legacy groups:manage no longer grants member editing", async ({
        page,
    }) => {
        const legacyManagerUser = {
            ...AUTH_USERS.user,
            permissions: ["groups:read", "groups:manage"],
        };

        await setupMocks(page, legacyManagerUser, {
            [`GET /groups/${group.id}`]: groupResponse,
            [`GET /groups/${group.id}/posts`]: { data: [] },
            [`GET /groups/${group.id}/feed`]: { data: [] },
            [`GET /groups/${group.id}/stream`]: streamHandler,
            [`GET /groups/${group.id}/users`]: memberListResponse,
            "GET /users": { data: [currentUserMember, teammateMember] },
        });

        await openMembersModal(page);

        const modal = page.getByRole("dialog");
        await expect(
            modal.getByTestId("group-members-add-section"),
        ).toHaveCount(0);
        await expect(
            modal.getByRole("button", { name: "Mitgliedsaktionen" }),
        ).toHaveCount(0);
    });
});
