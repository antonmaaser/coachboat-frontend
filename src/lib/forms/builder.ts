import type {
    FormDefinitionV1,
    FormFieldSchema,
    LayoutElement,
    LayoutPage,
    RuleCondition,
    RuleGroup,
} from "./schema";
import { normalizeFormDefinitionLayout } from "./schema";

function sanitizeIdentifier(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

const DRAFT_FIELD_KEY_PREFIX = "__draft_field_";

export function isDraftFieldKey(fieldKey: string): boolean {
    return fieldKey.startsWith(DRAFT_FIELD_KEY_PREFIX);
}

export function createDraftFieldKey(definition: FormDefinitionV1): string {
    const next = normalizeFormDefinitionLayout(definition);

    let suffix = Object.keys(next.properties).length + 1;
    let candidate = `${DRAFT_FIELD_KEY_PREFIX}${suffix}`;
    while (next.properties[candidate]) {
        suffix += 1;
        candidate = `${DRAFT_FIELD_KEY_PREFIX}${suffix}`;
    }

    return candidate;
}

function createFieldKeyFromLabel(label: string, taken: Set<string>): string {
    const base = sanitizeIdentifier(label) || "field";
    let candidate = base;
    let suffix = 2;

    while (taken.has(candidate)) {
        candidate = `${base}_${suffix}`;
        suffix += 1;
    }

    return candidate;
}

function remapRuleGroupReferences(
    group: RuleGroup | undefined,
    renameMap: Map<string, string>,
): RuleGroup | undefined {
    if (!group) return undefined;

    let changed = false;
    const next: RuleGroup = {};

    if (Array.isArray(group.all)) {
        next.all = group.all.map((condition: RuleCondition) => {
            const mapped = renameMap.get(condition.field);
            if (!mapped) return condition;
            changed = true;
            return {
                ...condition,
                field: mapped,
            };
        });
    }

    if (Array.isArray(group.any)) {
        next.any = group.any.map((condition: RuleCondition) => {
            const mapped = renameMap.get(condition.field);
            if (!mapped) return condition;
            changed = true;
            return {
                ...condition,
                field: mapped,
            };
        });
    }

    return changed ? next : group;
}

export function finalizeDraftFieldKeys(definition: FormDefinitionV1): FormDefinitionV1 {
    const next = normalizeFormDefinitionLayout(definition);
    const fieldKeys = Object.keys(next.properties);

    const taken = new Set(fieldKeys.filter((key) => !isDraftFieldKey(key)));
    const renameMap = new Map<string, string>();

    for (const fieldKey of fieldKeys) {
        if (!isDraftFieldKey(fieldKey)) continue;

        const field = next.properties[fieldKey];
        const label = typeof field.title === "string" ? field.title.trim() : "";
        const generatedKey = createFieldKeyFromLabel(label, taken);

        taken.add(generatedKey);
        renameMap.set(fieldKey, generatedKey);
    }

    if (renameMap.size === 0) {
        return next;
    }

    const reordered: Record<string, FormFieldSchema> = {};
    for (const fieldKey of fieldKeys) {
        const targetFieldKey = renameMap.get(fieldKey) || fieldKey;
        reordered[targetFieldKey] = next.properties[fieldKey];
    }
    next.properties = reordered;

    next.required = (next.required || []).map(
        (fieldKey) => renameMap.get(fieldKey) || fieldKey,
    );

    for (const page of next["x-form"].layout.pages) {
        for (const element of page.elements) {
            if (element.kind !== "field") continue;
            element.field = renameMap.get(element.field) || element.field;
        }
    }

    for (const fieldKey of Object.keys(next.properties)) {
        const field = next.properties[fieldKey];
        const rules = field["x-rules"];
        if (!rules) continue;

        const visibleWhen = remapRuleGroupReferences(rules.visibleWhen, renameMap);
        const requiredWhen = remapRuleGroupReferences(rules.requiredWhen, renameMap);

        if (visibleWhen) {
            rules.visibleWhen = visibleWhen;
        } else {
            delete rules.visibleWhen;
        }

        if (requiredWhen) {
            rules.requiredWhen = requiredWhen;
        } else {
            delete rules.requiredWhen;
        }

        if (!rules.visibleWhen && !rules.requiredWhen) {
            delete field["x-rules"];
        }
    }

    return next;
}

function findPage(definition: FormDefinitionV1, pageId?: string): LayoutPage {
    const pages = definition["x-form"].layout.pages;
    return pages.find((entry) => entry.id === pageId) || pages[0];
}

function removeRuleReference(group: RuleGroup | undefined, fieldKey: string): RuleGroup | undefined {
    if (!group) return undefined;

    const next: RuleGroup = {};
    if (Array.isArray(group.all)) {
        next.all = group.all.filter((condition: RuleCondition) => condition.field !== fieldKey);
    }
    if (Array.isArray(group.any)) {
        next.any = group.any.filter((condition: RuleCondition) => condition.field !== fieldKey);
    }

    if ((!next.all || next.all.length === 0) && (!next.any || next.any.length === 0)) {
        return undefined;
    }

    return next;
}

export function listFieldOrder(definition: FormDefinitionV1): string[] {
    const normalized = normalizeFormDefinitionLayout(definition);
    const ordered: string[] = [];
    const known = new Set<string>();

    for (const page of normalized["x-form"].layout.pages) {
        for (const element of page.elements) {
            if (element.kind === "field" && !known.has(element.field)) {
                ordered.push(element.field);
                known.add(element.field);
            }
        }
    }

    for (const key of Object.keys(normalized.properties)) {
        if (!known.has(key)) {
            ordered.push(key);
        }
    }

    return ordered;
}

export function addPage(definition: FormDefinitionV1, title: string): FormDefinitionV1 {
    const next = normalizeFormDefinitionLayout(definition);

    const id = sanitizeIdentifier(title) || `page_${next["x-form"].layout.pages.length + 1}`;
    const uniqueId =
        next["x-form"].layout.pages.find((entry) => entry.id === id)
            ? `${id}_${Date.now()}`
            : id;

    next["x-form"].layout.pages.push({
        id: uniqueId,
        title: title.trim() || "Page",
        elements: [],
    });

    return next;
}

export function removePage(definition: FormDefinitionV1, pageId: string): FormDefinitionV1 {
    const next = normalizeFormDefinitionLayout(definition);

    if (next["x-form"].layout.pages.length <= 1) {
        return next;
    }

    const index = next["x-form"].layout.pages.findIndex((entry) => entry.id === pageId);
    if (index === -1) return next;

    const [removed] = next["x-form"].layout.pages.splice(index, 1);
    const fallback = next["x-form"].layout.pages[0];
    fallback.elements.push(...removed.elements);

    return next;
}

export function addField(
    definition: FormDefinitionV1,
    fieldKey: string,
    fieldSchema: FormFieldSchema,
    options?: {
        pageId?: string;
        required?: boolean;
        colSpan?: { sm?: number; md?: number; lg?: number };
    },
): FormDefinitionV1 {
    const next = normalizeFormDefinitionLayout(definition);

    if (next.properties[fieldKey]) {
        return next;
    }

    next.properties[fieldKey] = fieldSchema;

    if (options?.required) {
        const required = new Set(next.required || []);
        required.add(fieldKey);
        next.required = Array.from(required);
    }

    const page = findPage(next, options?.pageId);
    page.elements.push({
        kind: "field",
        field: fieldKey,
        colSpan: options?.colSpan || { sm: 12, md: 12 },
    });

    return next;
}

export function removeField(definition: FormDefinitionV1, fieldKey: string): FormDefinitionV1 {
    const next = normalizeFormDefinitionLayout(definition);

    delete next.properties[fieldKey];
    next.required = (next.required || []).filter((entry) => entry !== fieldKey);

    for (const page of next["x-form"].layout.pages) {
        page.elements = page.elements.filter(
            (element) => !(element.kind === "field" && element.field === fieldKey),
        );
    }

    for (const key of Object.keys(next.properties)) {
        const schema = next.properties[key];
        if (!schema["x-rules"]) continue;

        schema["x-rules"].visibleWhen = removeRuleReference(
            schema["x-rules"].visibleWhen,
            fieldKey,
        );
        schema["x-rules"].requiredWhen = removeRuleReference(
            schema["x-rules"].requiredWhen,
            fieldKey,
        );

        if (!schema["x-rules"].visibleWhen && !schema["x-rules"].requiredWhen) {
            delete schema["x-rules"];
        }
    }

    return next;
}

export function moveField(
    definition: FormDefinitionV1,
    fieldKey: string,
    direction: "up" | "down",
): FormDefinitionV1 {
    const next = normalizeFormDefinitionLayout(definition);

    for (const page of next["x-form"].layout.pages) {
        const index = page.elements.findIndex(
            (entry) => entry.kind === "field" && entry.field === fieldKey,
        );
        if (index === -1) continue;

        const target = direction === "up" ? index - 1 : index + 1;
        if (target < 0 || target >= page.elements.length) {
            return next;
        }

        const current = page.elements[index];
        page.elements[index] = page.elements[target];
        page.elements[target] = current;
        return next;
    }

    return next;
}

function stripFieldPlacement(definition: FormDefinitionV1, fieldKey: string): void {
    for (const page of definition["x-form"].layout.pages) {
        page.elements = page.elements.filter(
            (entry) => !(entry.kind === "field" && entry.field === fieldKey),
        );
    }
}

export function setFieldPlacement(
    definition: FormDefinitionV1,
    fieldKey: string,
    pageId: string,
): FormDefinitionV1 {
    const next = normalizeFormDefinitionLayout(definition);

    let placement: LayoutElement | null = null;
    for (const page of next["x-form"].layout.pages) {
        const existing = page.elements.find(
            (entry) => entry.kind === "field" && entry.field === fieldKey,
        );
        if (existing) {
            placement = { ...existing };
            break;
        }
    }

    stripFieldPlacement(next, fieldKey);

    const page = findPage(next, pageId);
    page.elements.push(
        placement || {
            kind: "field",
            field: fieldKey,
            colSpan: { sm: 12, md: 12 },
        },
    );

    return next;
}

export function setFieldColSpan(
    definition: FormDefinitionV1,
    fieldKey: string,
    colSpan: { sm?: number; md?: number; lg?: number },
): FormDefinitionV1 {
    const next = normalizeFormDefinitionLayout(definition);

    for (const page of next["x-form"].layout.pages) {
        const element = page.elements.find(
            (entry) => entry.kind === "field" && entry.field === fieldKey,
        );
        if (element) {
            element.colSpan = colSpan;
            return next;
        }
    }

    return next;
}

export function syncMeta(
    definition: FormDefinitionV1,
    values: {
        title: string;
        description: string;
        requiresSignature: boolean;
    },
): FormDefinitionV1 {
    const next = normalizeFormDefinitionLayout(definition);
    next.title = values.title;
    next.description = values.description;
    next["x-form"].requiresSignature = values.requiresSignature;
    return next;
}

export function getFieldPlacement(
    definition: FormDefinitionV1,
    fieldKey: string,
): { pageId: string; colSpan: { sm?: number; md?: number; lg?: number } } | null {
    const next = normalizeFormDefinitionLayout(definition);

    for (const page of next["x-form"].layout.pages) {
        const element = page.elements.find(
            (entry) => entry.kind === "field" && entry.field === fieldKey,
        );
        if (element) {
            return {
                pageId: page.id,
                colSpan: element.colSpan || { sm: 12, md: 12 },
            };
        }
    }

    return null;
}
