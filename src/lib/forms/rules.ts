import type {
    FormDefinitionV1,
    FormFieldSchema,
    RuleCondition,
    RuleGroup,
} from "./schema";

function isObject(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

function getValueByPath(source: Record<string, unknown>, path: string): unknown {
    if (!path.includes(".")) {
        return source[path];
    }

    return path.split(".").reduce<unknown>((current, segment) => {
        if (!isObject(current)) return undefined;
        return current[segment];
    }, source);
}

function isEmptyValue(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === "string") return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (isObject(value)) return Object.keys(value).length === 0;
    return false;
}

function toNumber(value: unknown): number | null {
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

export function evaluateCondition(
    data: Record<string, unknown>,
    condition: RuleCondition,
): boolean {
    const fieldValue = getValueByPath(data, condition.field);

    switch (condition.op) {
        case "eq":
            return fieldValue === condition.value;
        case "neq":
            return fieldValue !== condition.value;
        case "in":
            return Array.isArray(condition.value)
                ? condition.value.includes(fieldValue as never)
                : false;
        case "notIn":
            return Array.isArray(condition.value)
                ? !condition.value.includes(fieldValue as never)
                : true;
        case "gt": {
            const left = toNumber(fieldValue);
            const right = toNumber(condition.value);
            return left !== null && right !== null ? left > right : false;
        }
        case "gte": {
            const left = toNumber(fieldValue);
            const right = toNumber(condition.value);
            return left !== null && right !== null ? left >= right : false;
        }
        case "lt": {
            const left = toNumber(fieldValue);
            const right = toNumber(condition.value);
            return left !== null && right !== null ? left < right : false;
        }
        case "lte": {
            const left = toNumber(fieldValue);
            const right = toNumber(condition.value);
            return left !== null && right !== null ? left <= right : false;
        }
        case "isEmpty":
            return isEmptyValue(fieldValue);
        case "isNotEmpty":
            return !isEmptyValue(fieldValue);
        default:
            return false;
    }
}

export function evaluateRuleGroup(
    group: RuleGroup | undefined,
    data: Record<string, unknown>,
): boolean {
    if (!group) return true;

    if (Array.isArray(group.all) && group.all.length > 0) {
        return group.all.every((condition) => evaluateCondition(data, condition));
    }

    if (Array.isArray(group.any) && group.any.length > 0) {
        return group.any.some((condition) => evaluateCondition(data, condition));
    }

    return true;
}

export function isFieldVisible(
    fieldSchema: FormFieldSchema,
    data: Record<string, unknown>,
): boolean {
    return evaluateRuleGroup(fieldSchema["x-rules"]?.visibleWhen, data);
}

export function isFieldRuntimeRequired(
    definition: FormDefinitionV1,
    fieldKey: string,
    fieldSchema: FormFieldSchema,
    data: Record<string, unknown>,
): boolean {
    const baseRequired = !!definition.required?.includes(fieldKey);
    const conditionalRequired = evaluateRuleGroup(
        fieldSchema["x-rules"]?.requiredWhen,
        data,
    );

    if (fieldSchema["x-rules"]?.requiredWhen) {
        return baseRequired || conditionalRequired;
    }

    return baseRequired;
}

export function getFieldState(
    definition: FormDefinitionV1,
    fieldKey: string,
    data: Record<string, unknown>,
): { visible: boolean; required: boolean } {
    const fieldSchema = definition.properties[fieldKey];
    if (!fieldSchema) {
        return { visible: false, required: false };
    }

    const visible = isFieldVisible(fieldSchema, data);
    const required = visible
        ? isFieldRuntimeRequired(definition, fieldKey, fieldSchema, data)
        : false;

    return { visible, required };
}

export function stripHiddenValues(
    definition: FormDefinitionV1,
    data: Record<string, unknown>,
): Record<string, unknown> {
    const next = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;

    for (const key of Object.keys(definition.properties)) {
        const state = getFieldState(definition, key, next);
        if (!state.visible) {
            delete next[key];
        }
    }

    return next;
}
