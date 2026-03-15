<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { auth, hasPermission } from "$lib/stores/auth";
    import Button from "$lib/components/ui/Button.svelte";
    import TextInput from "$lib/components/ui/TextInput.svelte";
    import ErrorAlert from "$lib/components/ui/ErrorAlert.svelte";
    import { extractErrorMessage } from "$lib/utils/error";
    import {
        formsApi,
        type FormSubmissionStatus,
    } from "$lib/api/forms";
    import type { FormResource, FormSubmissionResource } from "$lib/api/types";
    import { ArrowLeft, Send, RefreshCw, Plus, Trash2 } from "lucide-svelte";
    import {
        normalizeFormDefinitionLayout,
        toFormDefinitionOrNull,
        type FormDefinitionV1,
        type FormFieldSchema,
    } from "$lib/forms/schema";
    import {
        getUnsupportedSchemaReason,
    } from "$lib/forms/schema";
    import { validateFormDefinition, validateSubmissionData } from "$lib/forms/validate";
    import { getFieldState, stripHiddenValues } from "$lib/forms/rules";

    const formId = $derived(page.params.id);

    let form = $state<FormResource | null>(null);
    let formSchema = $state<FormDefinitionV1 | null>(null);
    let schemaError = $state("");

    let submissions = $state<FormSubmissionResource[]>([]);
    let loading = $state(true);
    let error = $state("");

    let submitData = $state<Record<string, unknown>>({});
    let submitSignature = $state("");
    let submitLoading = $state(false);
    let submitError = $state("");
    let wizardStepIndex = $state(0);

    const canReadForms = $derived(
        hasPermission($auth.user, "forms:read", $auth.organizationId),
    );
    const canSubmit = $derived(
        hasPermission($auth.user, "form_submissions:create", $auth.organizationId),
    );
    const canReadSubmissions = $derived(
        hasPermission($auth.user, "form_submissions:read:any", $auth.organizationId),
    );
    const canUpdateSubmissions = $derived(
        hasPermission($auth.user, "form_submissions:update:any", $auth.organizationId),
    );

    function statusTagClass(status: string) {
        if (status === "approved") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
        if (status === "rejected") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
        if (status === "reviewed") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
        return "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200";
    }

    function isEmptyValue(value: unknown): boolean {
        if (value === null || value === undefined) return true;
        if (typeof value === "string") return value.trim().length === 0;
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length === 0;
        return false;
    }

    function createDefaultValue(field: FormFieldSchema): unknown {
        if (field.type === "boolean") return false;
        if (field.type === "number" || field.type === "integer") return undefined;
        if (field.type === "array") return [];

        if (field.type === "object") {
            const next: Record<string, unknown> = {};
            for (const [key, schema] of Object.entries(field.properties || {})) {
                next[key] = createDefaultValue(schema);
            }
            return next;
        }

        return "";
    }

    function buildDefaultSubmissionData(schema: FormDefinitionV1): Record<string, unknown> {
        const next: Record<string, unknown> = {};
        for (const [fieldKey, field] of Object.entries(schema.properties)) {
            next[fieldKey] = createDefaultValue(field);
        }
        return next;
    }

    function getFieldWidget(field: FormFieldSchema): string {
        if (field["x-ui"]?.widget) return field["x-ui"].widget;
        if (field.type === "boolean") return "checkbox";
        if (field.type === "array") return "repeater";
        if (field.enum) return "select";
        if (field.format === "email") return "email";
        if (field.type === "number" || field.type === "integer") return "number";
        return "text";
    }

    function getFieldOrder(schema: FormDefinitionV1): string[] {
        const ordered: string[] = [];
        const seen = new Set<string>();

        for (const pageDef of schema["x-form"].layout.pages) {
            for (const element of pageDef.elements) {
                if (
                    element.kind === "field" &&
                    schema.properties[element.field] &&
                    !seen.has(element.field)
                ) {
                    ordered.push(element.field);
                    seen.add(element.field);
                }
            }
        }

        for (const key of Object.keys(schema.properties)) {
            if (!seen.has(key)) {
                ordered.push(key);
            }
        }

        return ordered;
    }

    function getPageFieldOrder(
        schema: FormDefinitionV1,
        pageIndex: number,
    ): string[] {
        const pageDef = schema["x-form"].layout.pages[pageIndex];
        if (!pageDef) return [];

        const ordered: string[] = [];
        const seen = new Set<string>();

        for (const element of pageDef.elements) {
            if (
                element.kind === "field" &&
                schema.properties[element.field] &&
                !seen.has(element.field)
            ) {
                ordered.push(element.field);
                seen.add(element.field);
            }
        }

        return ordered;
    }

    function getWizardTotalSteps(schema: FormDefinitionV1): number {
        return schema["x-form"].layout.pages.length;
    }

    function isWizardEnabled(schema: FormDefinitionV1): boolean {
        return getWizardTotalSteps(schema) > 1;
    }

    function getCurrentWizardPage(schema: FormDefinitionV1) {
        return schema["x-form"].layout.pages[wizardStepIndex] || null;
    }

    function getCurrentRenderPage(schema: FormDefinitionV1) {
        if (isWizardEnabled(schema)) {
            return getCurrentWizardPage(schema);
        }

        return schema["x-form"].layout.pages[0] || null;
    }

    function getFieldColSpan(
        schema: FormDefinitionV1,
        fieldKey: string,
    ): { sm: number; md: number } {
        for (const pageDef of schema["x-form"].layout.pages) {
            const element = pageDef.elements.find(
                (entry) => entry.kind === "field" && entry.field === fieldKey,
            );

            if (element) {
                return {
                    sm: Math.max(1, Math.min(12, element.colSpan?.sm || 12)),
                    md: Math.max(1, Math.min(12, element.colSpan?.md || element.colSpan?.sm || 12)),
                };
            }
        }

        return { sm: 12, md: 12 };
    }

    function setFieldValue(fieldKey: string, value: unknown) {
        submitData = {
            ...submitData,
            [fieldKey]: value,
        };
    }

    function setArrayFieldValue(fieldKey: string, value: unknown[]) {
        submitData = {
            ...submitData,
            [fieldKey]: value,
        };
    }

    function getArrayFieldValue(fieldKey: string): unknown[] {
        const value = submitData[fieldKey];
        return Array.isArray(value) ? value : [];
    }

    function createDefaultRepeaterItem(field: FormFieldSchema): Record<string, unknown> {
        const next: Record<string, unknown> = {};
        const itemSchema = field.items;

        if (itemSchema?.type === "object") {
            for (const [key, schema] of Object.entries(itemSchema.properties || {})) {
                next[key] = createDefaultValue(schema);
            }
        }

        return next;
    }

    function addRepeaterItem(fieldKey: string, field: FormFieldSchema) {
        const current = getArrayFieldValue(fieldKey);
        const nextItem = createDefaultRepeaterItem(field);
        setArrayFieldValue(fieldKey, [...current, nextItem]);
    }

    function removeRepeaterItem(fieldKey: string, index: number) {
        const current = getArrayFieldValue(fieldKey);
        setArrayFieldValue(
            fieldKey,
            current.filter((_, currentIndex) => currentIndex !== index),
        );
    }

    function setRepeaterItemValue(
        fieldKey: string,
        itemIndex: number,
        childKey: string,
        value: unknown,
    ) {
        const current = getArrayFieldValue(fieldKey);
        const next = current.map((entry, index) => {
            if (index !== itemIndex || typeof entry !== "object" || !entry) return entry;
            return {
                ...(entry as Record<string, unknown>),
                [childKey]: value,
            };
        });

        setArrayFieldValue(fieldKey, next);
    }

    function collectRuntimeRequiredErrors(
        schema: FormDefinitionV1,
        data: Record<string, unknown>,
        fieldKeys?: string[],
    ): string[] {
        const errors: string[] = [];
        const keys = fieldKeys || getFieldOrder(schema);

        for (const fieldKey of keys) {
            const field = schema.properties[fieldKey];
            if (!field) continue;

            const state = getFieldState(schema, fieldKey, data);
            if (!state.visible || !state.required) continue;

            if (isEmptyValue(data[fieldKey])) {
                errors.push(`${field.title || fieldKey} ist erforderlich.`);
            }
        }

        return errors;
    }

    function isLastWizardStep(): boolean {
        if (!formSchema) return true;
        const total = formSchema["x-form"].layout.pages.length;
        return wizardStepIndex >= Math.max(0, total - 1);
    }

    function validateWizardStep(stepIndex: number): boolean {
        if (!formSchema) return false;
        const fieldKeys = getPageFieldOrder(formSchema, stepIndex);
        const errors = collectRuntimeRequiredErrors(formSchema, submitData, fieldKeys);
        if (errors.length > 0) {
            submitError = errors.join(" ");
            return false;
        }
        submitError = "";
        return true;
    }

    function goToPreviousStep() {
        if (wizardStepIndex <= 0) return;
        wizardStepIndex -= 1;
        submitError = "";
    }

    function goToNextStep() {
        if (!formSchema) return;
        const total = formSchema["x-form"].layout.pages.length;
        if (wizardStepIndex >= total - 1) return;

        if (!validateWizardStep(wizardStepIndex)) {
            return;
        }

        wizardStepIndex += 1;
    }

    async function loadForm() {
        if (!formId || !canReadForms) {
            loading = false;
            return;
        }

        loading = true;
        error = "";
        schemaError = "";

        try {
            const [formRes, submissionsRes] = await Promise.all([
                formsApi.get(formId),
                canReadSubmissions ? formsApi.listSubmissions(formId) : Promise.resolve(null),
            ]);

            if (!formRes.ok) {
                error = await extractErrorMessage(formRes);
                form = null;
                formSchema = null;
                submissions = [];
                return;
            }

            const formJson = await formRes.json();
            const loadedForm = formJson.data as FormResource;
            form = loadedForm;

            const fields = loadedForm.attributes.fields;
            const normalizedCandidate = toFormDefinitionOrNull(fields);
            const unsupportedReason = getUnsupportedSchemaReason(fields);
            const schemaValidation = validateFormDefinition(fields);

            if (unsupportedReason || !schemaValidation.valid || !normalizedCandidate) {
                formSchema = null;
                wizardStepIndex = 0;
                schemaError =
                    unsupportedReason ||
                    schemaValidation.errors[0] ||
                    "Nicht unterstütztes Formularschema.";
            } else {
                const normalizedFields =
                    normalizeFormDefinitionLayout(normalizedCandidate);
                formSchema = normalizedFields;
                submitData = buildDefaultSubmissionData(normalizedFields);
                submitSignature = "";
                wizardStepIndex = 0;
            }

            if (submissionsRes) {
                if (!submissionsRes.ok) {
                    error = await extractErrorMessage(submissionsRes);
                    submissions = [];
                } else {
                    const submissionsJson = await submissionsRes.json();
                    submissions = submissionsJson.data || [];
                }
            } else {
                submissions = [];
            }
        } catch (e: any) {
            error = await extractErrorMessage(e);
            form = null;
            formSchema = null;
            submissions = [];
        } finally {
            loading = false;
        }
    }

    async function submitFormData(e: Event) {
        e.preventDefault();
        if (!form || !formSchema) return;

        if (isWizardEnabled(formSchema) && !isLastWizardStep()) {
            goToNextStep();
            return;
        }

        submitLoading = true;
        submitError = "";

        try {
            let submissionPayload = JSON.parse(
                JSON.stringify(submitData),
            ) as Record<string, unknown>;

            if (formSchema["x-form"].submission.stripHiddenValues) {
                submissionPayload = stripHiddenValues(formSchema, submissionPayload);
            }

            const runtimeErrors = collectRuntimeRequiredErrors(formSchema, submissionPayload);
            if (runtimeErrors.length > 0) {
                submitError = runtimeErrors.join(" ");
                return;
            }

            const schemaValidation = validateSubmissionData(formSchema, submissionPayload);
            if (!schemaValidation.valid) {
                submitError = schemaValidation.errors.join(" ");
                return;
            }

            const requiresSignature = formSchema["x-form"].requiresSignature;
            const signature = submitSignature.trim();
            if (requiresSignature && !signature) {
                submitError = "Signatur ist erforderlich.";
                return;
            }

            const res = await formsApi.submit(form.id, {
                data: submissionPayload,
                signature: signature || undefined,
            });

            if (!res.ok) {
                submitError = await extractErrorMessage(res);
                return;
            }

            if (formSchema) {
                submitData = buildDefaultSubmissionData(formSchema);
            }
            submitSignature = "";
            await loadForm();
        } catch (e: any) {
            submitError = await extractErrorMessage(e);
        } finally {
            submitLoading = false;
        }
    }

    async function changeSubmissionStatus(
        submissionId: string,
        status: FormSubmissionStatus,
    ) {
        try {
            const res = await formsApi.updateSubmissionStatus(submissionId, status);
            if (!res.ok) {
                error = await extractErrorMessage(res);
                return;
            }
            await loadForm();
        } catch (e: any) {
            error = await extractErrorMessage(e);
        }
    }

    onMount(async () => {
        await loadForm();
    });

    $effect(() => {
        if ($auth.organizationId && formId) {
            void loadForm();
        }
    });

    $effect(() => {
        if (!formSchema) {
            wizardStepIndex = 0;
            return;
        }

        const totalSteps = formSchema["x-form"].layout.pages.length;
        if (totalSteps === 0) {
            wizardStepIndex = 0;
            return;
        }

        if (wizardStepIndex > totalSteps - 1) {
            wizardStepIndex = totalSteps - 1;
        }
    });
