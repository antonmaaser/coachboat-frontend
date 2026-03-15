import { test, expect, type Route } from "@playwright/test";
import { setupMocks } from "./test-utils";
import { AUTH_USERS, STORAGE_STATE } from "./fixtures/auth";

const formSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    title: "Mitgliedsantrag",
    description: "Formular für neue Mitglieder",
    additionalProperties: false,
    properties: {
        fullName: {
            type: "string",
            title: "Full name",
            minLength: 2,
            "x-ui": {
                widget: "text",
                placeholder: "Jane Doe",
            },
        },
        email: {
            type: "string",
            title: "Email",
            format: "email",
            "x-ui": {
                widget: "email",
                placeholder: "name@example.com",
            },
        },
        acceptTerms: {
            type: "boolean",
            title: "Accept terms",
            const: true,
            "x-ui": {
                widget: "checkbox",
            },
        },
    },
    required: ["fullName", "email", "acceptTerms"],
    "x-form": {
        schemaVersion: "1.0.0",
        editorVersion: "1.x",
        rendererVersion: "1.x",
        requiresSignature: false,
        layout: {
            pages: [
                {
                    id: "page_main",
                    title: "Main",
                    elements: [
                        {
                            kind: "field",
                            field: "fullName",
                            colSpan: { sm: 12, md: 6 },
                        },
                        {
                            kind: "field",
                            field: "email",
                            colSpan: { sm: 12, md: 6 },
                        },
                        {
                            kind: "field",
                            field: "acceptTerms",
                            colSpan: { sm: 12, md: 12 },
                        },
                    ],
                },
            ],
        },
        logic: {
            operators: [
                "eq",
                "neq",
                "in",
                "notIn",
                "gt",
                "gte",
                "lt",
                "lte",
                "isEmpty",
                "isNotEmpty",
            ],
            combinators: ["all", "any"],
        },
        submission: {
            unknownFieldPolicy: "reject",
            stripHiddenValues: true,
        },
    },
};

const wizardFormSchema = {
    ...formSchema,
    "x-form": {
        ...formSchema["x-form"],
        layout: {
            pages: [
                {
                    id: "page_1",
                    title: "Applicant",
                    elements: [
                        {
                            kind: "field",
                            field: "fullName",
                            colSpan: { sm: 12, md: 12 },
                        },
                    ],
                },
                {
                    id: "page_2",
                    title: "Contact",
                    elements: [
                        {
                            kind: "field",
                            field: "email",
                            colSpan: { sm: 12, md: 12 },
                        },
                        {
                            kind: "field",
                            field: "acceptTerms",
                            colSpan: { sm: 12, md: 12 },
                        },
                    ],
                },
            ],
        },
    },
};

const formResource = {
    id: "form-1",
    type: "form",
    attributes: {
        name: "Mitgliedsantrag",
        description: "Formular für neue Mitglieder",
        fields: formSchema,
        "form-type": "membership",
        "requires-signature": false,
        published: true,
        visibility: "all",
    },
};

const wizardFormResource = {
    id: "form-wizard",
    type: "form",
    attributes: {
        name: "Wizard Formular",
        description: "Mehrseitiges Formular",
        fields: wizardFormSchema,
        "form-type": "event_signup",
        "requires-signature": false,
        published: true,
        visibility: "admin_moderator",
    },
};

test.describe("Forms - CRUD and submission", () => {
    test.use({ storageState: STORAGE_STATE.admin });
    const admin = AUTH_USERS.admin;

    test("creates a form from forms overview", async ({ page }) => {
        let created = false;
        let createdBody: any = null;

        await setupMocks(page, admin, {
            "GET /forms": {
                data: [formResource],
            },
            "POST /forms": async (route: Route) => {
                created = true;
                const body = await route.request().postDataJSON();
                createdBody = body;
                await route.fulfill({
                    status: 201,
                    contentType: "application/json",
                    body: JSON.stringify({
                        data: {
                            id: "form-created",
                            type: "form",
                            attributes: body.data.attributes,
                        },
                    }),
                });
            },
        });

        await page.goto("/forms");
        await expect(page.getByRole("heading", { name: "Formulare" })).toBeVisible();
        await page.getByRole("button", { name: "Neues Formular" }).click();

        await page.getByLabel("Name").fill("Regatta Anmeldung");
        await page.getByLabel("Beschreibung").fill("Anmeldung für Event");
        await page
            .locator("dialog form")
            .evaluate((form) => (form as HTMLFormElement).requestSubmit());

        await expect(page.getByRole("dialog")).not.toBeVisible();
        expect(created).toBe(true);
        expect(createdBody?.data?.attributes?.fields?.$schema).toBe(
            "https://json-schema.org/draft/2020-12/schema",
        );
        expect(createdBody?.data?.attributes?.fields?.["x-form"]?.schemaVersion).toBe(
            "1.0.0",
        );
        expect(createdBody?.data?.attributes?.["form-type"]).toBe("general");
        expect(createdBody?.data?.attributes?.visibility).toBe("all");
    });

    test("opens form detail and updates submission status", async ({ page }) => {
        let currentStatus = "submitted";

        await setupMocks(page, admin, {
            "GET /forms": { data: [formResource] },
            "GET /forms/form-1": { data: formResource },
            "GET /forms/form-1/submissions": async (route: Route) => {
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({
                        data: [
                            {
                                id: "sub-1",
                                type: "form-submission",
                                attributes: {
                                    "form-id": "form-1",
                                    "submitted-by": admin.id,
                                    data: {
                                        fullName: "Alice Example",
                                        email: "alice@example.com",
                                        acceptTerms: true,
                                    },
                                    status: currentStatus,
                                },
                            },
                        ],
                    }),
                });
            },
            "PATCH /form-submissions/sub-1": async (route: Route) => {
                const body = await route.request().postDataJSON();
                currentStatus = body.data.attributes.status;
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({
                        data: {
                            id: "sub-1",
                            type: "form-submission",
                            attributes: {
                                "form-id": "form-1",
                                "submitted-by": admin.id,
                                data: {
                                    fullName: "Alice Example",
                                    email: "alice@example.com",
                                    acceptTerms: true,
                                },
                                status: currentStatus,
                            },
                        },
                    }),
                });
            },
        });

        await page.goto("/forms/form-1");
        await expect(page.getByRole("heading", { name: "Mitgliedsantrag" })).toBeVisible();
        await expect(page.getByText("submitted").first()).toBeVisible();

        await page.getByRole("button", { name: "Genehmigen" }).click();
        await expect(page.getByText("approved").first()).toBeVisible();
    });
});

