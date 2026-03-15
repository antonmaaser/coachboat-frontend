export const FORM_SCHEMA_URI = "https://json-schema.org/draft/2020-12/schema";
export const FORM_SCHEMA_VERSION = "1.0.0";

export const FORM_LOGIC_OPERATORS = [
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
] as const;

export type RuleOperator = (typeof FORM_LOGIC_OPERATORS)[number];
export type RuleCombinator = "all" | "any";

export type WidgetType =
    | "text"
    | "textarea"
    | "email"
    | "number"
    | "select"
    | "checkbox"
    | "radio"
    | "date"
    | "repeater";

export interface RuleCondition {
    field: string;
    op: RuleOperator;
    value?: unknown;
}

export interface RuleGroup {
    all?: RuleCondition[];
    any?: RuleCondition[];
}

export interface FieldRules {
    visibleWhen?: RuleGroup;
    requiredWhen?: RuleGroup;
}

export interface FieldUi {
    widget?: WidgetType;
    placeholder?: string;
    helpText?: string;
    optionLabels?: Record<string, string>;
    order?: number;
    addButtonLabel?: string;
    removeButtonLabel?: string;
    itemLabelTemplate?: string;
}

export interface FormFieldSchema {
    type?: string;
    title?: string;
    description?: string;
    enum?: Array<string | number | boolean | null>;
    const?: string | number | boolean | null;
    format?: string;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    minimum?: number;
    maximum?: number;
    minItems?: number;
    maxItems?: number;
    items?: FormFieldSchema;
    properties?: Record<string, FormFieldSchema>;
    required?: string[];
    additionalProperties?: boolean;
    "x-ui"?: FieldUi;
    "x-rules"?: FieldRules;
    [key: string]: unknown;
}

export interface LayoutColSpan {
    sm?: number;
    md?: number;
    lg?: number;
}

export interface LayoutElement {
    kind: "field";
    field: string;
    colSpan?: LayoutColSpan;
}

export interface LayoutPage {
    id: string;
    title: string;
    elements: LayoutElement[];
}

export interface FormDefinitionLayout {
    pages: LayoutPage[];
}

export interface FormDefinitionLogic {
    operators: RuleOperator[];
    combinators: RuleCombinator[];
}

export interface FormDefinitionSubmission {
    unknownFieldPolicy: "reject" | "allow";
    stripHiddenValues: boolean;
}

export interface FormDefinitionMeta {
    schemaVersion: string;
    editorVersion: string;
    rendererVersion: string;
    requiresSignature: boolean;
    layout: FormDefinitionLayout;
    logic: FormDefinitionLogic;
    submission: FormDefinitionSubmission;
}

export interface FormDefinitionV1 {
    $schema: string;
    $id?: string;
    type: "object";
    title?: string;
    description?: string;
    additionalProperties: boolean;
    properties: Record<string, FormFieldSchema>;
    required?: string[];
    "x-form": FormDefinitionMeta;
    [key: string]: unknown;
}

const defaultLayoutPage: LayoutPage = {
    id: "page_main",
    title: "Main",
    elements: [],
};

export function createDefaultFormDefinition(options?: {
    title?: string;
    description?: string;
    requiresSignature?: boolean;
}): FormDefinitionV1 {
    return {
        $schema: FORM_SCHEMA_URI,
        type: "object",
        title: options?.title || "",
        description: options?.description || "",
        additionalProperties: false,
        properties: {},
        required: [],
        "x-form": {
            schemaVersion: FORM_SCHEMA_VERSION,
            editorVersion: "1.x",
            rendererVersion: "1.x",
            requiresSignature: options?.requiresSignature ?? false,
            layout: {
                pages: [structuredClone(defaultLayoutPage)],
            },
            logic: {
                operators: [...FORM_LOGIC_OPERATORS],
                combinators: ["all", "any"],
            },
            submission: {
                unknownFieldPolicy: "reject",
                stripHiddenValues: true,
            },
        },
    };
}

export function createDefaultFieldSchema(fieldType: string): FormFieldSchema {
    if (fieldType === "email") {
        return {
            type: "string",
            title: "Email",
            format: "email",
            "x-ui": {
                widget: "email",
                placeholder: "name@example.com",
            },
        };
    }

    if (fieldType === "boolean") {
        return {
            type: "boolean",
            title: "Checkbox",
            "x-ui": {
                widget: "checkbox",
            },
        };
    }

    if (fieldType === "number") {
        return {
            type: "number",
            title: "Number",
            "x-ui": {
                widget: "number",
            },
        };
    }

    if (fieldType === "select") {
        return {
            type: "string",
            title: "Select",
            enum: ["option_1", "option_2"],
            "x-ui": {
                widget: "select",
                optionLabels: {
                    option_1: "Option 1",
                    option_2: "Option 2",
                },
            },
        };
    }

    if (fieldType === "repeater") {
        return {
            type: "array",
            title: "Repeater",
            minItems: 1,
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    name: {
                        type: "string",
                        title: "Name",
                        minLength: 2,
                        "x-ui": {
                            widget: "text",
                            order: 10,
                        },
                    },
                },
                required: ["name"],
            },
            "x-ui": {
                widget: "repeater",
                addButtonLabel: "Eintrag hinzufügen",
                removeButtonLabel: "Entfernen",
                itemLabelTemplate: "Eintrag {{index}}",
            },
        };
    }

    return {
        type: "string",
        title: "Text",
        "x-ui": {
            widget: "text",
            placeholder: "",
        },
    };
}

