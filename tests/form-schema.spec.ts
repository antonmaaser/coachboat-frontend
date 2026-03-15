import { expect, test } from "@playwright/test";
import type { FormDefinitionV1 } from "../src/lib/forms/schema";
import { getFieldState, stripHiddenValues } from "../src/lib/forms/rules";
import { validateFormDefinition, validateSubmissionData } from "../src/lib/forms/validate";
import { finalizeDraftFieldKeys } from "../src/lib/forms/builder";

const schema: FormDefinitionV1 = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    title: "Membership",
    additionalProperties: false,
    properties: {
        fullName: {
            type: "string",
            title: "Full name",
            minLength: 2,
            "x-ui": { widget: "text" },
        },
        email: {
            type: "string",
            title: "Email",
            format: "email",
            "x-ui": { widget: "email" },
        },
        isMinor: {
            type: "boolean",
            title: "Is minor",
            "x-ui": { widget: "checkbox" },
        },
        guardianName: {
            type: "string",
            title: "Guardian",
            minLength: 2,
            "x-ui": { widget: "text" },
            "x-rules": {
                visibleWhen: {
                    all: [{ field: "isMinor", op: "eq", value: true }],
                },
                requiredWhen: {
                    all: [{ field: "isMinor", op: "eq", value: true }],
                },
            },
        },
        crewMembers: {
            type: "array",
            title: "Crew members",
            minItems: 1,
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    name: { type: "string", title: "Name", minLength: 2 },
                },
                required: ["name"],
            },
            "x-ui": { widget: "repeater" },
        },
    },
    required: ["fullName", "email", "isMinor", "crewMembers"],
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
                        { kind: "field", field: "fullName", colSpan: { sm: 12, md: 6 } },
                        { kind: "field", field: "email", colSpan: { sm: 12, md: 6 } },
                        { kind: "field", field: "isMinor", colSpan: { sm: 12, md: 6 } },
                        {
                            kind: "field",
                            field: "guardianName",
                            colSpan: { sm: 12, md: 6 },
                        },
                        {
                            kind: "field",
                            field: "crewMembers",
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

test("validates schema v1 definition", () => {
    const result = validateFormDefinition(schema);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
});

test("rejects malformed schema definition", () => {
    const malformed = {
        type: "object",
        properties: {},
    };

    const result = validateFormDefinition(malformed);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("$schema");
});

test("evaluates conditional visibility and required flags", () => {
    const hiddenState = getFieldState(schema, "guardianName", {
        isMinor: false,
    });
    expect(hiddenState.visible).toBe(false);
    expect(hiddenState.required).toBe(false);

    const visibleState = getFieldState(schema, "guardianName", {
        isMinor: true,
    });
    expect(visibleState.visible).toBe(true);
    expect(visibleState.required).toBe(true);
});

test("strips hidden values", () => {
    const stripped = stripHiddenValues(schema, {
        isMinor: false,
        guardianName: "Hidden Guardian",
        fullName: "John Doe",
        email: "john@example.com",
        crewMembers: [{ name: "Alice" }],
    });

    expect(stripped.guardianName).toBeUndefined();
    expect(stripped.fullName).toBe("John Doe");
});

test("rejects invalid submissions", () => {
    const invalidEmail = validateSubmissionData(schema, {
        fullName: "John Doe",
        email: "not-an-email",
        isMinor: false,
        crewMembers: [{ name: "Alice" }],
    });
    expect(invalidEmail.valid).toBe(false);

    const unknownField = validateSubmissionData(schema, {
        fullName: "John Doe",
        email: "john@example.com",
        isMinor: false,
        crewMembers: [{ name: "Alice" }],
        unknown: true,
    });
    expect(unknownField.valid).toBe(false);

    const repeaterInvalid = validateSubmissionData(schema, {
        fullName: "John Doe",
        email: "john@example.com",
        isMinor: false,
        crewMembers: [],
    });
    expect(repeaterInvalid.valid).toBe(false);
});

test("finalizes draft field keys from labels on first save", () => {
    const draftSchema: FormDefinitionV1 = structuredClone(schema);

    draftSchema.properties["__draft_field_1"] = {
        type: "string",
        title: "Skipper Name",
        "x-ui": { widget: "text" },
    };
    draftSchema.properties["__draft_field_2"] = {
        type: "string",
        title: "Email",
        "x-ui": { widget: "text" },
    };
    draftSchema.required = [...(draftSchema.required || []), "__draft_field_1"];

    draftSchema["x-form"].layout.pages[0].elements.push(
        { kind: "field", field: "__draft_field_1", colSpan: { sm: 12, md: 12 } },
        { kind: "field", field: "__draft_field_2", colSpan: { sm: 12, md: 12 } },
    );

    draftSchema.properties.guardianName["x-rules"] = {
        visibleWhen: {
            all: [{ field: "__draft_field_1", op: "eq", value: true }],
        },
    };

    const finalized = finalizeDraftFieldKeys(draftSchema);

    expect(finalized.properties["__draft_field_1"]).toBeUndefined();
    expect(finalized.properties["__draft_field_2"]).toBeUndefined();
    expect(finalized.properties.skipper_name).toBeDefined();
    expect(finalized.properties.email_2).toBeDefined();
    expect(finalized.required).toContain("skipper_name");
    expect(
        finalized["x-form"].layout.pages[0].elements.some(
            (element) => element.kind === "field" && element.field === "skipper_name",
        ),
    ).toBe(true);
    expect(
        finalized.properties.guardianName["x-rules"]?.visibleWhen?.all?.[0]?.field,
    ).toBe("skipper_name");
});