test.describe("Forms - member submission", () => {
    test.use({ storageState: STORAGE_STATE.user });
    const user = AUTH_USERS.user;

    test("submits form data", async ({ page }) => {
        let submitted = false;
        let submittedPayload: any = null;

        await setupMocks(page, user, {
            "GET /forms/form-1": { data: formResource },
            "POST /forms/form-1/submissions": async (route: Route) => {
                submitted = true;
                const body = await route.request().postDataJSON();
                submittedPayload = body;
                await route.fulfill({
                    status: 201,
                    contentType: "application/json",
                    body: JSON.stringify({
                        data: {
                            id: "sub-user-1",
                            type: "form-submission",
                            attributes: {
                                "form-id": "form-1",
                                "submitted-by": user.id,
                                data: body.data.attributes.data,
                                status: "submitted",
                            },
                        },
                    }),
                });
            },
        });

        await page.goto("/forms/form-1");
        const submitForm = page.locator("form").first();
        await expect(submitForm.getByRole("button", { name: "Weiter" })).toHaveCount(0);
        await expect(submitForm.getByRole("button", { name: "Zurück" })).toHaveCount(0);
        await expect(page.getByText(/Schritt \d+ von \d+/)).toHaveCount(0);
        await page.getByLabel("Full name").fill("John Doe");
        await page.getByLabel("Email").fill("john.doe@example.com");
        await page.getByLabel("Accept terms").check();
        await page.getByRole("button", { name: "Einreichen" }).click();

        expect(submitted).toBe(true);
        expect(submittedPayload?.data?.attributes?.data).toMatchObject({
            fullName: "John Doe",
            email: "john.doe@example.com",
            acceptTerms: true,
        });
    });

    test("renders pages as step-by-step wizard", async ({ page }) => {
        let submitted = false;
        let submittedPayload: any = null;

        await setupMocks(page, user, {
            "GET /forms/form-wizard": { data: wizardFormResource },
            "POST /forms/form-wizard/submissions": async (route: Route) => {
                submitted = true;
                const body = await route.request().postDataJSON();
                submittedPayload = body;
                await route.fulfill({
                    status: 201,
                    contentType: "application/json",
                    body: JSON.stringify({
                        data: {
                            id: "sub-user-2",
                            type: "form-submission",
                            attributes: {
                                "form-id": "form-wizard",
                                "submitted-by": user.id,
                                data: body.data.attributes.data,
                                status: "submitted",
                            },
                        },
                    }),
                });
            },
        });

        await page.goto("/forms/form-wizard");
        await expect(page.getByText("Schritt 1 von 2")).toBeVisible();

        await page.getByRole("button", { name: "Weiter" }).click();
        await expect(page.getByText("Full name ist erforderlich.")).toBeVisible();

        await page.getByLabel("Full name").fill("John Doe");
        await page.getByRole("button", { name: "Weiter" }).click();

        await expect(page.getByText("Schritt 2 von 2")).toBeVisible();
        await page.getByLabel("Email").fill("john.doe@example.com");
        await page.getByLabel("Accept terms").check();

        await page.getByRole("button", { name: "Einreichen" }).click();

        expect(submitted).toBe(true);
        expect(submittedPayload?.data?.attributes?.data).toMatchObject({
            fullName: "John Doe",
            email: "john.doe@example.com",
            acceptTerms: true,
        });
    });
});