function isObject(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

export function isFormDefinitionV1(value: unknown): value is FormDefinitionV1 {
    if (!isObject(value)) return false;
    if (value.$schema !== FORM_SCHEMA_URI) return false;
    if (value.type !== "object") return false;
    if (!isObject(value.properties)) return false;

    const xForm = value["x-form"];
    if (!isObject(xForm)) return false;
    if (typeof xForm.schemaVersion !== "string" || !xForm.schemaVersion.trim()) {
        return false;
    }

    const layout = xForm.layout;
    if (!isObject(layout) || !Array.isArray(layout.pages)) return false;

    return true;
}

export function getUnsupportedSchemaReason(value: unknown): string | null {
    if (!isObject(value)) {
        return "Feld-Definition muss ein JSON-Objekt sein.";
    }

    if (value.$schema !== FORM_SCHEMA_URI) {
        return `Nicht unterstütztes Formularschema: $schema muss \"${FORM_SCHEMA_URI}\" sein.`;
    }

    const xForm = value["x-form"];
    if (!isObject(xForm) || typeof xForm.schemaVersion !== "string") {
        return "Nicht unterstütztes Formularschema: x-form.schemaVersion fehlt.";
    }

    if (value.type !== "object") {
        return "Nicht unterstütztes Formularschema: Der Wurzeltyp muss ein Objekt sein.";
    }

    if (!isObject(value.properties)) {
        return "Nicht unterstütztes Formularschema: properties muss ein Objekt sein.";
    }

    return null;
}

export function toFormDefinitionOrNull(value: unknown): FormDefinitionV1 | null {
    if (!isFormDefinitionV1(value)) {
        return null;
    }
    return value;
}

export function cloneDefinition(definition: FormDefinitionV1): FormDefinitionV1 {
    return JSON.parse(JSON.stringify(definition)) as FormDefinitionV1;
}

function normalizeLayoutElement(value: unknown): LayoutElement | null {
    if (!isObject(value)) return null;
    if (value.kind !== "field") return null;
    if (typeof value.field !== "string" || !value.field.trim()) return null;

    const colSpan = isObject(value.colSpan)
        ? {
              sm:
                  typeof value.colSpan.sm === "number"
                      ? value.colSpan.sm
                      : undefined,
              md:
                  typeof value.colSpan.md === "number"
                      ? value.colSpan.md
                      : undefined,
              lg:
                  typeof value.colSpan.lg === "number"
                      ? value.colSpan.lg
                      : undefined,
          }
        : undefined;

    return {
        kind: "field",
        field: value.field,
        colSpan,
    };
}

function collectPageElements(page: Record<string, unknown>): LayoutElement[] {
    if (Array.isArray(page.elements)) {
        return page.elements
            .map((element) => normalizeLayoutElement(element))
            .filter((element): element is LayoutElement => !!element);
    }

    if (Array.isArray(page.sections)) {
        const flattened: LayoutElement[] = [];
        for (const section of page.sections) {
            if (!isObject(section) || !Array.isArray(section.elements)) continue;

            for (const element of section.elements) {
                const normalized = normalizeLayoutElement(element);
                if (normalized) {
                    flattened.push(normalized);
                }
            }
        }
        return flattened;
    }

    return [];
}

export function normalizeFormDefinitionLayout(
    definition: FormDefinitionV1,
): FormDefinitionV1 {
    const next = cloneDefinition(definition);

    if (!next["x-form"]?.layout || !Array.isArray(next["x-form"].layout.pages)) {
        next["x-form"] = {
            ...(next["x-form"] || {}),
            schemaVersion: next["x-form"]?.schemaVersion || FORM_SCHEMA_VERSION,
            editorVersion: next["x-form"]?.editorVersion || "1.x",
            rendererVersion: next["x-form"]?.rendererVersion || "1.x",
            requiresSignature: !!next["x-form"]?.requiresSignature,
            layout: {
                pages: [structuredClone(defaultLayoutPage)],
            },
            logic: next["x-form"]?.logic || {
                operators: [...FORM_LOGIC_OPERATORS],
                combinators: ["all", "any"],
            },
            submission: next["x-form"]?.submission || {
                unknownFieldPolicy: "reject",
                stripHiddenValues: true,
            },
        };
        return next;
    }

    const normalizedPages: LayoutPage[] = next["x-form"].layout.pages.map(
        (page, index) => {
            const pageObject = (isObject(page) ? page : {}) as Record<string, unknown>;
            const id =
                typeof pageObject.id === "string" && pageObject.id.trim()
                    ? pageObject.id
                    : `page_${index + 1}`;
            const title =
                typeof pageObject.title === "string" && pageObject.title.trim()
                    ? pageObject.title
                    : `Page ${index + 1}`;

            return {
                id,
                title,
                elements: collectPageElements(pageObject),
            };
        },
    );

    next["x-form"].layout.pages =
        normalizedPages.length > 0 ? normalizedPages : [structuredClone(defaultLayoutPage)];

    return next;
}

export function isFieldRequired(definition: FormDefinitionV1, fieldKey: string): boolean {
    return !!definition.required?.includes(fieldKey);
}

export function setFieldRequired(
    definition: FormDefinitionV1,
    fieldKey: string,
    required: boolean,
): FormDefinitionV1 {
    const next = cloneDefinition(definition);
    const current = new Set(next.required || []);
    if (required) {
        current.add(fieldKey);
    } else {
        current.delete(fieldKey);
    }
    next.required = Array.from(current);
    return next;
}