</script>

<style>
    .schema-grid {
        display: grid;
        grid-template-columns: repeat(12, minmax(0, 1fr));
        gap: 0.75rem;
    }

    .schema-grid-item {
        grid-column: span var(--sm-span, 12) / span var(--sm-span, 12);
    }

    @media (min-width: 768px) {
        .schema-grid-item {
            grid-column: span var(--md-span, var(--sm-span, 12)) / span var(--md-span, var(--sm-span, 12));
        }
    }
</style>

<div class="space-y-6">
    <div class="flex items-center justify-between gap-3">
        <Button variant="ghost" tone="neutral" onclick={() => goto("/forms")}>
            <ArrowLeft class="h-4 w-4" />
            Zurück
        </Button>

        <Button variant="outline" tone="neutral" onclick={loadForm}>
            <RefreshCw class="h-4 w-4" />
            Aktualisieren
        </Button>
    </div>

    <ErrorAlert error={error} />

    {#if loading}
        <div
            class="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
        >
            Lade Formulardaten...
        </div>
    {:else if !form}
        <div
            class="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
        >
            Formular nicht gefunden.
        </div>
    {:else}
        <section
            class="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800"
        >
            <div class="mb-3 flex items-start justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">
                        {form.attributes.name}
                    </h1>
                </div>
                <span
                    class="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                >
                    {form.attributes.published === false ? "Entwurf" : "Veröffentlicht"}
                </span>
            </div>

            {#if form.attributes.description}
                <p class="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
                    {form.attributes.description}
                </p>
            {/if}

            <div class="mb-4 flex flex-wrap gap-2">
                {#if form.attributes["form-type"]}
                    <span
                        class="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                    >
                        Typ: {form.attributes["form-type"]}
                    </span>
                {/if}
                {#if form.attributes.visibility}
                    <span
                        class="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                    >
                        Sichtbarkeit: {form.attributes.visibility}
                    </span>
                {/if}
            </div>

            {#if schemaError}
                <div
                    class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300"
                >
                    Nicht unterstütztes Formularschema: {schemaError}
                </div>
            {:else if formSchema}
                <details class="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                    <summary class="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        Feld-Definition anzeigen
                    </summary>
                    <pre
                        class="mt-3 overflow-auto rounded-lg bg-zinc-900 p-3 text-xs text-zinc-100"
                    >{JSON.stringify(formSchema, null, 2)}</pre>
                </details>
            {/if}
        </section>

        {#if canSubmit && formSchema}
            <section
                class="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800"
            >
                <h2 class="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                    Formular einreichen
                </h2>

                <form class="space-y-4" onsubmit={submitFormData}>
                    <ErrorAlert error={submitError} />

                    {#if getWizardTotalSteps(formSchema) === 0}
                        <div
                            class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300"
                        >
                            Dieses Formular enthält keine Layout-Seiten.
                        </div>
                    {:else}
                        {@const pages = formSchema["x-form"].layout.pages}
                        {@const currentPage = getCurrentRenderPage(formSchema)}
                        {#if isWizardEnabled(formSchema)}
                            <div
                                class="flex items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400"
                            >
                                <span>Schritt {wizardStepIndex + 1} von {pages.length}</span>
                                <span>{currentPage?.title || currentPage?.id}</span>
                            </div>

                            <div class="flex gap-1">
                                {#each pages as _page, stepIndex}
                                    <div
                                        class={`h-1.5 flex-1 rounded-full ${stepIndex <= wizardStepIndex ? "bg-blue-600 dark:bg-blue-500" : "bg-zinc-200 dark:bg-zinc-700"}`}
                                    ></div>
                                {/each}
                            </div>
                        {/if}

                        {#if currentPage}
                            <section class="space-y-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    {currentPage.title || currentPage.id}
                                </h3>

                                <div class="schema-grid">
                                    {#each currentPage.elements as element}
                                        {#if element.kind === "field" && formSchema.properties[element.field]}
                                            {@const fieldKey = element.field}
                                            {@const field = formSchema.properties[fieldKey]}
                                            {@const state = getFieldState(formSchema, fieldKey, submitData)}
                                            {@const widget = getFieldWidget(field)}
                                            {@const span = getFieldColSpan(formSchema, fieldKey)}

                                            {#if state.visible}
                                                <div
                                                    class="schema-grid-item space-y-1"
                                                    style={`--sm-span:${span.sm}; --md-span:${span.md};`}
                                                >
                                                    <div
                                                        class="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                                                    >
                                                        {field.title || fieldKey}
                                                        {#if state.required}
                                                            <span class="text-red-500">*</span>
                                                        {/if}
                                                    </div>

                                                    {#if widget === "textarea"}
                                                        <textarea
                                                            rows="3"
                                                            aria-label={field.title || fieldKey}
                                                            class="block w-full rounded-lg border-0 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-blue-600 dark:bg-zinc-900/50 dark:text-white dark:ring-zinc-700"
                                                            value={String(submitData[fieldKey] || "")}
                                                            oninput={(e) =>
                                                                setFieldValue(
                                                                    fieldKey,
                                                                    (
                                                                        e.currentTarget as HTMLTextAreaElement
                                                                    ).value,
                                                                )}
                                                        ></textarea>
                                                    {:else if widget === "select" || field.enum}
                                                        <select
                                                            aria-label={field.title || fieldKey}
                                                            class="block w-full rounded-lg border-0 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-blue-600 dark:bg-zinc-900/50 dark:text-white dark:ring-zinc-700"
                                                            value={String(submitData[fieldKey] || "")}
                                                            onchange={(e) =>
                                                                setFieldValue(
                                                                    fieldKey,
                                                                    (
                                                                        e.currentTarget as HTMLSelectElement
                                                                    ).value,
                                                                )}
                                                        >
                                                            <option value="">Bitte wählen</option>
                                                            {#each field.enum || [] as option}
                                                                <option value={String(option)}>
                                                                    {field["x-ui"]?.optionLabels?.[
                                                                        String(option)
                                                                    ] || String(option)}
                                                                </option>
                                                            {/each}
                                                        </select>
                                                    {:else if widget === "checkbox"}
                                                        <label
                                                            class="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                aria-label={field.title || fieldKey}
                                                                checked={Boolean(submitData[fieldKey])}
                                                                onchange={(e) =>
                                                                    setFieldValue(
                                                                        fieldKey,
                                                                        (
                                                                            e.currentTarget as HTMLInputElement
                                                                        ).checked,
                                                                    )}
                                                            />
                                                            {field.description || "Aktivieren"}
                                                        </label>
                                                    {:else if widget === "number" || field.type === "number" || field.type === "integer"}
                                                        <input
                                                            type="number"
                                                            aria-label={field.title || fieldKey}
                                                            class="block w-full rounded-lg border-0 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-blue-600 dark:bg-zinc-900/50 dark:text-white dark:ring-zinc-700"
                                                            value={
                                                                submitData[fieldKey] === undefined
                                                                    ? ""
                                                                    : String(
                                                                          submitData[fieldKey],
                                                                      )
                                                            }
                                                            oninput={(e) => {
                                                                const raw = (
                                                                    e.currentTarget as HTMLInputElement
                                                                ).value;
                                                                setFieldValue(
                                                                    fieldKey,
                                                                    raw === "" ? undefined : Number(raw),
                                                                );
                                                            }}
                                                        />
                                                    {:else if widget === "repeater" && field.type === "array"}
                                                        <div class="space-y-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
                                                            {#if getArrayFieldValue(fieldKey).length === 0}
                                                                <p class="text-xs text-zinc-500 dark:text-zinc-400">
                                                                    Keine Einträge.
                                                                </p>
                                                            {/if}

                                                            {#each getArrayFieldValue(fieldKey) as item, itemIndex}
                                                                <article
                                                                    class="rounded-md border border-zinc-200 p-3 dark:border-zinc-700 space-y-2"
                                                                >
                                                                    <div class="flex items-center justify-between gap-2">
                                                                        <div class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                                                            {field["x-ui"]
                                                                                ?.itemLabelTemplate
                                                                                ?.replace(
                                                                                    "{{index}}",
                                                                                    String(
                                                                                        itemIndex + 1,
                                                                                    ),
                                                                                ) ||
                                                                                `Item ${itemIndex + 1}`}
                                                                        </div>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            tone="danger"
                                                                            size="xs"
                                                                            onclick={() =>
                                                                                removeRepeaterItem(
                                                                                    fieldKey,
                                                                                    itemIndex,
                                                                                )}
                                                                        >
                                                                            <Trash2 class="h-4 w-4" />
                                                                        </Button>
                                                                    </div>

                                                                    {#if field.items?.type === "object"}
                                                                        <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
                                                                            {#each Object.entries(field.items.properties || {}) as [childKey, childSchema]}
                                                                                <div class="space-y-1">
                                                                                    <div
                                                                                        class="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                                                                                    >
                                                                                        {childSchema.title || childKey}
                                                                                    </div>
                                                                                    {#if childSchema.type === "boolean"}
                                                                                        <label
                                                                                            class="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                                                                                        >
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                aria-label={childSchema.title || childKey}
                                                                                                checked={Boolean(
                                                                                                    (
                                                                                                        item as Record<
                                                                                                            string,
                                                                                                            unknown
                                                                                                        >
                                                                                                    )[childKey],
                                                                                                )}
                                                                                                onchange={(e) =>
                                                                                                    setRepeaterItemValue(
                                                                                                        fieldKey,
                                                                                                        itemIndex,
                                                                                                        childKey,
                                                                                                        (
                                                                                                            e.currentTarget as HTMLInputElement
                                                                                                        )
                                                                                                            .checked,
                                                                                                    )}
                                                                                            />
                                                                                            Aktiv
                                                                                        </label>
                                                                                    {:else if childSchema.type === "number" || childSchema.type === "integer"}
                                                                                        <input
                                                                                            type="number"
                                                                                            aria-label={childSchema.title || childKey}
                                                                                            class="block w-full rounded-lg border-0 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-blue-600 dark:bg-zinc-900/50 dark:text-white dark:ring-zinc-700"
                                                                                            value={
                                                                                                (
                                                                                                    item as Record<
                                                                                                        string,
                                                                                                        unknown
                                                                                                    >
                                                                                                )[childKey] === undefined
                                                                                                    ? ""
                                                                                                    : String(
                                                                                                          (
                                                                                                              item as Record<
                                                                                                                  string,
                                                                                                                  unknown
                                                                                                              >
                                                                                                          )[childKey],
                                                                                                      )
                                                                                            }
                                                                                            oninput={(e) => {
                                                                                                const raw = (
                                                                                                    e.currentTarget as HTMLInputElement
                                                                                                ).value;
                                                                                                setRepeaterItemValue(
                                                                                                    fieldKey,
                                                                                                    itemIndex,
                                                                                                    childKey,
                                                                                                    raw === ""
                                                                                                        ? undefined
                                                                                                        : Number(raw),
                                                                                                );
                                                                                            }}
                                                                                        />
                                                                                    {:else}
                                                                                        <input
                                                                                            type="text"
                                                                                            aria-label={childSchema.title || childKey}
                                                                                            class="block w-full rounded-lg border-0 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-blue-600 dark:bg-zinc-900/50 dark:text-white dark:ring-zinc-700"
                                                                                            value={String(
                                                                                                (
                                                                                                    item as Record<
                                                                                                        string,
                                                                                                        unknown
                                                                                                    >
                                                                                                )[childKey] || "",
                                                                                            )}
                                                                                            oninput={(e) =>
                                                                                                setRepeaterItemValue(
                                                                                                    fieldKey,
                                                                                                    itemIndex,
                                                                                                    childKey,
                                                                                                    (
                                                                                                        e.currentTarget as HTMLInputElement
                                                                                                    ).value,
                                                                                                )}
                                                                                        />
                                                                                    {/if}
                                                                                </div>
                                                                            {/each}
                                                                        </div>
                                                                    {/if}
                                                                </article>
                                                            {/each}

                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                tone="neutral"
                                                                size="sm"
                                                                onclick={() => addRepeaterItem(fieldKey, field)}
                                                            >
                                                                <Plus class="h-4 w-4" />
                                                                {field["x-ui"]?.addButtonLabel ||
                                                                    "Eintrag hinzufügen"}
                                                            </Button>
                                                        </div>
                                                    {:else}
                                                        <input
                                                            type={widget === "email" ? "email" : widget === "date" ? "date" : "text"}
                                                            aria-label={field.title || fieldKey}
                                                            class="block w-full rounded-lg border-0 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-blue-600 dark:bg-zinc-900/50 dark:text-white dark:ring-zinc-700"
                                                            placeholder={field["x-ui"]?.placeholder || ""}
                                                            value={String(submitData[fieldKey] || "")}
                                                            oninput={(e) =>
                                                                setFieldValue(
                                                                    fieldKey,
                                                                    (
                                                                        e.currentTarget as HTMLInputElement
                                                                    ).value,
                                                                )}
                                                        />
                                                    {/if}

                                                    {#if field["x-ui"]?.helpText}
                                                        <p class="text-xs text-zinc-500 dark:text-zinc-400">
                                                            {field["x-ui"]?.helpText}
                                                        </p>
                                                    {/if}
                                                </div>
                                            {/if}
                                        {/if}
                                    {/each}
                                </div>
                            </section>
                        {/if}
                    {/if}

                    {#if (!isWizardEnabled(formSchema) || isLastWizardStep()) && formSchema["x-form"].requiresSignature}
                        <TextInput
                            label="Signatur"
                            required
                            bind:value={submitSignature}
                            placeholder="Base64 oder Signaturtext"
                        />
                    {/if}

                    {#if isWizardEnabled(formSchema)}
                        <div class="flex items-center justify-between gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                tone="neutral"
                                onclick={goToPreviousStep}
                                disabled={wizardStepIndex === 0}
                            >
                                Zurück
                            </Button>

                            {#if isLastWizardStep()}
                                <Button
                                    type="submit"
                                    variant="solid"
                                    tone="primary"
                                    loading={submitLoading}
                                    disabled={submitLoading}
                                >
                                    <Send class="h-4 w-4" />
                                    Einreichen
                                </Button>
                            {:else}
                                <Button
                                    type="button"
                                    variant="solid"
                                    tone="primary"
                                    onclick={goToNextStep}
                                >
                                    Weiter
                                </Button>
                            {/if}
                        </div>
                    {:else}
                        <div class="flex justify-end">
                            <Button
                                type="submit"
                                variant="solid"
                                tone="primary"
                                loading={submitLoading}
                                disabled={submitLoading}
                            >
                                <Send class="h-4 w-4" />
                                Einreichen
                            </Button>
                        </div>
                    {/if}
                </form>
            </section>
        {/if}

        <section
            class="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800"
        >
            <h2 class="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Einreichungen
            </h2>

            {#if !canReadSubmissions}
                <p class="text-sm text-zinc-500 dark:text-zinc-400">
                    Keine Berechtigung für Einreichungslisten (`form_submissions:read:any`).
                </p>
            {:else if submissions.length === 0}
                <p class="text-sm text-zinc-500 dark:text-zinc-400">
                    Noch keine Einreichungen vorhanden.
                </p>
            {:else}
                <div class="space-y-3">
                    {#each submissions as submission}
                        <article
                            class="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                        >
                            <div class="mb-2 flex items-center justify-between gap-3">
                                <div class="text-xs text-zinc-500 dark:text-zinc-400">
                                    ID: {submission.id}
                                </div>
                                <span
                                    class={`rounded-md px-2 py-1 text-xs font-semibold ${statusTagClass(submission.attributes.status)}`}
                                >
                                    {submission.attributes.status}
                                </span>
                            </div>

                            <pre
                                class="max-h-60 overflow-auto rounded bg-zinc-900 p-3 text-xs text-zinc-100"
                            >{JSON.stringify(submission.attributes.data ?? {}, null, 2)}</pre>

                            {#if canUpdateSubmissions}
                                <div class="mt-3 flex flex-wrap gap-2">
                                    <Button
                                        variant="outline"
                                        tone="neutral"
                                        size="sm"
                                        onclick={() =>
                                            changeSubmissionStatus(submission.id, "reviewed")}
                                    >
                                        Als geprüft markieren
                                    </Button>
                                    <Button
                                        variant="outline"
                                        tone="success"
                                        size="sm"
                                        onclick={() =>
                                            changeSubmissionStatus(submission.id, "approved")}
                                    >
                                        Genehmigen
                                    </Button>
                                    <Button
                                        variant="outline"
                                        tone="danger"
                                        size="sm"
                                        onclick={() =>
                                            changeSubmissionStatus(submission.id, "rejected")}
                                    >
                                        Ablehnen
                                    </Button>
                                </div>
                            {/if}
                        </article>
                    {/each}
                </div>
            {/if}
        </section>
    {/if}
</div>
