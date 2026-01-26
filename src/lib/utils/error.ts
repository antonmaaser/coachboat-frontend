
import { AlertCircle } from 'lucide-svelte';

/**
 * Extracts a user-friendly error message from various error sources.
 * Handles JSON:API errors, legacy backend errors, fetch Responses, and standard Error objects.
 */
export async function extractErrorMessage(error: any): Promise<string> {
    if (!error) return 'Ein unbekannter Fehler ist aufgetreten.';

    // 1. Handle Fetch Response objects
    if (error instanceof Response) {
        try {
            const text = await error.text();
            if (!text) {
                return `Fehler: ${error.status} ${error.statusText}`;
            }
            try {
                const json = JSON.parse(text);
                return extractErrorMessage(json); // Recursively handle the parsed JSON
            } catch (e) {
                // If text is not JSON, return it directly if short, or generic
                return text.length < 100 ? text : `Serverfehler (${error.status})`;
            }
        } catch (e) {
            return `Verbindungsfehler (${error.status})`;
        }
    }

    // 2. Handle JSON:API Error Format: { errors: [{ detail: "..." }] }
    if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
        // Return the first error detail
        const firstError = error.errors[0];
        if (firstError.detail) return firstError.detail;
        if (firstError.title) return firstError.title;
        if (firstError.message) return firstError.message; // Sometimes mixed
    }

    // 3. Handle Legacy Backend Format: { errors: { msg: "..." } }
    if (error.errors && !Array.isArray(error.errors)) {
        if (error.errors.msg) return error.errors.msg;
        if (error.errors.detail) return error.errors.detail;
    }

    // 4. Handle Standard Error Objects
    if (error instanceof Error) {
        return error.message;
    }

    // 5. Handle String errors
    if (typeof error === 'string') {
        return error;
    }

    // 6. Handle nested data structure edge cases (e.g. data.errors)
    if (error.data && error.data.errors) {
        return extractErrorMessage(error.data);
    }

    return 'Ein unerwarteter Fehler ist aufgetreten.';
}
