import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import type { ErrorObject, ValidateFunction } from "ajv";
import {
    getUnsupportedSchemaReason,
    type FormDefinitionV1,
} from "./schema";

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    strictSchema: true,
    strictTypes: false,
    allowUnionTypes: true,
});

addFormats(ajv);

const annotationKeywords = ["x-form", "x-ui", "x-rules"];
for (const keyword of annotationKeywords) {
    ajv.addKeyword({
        keyword,
        schemaType: "object",
        errors: false,
    });
}

const validatorCache = new Map<string, ValidateFunction>();

function formatAjvErrors(errors?: ErrorObject[] | null): string[] {
    if (!errors || errors.length === 0) return [];

    return errors.map((error) => {
        const location = error.instancePath || "/";
        const message = error.message || "invalid value";
        return `${location}: ${message}`;
    });
}

function getOrCreateValidator(definition: FormDefinitionV1): ValidateFunction {
    const cacheKey = JSON.stringify(definition);
    const cached = validatorCache.get(cacheKey);
    if (cached) return cached;

    const validator = ajv.compile(definition);
    validatorCache.set(cacheKey, validator);
    return validator;
}

export function validateFormDefinition(definition: unknown): ValidationResult {
    const unsupported = getUnsupportedSchemaReason(definition);
    if (unsupported) {
        return {
            valid: false,
            errors: [unsupported],
        };
    }

    try {
        ajv.compile(definition as FormDefinitionV1);
        return {
            valid: true,
            errors: [],
        };
    } catch (error: any) {
        return {
            valid: false,
            errors: [error?.message || "Schema validation failed."],
        };
    }
}

export function validateSubmissionData(
    definition: FormDefinitionV1,
    value: unknown,
): ValidationResult {
    try {
        const validator = getOrCreateValidator(definition);
        const valid = validator(value);
        return {
            valid: !!valid,
            errors: valid ? [] : formatAjvErrors(validator.errors),
        };
    } catch (error: any) {
        return {
            valid: false,
            errors: [error?.message || "Submission validation failed."],
        };
    }
}
