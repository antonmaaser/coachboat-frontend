<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { auth, hasPermission } from "$lib/stores/auth";
    import Modal from "$lib/components/Modal.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Toggle from "$lib/components/ui/Toggle.svelte";
    import TextInput from "$lib/components/ui/TextInput.svelte";
    import SearchableSelect from "$lib/components/ui/SearchableSelect.svelte";
    import ErrorAlert from "$lib/components/ui/ErrorAlert.svelte";
    import { extractErrorMessage } from "$lib/utils/error";
    import { formsApi, type FormUpsertAttributes } from "$lib/api/forms";
    import type { FormResource, FormType, FormVisibility } from "$lib/api/types";
    import {
        ClipboardList,
        Plus,
        Pencil,
        Trash2,
        ExternalLink,
        ArrowUp,
        ArrowDown,
        PlusCircle,
        ChevronDown,
        MoreVertical,
    } from "lucide-svelte";
    import {
        createDefaultFormDefinition,
        createDefaultFieldSchema,
        type FormDefinitionV1,
        type FormFieldSchema,
        type RuleCondition,
        type RuleOperator,
        cloneDefinition,
        normalizeFormDefinitionLayout,
        setFieldRequired,
        toFormDefinitionOrNull,
    } from "$lib/forms/schema";
    import { validateFormDefinition } from "$lib/forms/validate";
    import {
        addField,
        addPage,
        createDraftFieldKey,
        finalizeDraftFieldKeys,
        getFieldPlacement,
        isDraftFieldKey,
        listFieldOrder,
        moveField,
        removeField,
        removePage,
        setFieldPlacement,
        syncMeta,
    } from "$lib/forms/builder";

    type FieldKind =
        | "text"
        | "textarea"
        | "email"
        | "number"
        | "boolean"
        | "select"
        | "repeater";
    type RuleMode = "visibleWhen" | "requiredWhen";
    type OptionalNumericConstraint =
        | "minLength"
        | "maxLength"
        | "minimum"
        | "maximum"
        | "minItems"
        | "maxItems";

    const fieldKindOptions: Array<{ value: FieldKind; label: string }> = [
        { value: "text", label: "Text" },
        { value: "textarea", label: "Textbereich" },
        { value: "email", label: "E-Mail" },
        { value: "number", label: "Zahl" },
        { value: "boolean", label: "Checkbox" },
        { value: "select", label: "Auswahl" },
        { value: "repeater", label: "Wiederholfeld" },
    ];

    const formTypeOptions: Array<{ value: FormType; label: string }> = [
        { value: "general", label: "Allgemein" },
        { value: "membership", label: "Mitgliedschaft" },
        { value: "waiver", label: "Haftungsausschluss" },
        { value: "event_signup", label: "Event-Anmeldung" },
    ];

    const visibilityOptions: Array<{ value: FormVisibility; label: string }> = [
        { value: "all", label: "Alle" },
        { value: "admin_moderator", label: "Nur Admin/Moderation" },
    ];

    const operatorOptions: RuleOperator[] = [
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
    ];

    let forms = $state<FormResource[]>([]);
    let loading = $state(true);
    let error = $state("");

    let showFormModal = $state(false);
    let editingForm = $state<FormResource | null>(null);
    let formLoading = $state(false);
    let formError = $state("");
    let editorStepIndex = $state(0);

    let formName = $state("");
    let formDescription = $state("");
    let formType = $state<FormType>("general");
    let formVisibility = $state<FormVisibility>("all");
    let formRequiresSignature = $state(false);
    let formPublished = $state(true);

    let formSchema = $state<FormDefinitionV1>(createDefaultFormDefinition());

    let newPageTitle = $state("");

    let showAddFieldTypeMenu = $state(false);
    let activeFieldOptionsMenu = $state<string | null>(null);

    let repeaterDrafts = $state<
        Record<
            string,
            {
                key: string;
                title: string;
                type: "string" | "number" | "boolean";
                required: boolean;
            }
        >
    >({});

    const canReadForms = $derived(
        hasPermission($auth.user, "forms:read", $auth.organizationId),
    );
    const canCreateForms = $derived(
        hasPermission($auth.user, "forms:create", $auth.organizationId),
    );
    const canUpdateForms = $derived(
        hasPermission($auth.user, "forms:update:any", $auth.organizationId),
    );
    const canDeleteForms = $derived(
        hasPermission($auth.user, "forms:delete:any", $auth.organizationId),
    );

    async function loadForms() {
        if (!canReadForms) {
            loading = false;
            return;
        }

        loading = true;
        error = "";
        try {
            const res = await formsApi.list();
            if (!res.ok) {
                error = await extractErrorMessage(res);
                forms = [];
                return;
            }
            const json = await res.json();
            forms = json.data || [];
        } catch (e: any) {
            error = await extractErrorMessage(e);
            forms = [];
        } finally {
            loading = false;
        }
    }

    function sanitizeFieldKey(value: string): string {
        return value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]+/g, "_")
            .replace(/^_+|_+$/g, "");
    }

    function getEditorTotalSteps() {
        return formSchema["x-form"].layout.pages.length;
    }

    function getCurrentEditorPage() {
        return formSchema["x-form"].layout.pages[editorStepIndex] || null;
    }

    function goToPreviousEditorStep() {
        if (editorStepIndex <= 0) return;
        editorStepIndex -= 1;
        activeFieldOptionsMenu = null;
    }

    function goToNextEditorStep() {
        const total = getEditorTotalSteps();
        if (editorStepIndex >= total - 1) return;
        editorStepIndex += 1;
        activeFieldOptionsMenu = null;
    }

    function getFieldOrderForCurrentEditorPage() {
        const page = getCurrentEditorPage();
        if (!page) return [];

        const keys = new Set<string>();
        for (const element of page.elements) {
            if (element.kind === "field") {
                keys.add(element.field);
            }
        }

        return getFieldOrder().filter((key) => keys.has(key));
    }

    function resetBuilderDrafts() {
        editorStepIndex = 0;
        newPageTitle = "";

        showAddFieldTypeMenu = false;
        activeFieldOptionsMenu = null;

        repeaterDrafts = {};
    }

    function resetFormState() {
        editingForm = null;
        formName = "";
        formDescription = "";
        formType = "general";
        formVisibility = "all";
        formRequiresSignature = false;
        formPublished = true;
        formError = "";
        formLoading = false;
        formSchema = createDefaultFormDefinition({
            requiresSignature: false,
        });

        resetBuilderDrafts();
    }

    function applyMetaToSchema() {
        formSchema = syncMeta(formSchema, {
            title: formName.trim(),
            description: formDescription.trim(),
            requiresSignature: formRequiresSignature,
        });
    }

    function openCreateModal() {
        resetFormState();
        showFormModal = true;
    }

    function openEditModal(form: FormResource) {
        const candidate = form.attributes.fields;
        const schema = toFormDefinitionOrNull(candidate);
        const validation = validateFormDefinition(candidate);

        if (!validation.valid || !schema) {
            error =
                "Nicht unterstütztes Formularschema für dieses Formular. " +
                (validation.errors[0] ||
                    "Erwartet wird ein JSON-Schema-v1-Dokument.");
            return;
        }

        editingForm = form;
        formName = form.attributes.name || "";
        formDescription = form.attributes.description || "";
        formType = form.attributes["form-type"] || "general";
        formVisibility = form.attributes.visibility || "all";
        formRequiresSignature =
            form.attributes["requires-signature"] ??
            !!schema["x-form"]?.requiresSignature;
        formPublished = form.attributes.published !== false;
        formSchema = syncMeta(schema, {
            title: formName,
            description: formDescription,
            requiresSignature: formRequiresSignature,
        });
        formSchema = normalizeFormDefinitionLayout(formSchema);
        formError = "";
        formLoading = false;
        resetBuilderDrafts();
        showFormModal = true;
    }

    function getFieldKind(schema: FormFieldSchema): FieldKind {
        if (schema.type === "array") return "repeater";
        if (schema.enum) return "select";
        if (schema.type === "boolean") return "boolean";
        if (schema.type === "number" || schema.type === "integer") return "number";
        if (schema.format === "email" || schema["x-ui"]?.widget === "email") return "email";
        if (schema["x-ui"]?.widget === "textarea") return "textarea";
        return "text";
    }

    function getFieldOrder() {
        return listFieldOrder(formSchema);
    }

    function updateField(fieldKey: string, updater: (field: FormFieldSchema) => void) {
        const next = cloneDefinition(formSchema);
        const field = next.properties[fieldKey];
        if (!field) return;

        updater(field);
        formSchema = next;
    }

    function updatePageTitle(pageId: string, title: string) {
        const next = cloneDefinition(formSchema);
        const page = next["x-form"].layout.pages.find((entry) => entry.id === pageId);
        if (!page) return;

        page.title = title;
        formSchema = next;
    }

    function handleAddPage() {
        if (!newPageTitle.trim()) return;

        formSchema = addPage(formSchema, newPageTitle);
        newPageTitle = "";
        editorStepIndex = Math.max(0, getEditorTotalSteps() - 1);
        activeFieldOptionsMenu = null;
    }

    function handleRemovePage(pageId: string) {
        const removedIndex = formSchema["x-form"].layout.pages.findIndex(
            (entry) => entry.id === pageId,
        );
        formSchema = removePage(formSchema, pageId);
        const total = getEditorTotalSteps();
        if (total === 0) {
            editorStepIndex = 0;
        } else if (removedIndex <= editorStepIndex) {
            editorStepIndex = Math.max(0, Math.min(editorStepIndex - 1, total - 1));
        }
        activeFieldOptionsMenu = null;
    }

    function setFieldKind(fieldKey: string, kind: FieldKind) {
        updateField(fieldKey, (field) => {
            const title = field.title;
            const description = field.description;
            const rules = field["x-rules"];
            const ui = field["x-ui"];

            const replacement = createDefaultFieldSchema(kind);
            replacement.title = title || replacement.title;
            replacement.description = description || replacement.description;
            if (rules) {
                replacement["x-rules"] = rules;
            }
            if (ui?.helpText) {
                replacement["x-ui"] = {
                    ...(replacement["x-ui"] || {}),
                    helpText: ui.helpText,
                };
            }

            Object.keys(field).forEach((key) => {
                delete field[key];
            });
            Object.assign(field, replacement);
        });
    }

    function getDefaultFieldPageId(): string | null {
        const pages = formSchema["x-form"].layout.pages;
        if (pages.length === 0) return null;
        return pages[pages.length - 1].id;
    }

    function addFieldToEnd(kind: FieldKind) {
        const pageId = getDefaultFieldPageId();
        if (!pageId) {
            formError = "Bitte zuerst mindestens eine Seite anlegen.";
            showAddFieldTypeMenu = false;
            return;
        }

        const fieldKey = createDraftFieldKey(formSchema);
        const schema = createDefaultFieldSchema(kind);
        formSchema = addField(formSchema, fieldKey, schema, {
            pageId,
            required: false,
        });

        formError = "";
        showAddFieldTypeMenu = false;
        editorStepIndex = Math.max(0, formSchema["x-form"].layout.pages.length - 1);
        activeFieldOptionsMenu = fieldKey;
    }

    function handleRemoveField(fieldKey: string) {
        formSchema = removeField(formSchema, fieldKey);
        if (activeFieldOptionsMenu === fieldKey) {
            activeFieldOptionsMenu = null;
        }
    }

    function toggleFieldRequired(fieldKey: string, required: boolean) {
        formSchema = setFieldRequired(formSchema, fieldKey, required);
    }

    function toggleFieldOptionsMenu(fieldKey: string) {
        activeFieldOptionsMenu =
            activeFieldOptionsMenu === fieldKey ? null : fieldKey;
    }

    function relocateFieldToPage(fieldKey: string, pageId: string) {
        formSchema = setFieldPlacement(formSchema, fieldKey, pageId);
        activeFieldOptionsMenu = null;
    }

    function updateEnumFromCsv(fieldKey: string, csv: string) {
        updateField(fieldKey, (field) => {
            const values = csv
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean);

            field.enum = values;
            field.type = "string";
            field["x-ui"] = {
                ...(field["x-ui"] || {}),
                widget: "select",
                optionLabels: Object.fromEntries(values.map((value) => [value, value])),
            };
        });
    }

    function getConstraintDefault(
        field: FormFieldSchema,
        constraint: OptionalNumericConstraint,
    ): number {
        if (constraint === "minLength") return 1;
        if (constraint === "maxLength") return Math.max(field.minLength ?? 1, 1);
        if (constraint === "minimum") return 0;
        if (constraint === "maximum") return field.minimum ?? 0;
        if (constraint === "minItems") return 1;
        if (constraint === "maxItems") return Math.max(field.minItems ?? 1, 1);
        return 1;
    }

    function toggleFieldConstraint(
        fieldKey: string,
        constraint: OptionalNumericConstraint,
        enabled: boolean,
    ) {
        updateField(fieldKey, (field) => {
            if (!enabled) {
                field[constraint] = undefined;
                return;
            }

            if (typeof field[constraint] !== "number") {
                field[constraint] = getConstraintDefault(field, constraint);
            }
        });
    }

    function setFieldConstraintValue(
        fieldKey: string,
        constraint: OptionalNumericConstraint,
        raw: string,
    ) {
        updateField(fieldKey, (field) => {
            if (!raw.trim()) {
                field[constraint] = undefined;
                return;
            }

            const value = Number(raw);
            if (!Number.isFinite(value)) {
                return;
            }

            field[constraint] = value;
        });
    }

    function getRuleCondition(fieldKey: string, mode: RuleMode): RuleCondition | null {
        const field = formSchema.properties[fieldKey];
        const rule = field?.["x-rules"]?.[mode];
        if (!rule) return null;

        if (Array.isArray(rule.all) && rule.all.length > 0) {
            return rule.all[0];
        }
        if (Array.isArray(rule.any) && rule.any.length > 0) {
            return rule.any[0];
        }

        return null;
    }

    function setRuleEnabled(fieldKey: string, mode: RuleMode, enabled: boolean) {
        updateField(fieldKey, (field) => {
            if (!enabled) {
                if (field["x-rules"]) {
                    delete field["x-rules"][mode];
                    if (
                        !field["x-rules"].visibleWhen &&
                        !field["x-rules"].requiredWhen
                    ) {
                        delete field["x-rules"];
                    }
                }
                return;
            }

            const targetField = Object.keys(formSchema.properties).find(
                (key) => key !== fieldKey,
            );
            if (!targetField) return;

            field["x-rules"] = {
                ...(field["x-rules"] || {}),
                [mode]: {
                    all: [
                        {
                            field: targetField,
                            op: "eq",
                            value: true,
                        },
                    ],
                },
            };
        });
    }

    function updateRuleCondition(
        fieldKey: string,
        mode: RuleMode,
        patch: Partial<RuleCondition>,
    ) {
        updateField(fieldKey, (field) => {
            const current = getRuleCondition(fieldKey, mode) || {
                field: "",
                op: "eq",
                value: true,
            };

            const nextCondition: RuleCondition = {
                ...current,
                ...patch,
            };

            field["x-rules"] = {
                ...(field["x-rules"] || {}),
                [mode]: {
                    all: [nextCondition],
                },
            };
        });
    }

    function readRuleValue(raw: string): unknown {
        const trimmed = raw.trim();
        if (!trimmed) return "";

        try {
            return JSON.parse(trimmed);
        } catch {
            return trimmed;
        }
    }

    function getRepeaterDraft(fieldKey: string) {
        return (
            repeaterDrafts[fieldKey] || {
                key: "",
                title: "",
                type: "string",
                required: false,
            }
        );
    }

    function setRepeaterDraft(
        fieldKey: string,
        patch: Partial<{
            key: string;
            title: string;
            type: "string" | "number" | "boolean";
            required: boolean;
        }>,
    ) {
        const current = getRepeaterDraft(fieldKey);
        repeaterDrafts = {
            ...repeaterDrafts,
            [fieldKey]: {
                ...current,
                ...patch,
            },
        };
    }

    function addRepeaterItemField(fieldKey: string) {
        const draft = getRepeaterDraft(fieldKey);
        const childKey = sanitizeFieldKey(draft.key);
        if (!childKey) {
            formError = "Eintragsschlüssel ist erforderlich.";
            return;
        }

        updateField(fieldKey, (field) => {
            if (field.type !== "array") return;

            field.items = field.items || {
                type: "object",
                additionalProperties: false,
                properties: {},
                required: [],
            };

            if (field.items.type !== "object") return;
            field.items.properties = field.items.properties || {};
            field.items.required = field.items.required || [];

            if (field.items.properties[childKey]) return;

            const childSchema: FormFieldSchema = {
                type: draft.type,
                title: draft.title.trim() || childKey,
                "x-ui": {
                    widget:
                        draft.type === "boolean"
                            ? "checkbox"
                            : draft.type === "number"
                              ? "number"
                              : "text",
                },
            };

            field.items.properties[childKey] = childSchema;
            if (draft.required) {
                const required = new Set(field.items.required || []);
                required.add(childKey);
                field.items.required = Array.from(required);
            }
        });

        setRepeaterDraft(fieldKey, {
            key: "",
            title: "",
            type: "string",
            required: false,
        });
    }

    function removeRepeaterItemField(fieldKey: string, childKey: string) {
        updateField(fieldKey, (field) => {
            if (field.type !== "array" || !field.items || field.items.type !== "object") return;

            if (!field.items.properties) return;
            delete field.items.properties[childKey];
            field.items.required = (field.items.required || []).filter(
                (entry) => entry !== childKey,
            );
        });
    }

    function updateRepeaterItemField(
        fieldKey: string,
        childKey: string,
        updater: (child: FormFieldSchema, required: Set<string>) => void,
    ) {
        updateField(fieldKey, (field) => {
            if (field.type !== "array" || !field.items || field.items.type !== "object") return;
            if (!field.items.properties?.[childKey]) return;

            const required = new Set(field.items.required || []);
            updater(field.items.properties[childKey], required);
            field.items.required = Array.from(required);
        });
    }

    async function submitForm(e: Event) {
        e.preventDefault();
        formLoading = true;
        formError = "";

        try {
            applyMetaToSchema();
            const finalizedSchema = finalizeDraftFieldKeys(formSchema);
            formSchema = finalizedSchema;

            const schemaValidation = validateFormDefinition(finalizedSchema);
            if (!schemaValidation.valid) {
                formError = schemaValidation.errors.join(" ");
                return;
            }

            const description = formDescription.trim();
            const attributes: FormUpsertAttributes = {
                name: formName.trim(),
                fields: finalizedSchema,
                ...(description ? { description } : {}),
                "form-type": formType,
                "requires-signature": formRequiresSignature,
                published: formPublished,
                visibility: formVisibility,
            };

            let res: Response;
            if (editingForm) {
                res = await formsApi.update(editingForm.id, attributes);
            } else {
                res = await formsApi.create(attributes);
            }

            if (!res.ok) {
                formError = await extractErrorMessage(res);
                return;
            }

            showFormModal = false;
            await loadForms();
        } catch (e: any) {
            formError = await extractErrorMessage(e);
        } finally {
            formLoading = false;
        }
    }

    async function removeFormEntry(form: FormResource) {
        const confirmed = confirm(`Formular \"${form.attributes.name}\" wirklich löschen?`);
        if (!confirmed) return;

        try {
            const res = await formsApi.delete(form.id);
            if (!res.ok) {
                error = await extractErrorMessage(res);
                return;
            }
            await loadForms();
        } catch (e: any) {
            error = await extractErrorMessage(e);
        }
    }

    function openDetail(form: FormResource) {
        goto(`/forms/${form.id}`);
    }

    onMount(async () => {
        await loadForms();
    });

    $effect(() => {
        if ($auth.organizationId) {
            void loadForms();
        }
    });

    $effect(() => {
        const total = getEditorTotalSteps();
        if (total === 0) {
            editorStepIndex = 0;
            return;
        }

        if (editorStepIndex > total - 1) {
            editorStepIndex = total - 1;
        }
    });
</script>

<div class="space-y-6">
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
            <ClipboardList class="h-6 w-6 text-zinc-700 dark:text-zinc-300" />
            <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">Formulare</h1>
        </div>

        {#if canCreateForms}
            <Button variant="solid" tone="primary" onclick={openCreateModal}>
                <Plus class="h-4 w-4" />
                Neues Formular
            </Button>
        {/if}
    </div>

    {#if !canReadForms}
        <section
            class="rounded-xl border border-zinc-200 bg-white p-6 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
            Keine Berechtigung für Formulare (`forms:read`).
        </section>
    {:else}
        <ErrorAlert error={error} />

        {#if loading}
            <div
                class="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
            >
                Lade Formulare...
            </div>
        {:else if forms.length === 0}
            <div
                class="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
            >
                Keine Formulare vorhanden.
            </div>
        {:else}
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                {#each forms as form}
                    <article
                        class="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
                    >
                        <div class="mb-3 flex items-start justify-between gap-3">
                            <div>
                                <h2 class="text-lg font-semibold text-zinc-900 dark:text-white">
                                    {form.attributes.name}
                                </h2>
                            </div>
                            <span
                                class="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                            >
                                {form.attributes.published === false ? "Entwurf" : "Veröffentlicht"}
                            </span>
                        </div>

                        {#if form.attributes.description}
                            <p class="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
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

                        <div class="flex flex-wrap items-center gap-2">
                            <Button
                                variant="outline"
                                tone="neutral"
                                size="sm"
                                onclick={() => openDetail(form)}
                            >
                                <ExternalLink class="h-4 w-4" />
                                Öffnen
                            </Button>

                            {#if canUpdateForms}
                                <Button
                                    variant="ghost"
                                    tone="neutral"
                                    size="sm"
                                    onclick={() => openEditModal(form)}
                                >
                                    <Pencil class="h-4 w-4" />
                                    Bearbeiten
                                </Button>
                            {/if}

                            {#if canDeleteForms}
                                <Button
                                    variant="ghost"
                                    tone="danger"
                                    size="sm"
                                    onclick={() => removeFormEntry(form)}
                                >
                                    <Trash2 class="h-4 w-4" />
                                    Löschen
                                </Button>
                            {/if}
                        </div>
                    </article>
                {/each}
            </div>
        {/if}
    {/if}
</div>

<Modal
    bind:show={showFormModal}
    title={editingForm ? "Formular bearbeiten" : "Formular erstellen"}
    width="5xl"
>
    <form class="space-y-4" onsubmit={submitForm}>
        <ErrorAlert error={formError} />

        <TextInput label="Name" required bind:value={formName} />
        <TextInput
            label="Beschreibung"
            multiline
            rows={3}
            bind:value={formDescription}
        />

        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <SearchableSelect
                id="form-type"
                label="Formtyp"
                options={formTypeOptions}
                value={formType}
                searchable={false}
                onchange={(value) => (formType = value as FormType)}
            />

            <SearchableSelect
                id="form-visibility"
                label="Sichtbarkeit"
                options={visibilityOptions}
                value={formVisibility}
                searchable={false}
                onchange={(value) => (formVisibility = value as FormVisibility)}
            />
        </div>

        <div class="flex flex-col justify-end gap-2 pb-1">
                <Toggle
                    bind:checked={formRequiresSignature}
                    label="Signatur erforderlich"
                    class="text-sm text-zinc-700 dark:text-zinc-300"
                />

                <Toggle
                    bind:checked={formPublished}
                    label="Sofort veröffentlichen"
                    class="text-sm text-zinc-700 dark:text-zinc-300"
                />
        </div>

        <section class="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700 space-y-3">
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Layout: Pages
                </h3>
                <span class="text-xs text-zinc-500 dark:text-zinc-400">
                    {formSchema["x-form"].layout.pages.length} Pages
                </span>
            </div>

            <div class="flex gap-2">
                <input
                    type="text"
                    class="block w-full rounded-lg border-0 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-blue-600 dark:bg-zinc-900/50 dark:text-white dark:ring-zinc-700"
                    placeholder="Neue Seite"
                    bind:value={newPageTitle}
                />
                <Button type="button" variant="outline" tone="neutral" onclick={handleAddPage}>
                    <PlusCircle class="h-4 w-4" />
                    Seite
                </Button>
            </div>

            <div class="space-y-3">
                {#each formSchema["x-form"].layout.pages as page}
                    <article class="rounded-md border border-zinc-200 p-3 dark:border-zinc-700 space-y-3">
                        <div class="flex items-center gap-2">
                            <input
                                type="text"
                                class="block w-full rounded-lg border-0 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-blue-600 dark:bg-zinc-900/50 dark:text-white dark:ring-zinc-700"
                                value={page.title}
                                oninput={(e: Event) =>
                                    updatePageTitle(
                                        page.id,
                                        (e.currentTarget as HTMLInputElement).value,
                                    )}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                tone="danger"
                                size="sm"
                                onclick={() => handleRemovePage(page.id)}
                                disabled={formSchema["x-form"].layout.pages.length <= 1}
                            >
                                <Trash2 class="h-4 w-4" />
                            </Button>
                        </div>

                        <div
                            class="rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-300"
                        >
                            Felder auf dieser Seite: {page.elements.length}
                        </div>
                    </article>
                {/each}
            </div>
        </section>

        <section class="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700 space-y-3">
            <div class="flex items-center justify-between gap-3">
                <h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Felder konfigurieren
                </h3>
                <div class="flex items-center gap-2">
                    {#if getCurrentEditorPage()}
                        <span class="text-xs text-zinc-500 dark:text-zinc-400">
                            Schritt {editorStepIndex + 1} von {getEditorTotalSteps()}
                        </span>
                    {/if}

                    <div class="relative">
                        <Button
                            type="button"
                            variant="outline"
                            tone="neutral"
                            onclick={() => (showAddFieldTypeMenu = !showAddFieldTypeMenu)}
                        >
                            <Plus class="h-4 w-4" />
                            Neues Feld
                            <ChevronDown class="h-4 w-4" />
                        </Button>

                        {#if showAddFieldTypeMenu}
                            <div
                                class="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
                            >
                                {#each fieldKindOptions as option}
                                    <Button
                                        type="button"
                                        variant="menu"
                                        tone="neutral"
                                        align="left"
                                        onclick={() => addFieldToEnd(option.value)}
                                    >
                                        {option.label}
                                    </Button>
                                {/each}
                            </div>
                        {/if}
                    </div>
                </div>
            </div>

            {#if getEditorTotalSteps() > 1}
                <div class="flex gap-1">
                    {#each formSchema["x-form"].layout.pages as _page, stepIndex}
                        <div
                            class={`h-1.5 flex-1 rounded-full ${stepIndex <= editorStepIndex ? "bg-blue-600 dark:bg-blue-500" : "bg-zinc-200 dark:bg-zinc-700"}`}
                        ></div>
                    {/each}
                </div>

                <div class="flex items-center justify-between gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        tone="neutral"
                        onclick={goToPreviousEditorStep}
                        disabled={editorStepIndex === 0}
                    >
                        Zurück
                    </Button>
                    <Button
                        type="button"
                        variant="solid"
                        tone="primary"
                        onclick={goToNextEditorStep}
                        disabled={editorStepIndex >= getEditorTotalSteps() - 1}
                    >
                        Weiter
                    </Button>
                </div>
            {/if}

            {#if getCurrentEditorPage()}
                <div
                    class="rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-300"
                >
                    Aktuelle Seite: {getCurrentEditorPage()?.title || getCurrentEditorPage()?.id}
                </div>
            {/if}

            {#if getFieldOrderForCurrentEditorPage().length === 0}
                <p class="text-sm text-zinc-500 dark:text-zinc-400">
                    Auf dieser Seite sind noch keine Felder konfiguriert.
                </p>
            {:else}
                <div class="space-y-3">
                    {#each getFieldOrderForCurrentEditorPage() as fieldKey}
                        {@const field = formSchema.properties[fieldKey]}
                        {@const kind = getFieldKind(field)}
                        {@const placement =
                            getFieldPlacement(formSchema, fieldKey) ||
                            {
                                pageId: formSchema["x-form"].layout.pages[0].id,
                                colSpan: { sm: 12, md: 12 },
                            }}
                        {@const currentPlacementPage = formSchema["x-form"].layout.pages.find(
                            (entry) => entry.id === placement.pageId,
                        )}
                        <article class="rounded-md border border-zinc-200 p-3 dark:border-zinc-700 space-y-3">
                            <div class="flex items-center justify-between gap-2">
                                <div>
                                    <div class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                        {field.title || fieldKey}
                                    </div>
                                    <div class="text-xs text-zinc-500 dark:text-zinc-400">
                                        {#if isDraftFieldKey(fieldKey)}
                                            Key wird beim ersten Speichern aus der Bezeichnung erzeugt.
                                        {:else}
                                            {fieldKey}
                                        {/if}
                                    </div>
                                </div>
                                <div class="flex items-center gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        tone="neutral"
                                        size="xs"
                                        onclick={() =>
                                            (formSchema = moveField(formSchema, fieldKey, "up"))}
                                    >
                                        <ArrowUp class="h-4 w-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        tone="neutral"
                                        size="xs"
                                        onclick={() =>
                                            (formSchema = moveField(formSchema, fieldKey, "down"))}
                                    >
                                        <ArrowDown class="h-4 w-4" />
                                    </Button>
                                    <div class="relative">
                                        <Button
                                            type="button"
                                            variant="icon"
                                            tone="neutral"
                                            size="xs"
                                            iconOnly
                                            ariaLabel="Feldoptionen"
                                            onclick={() => toggleFieldOptionsMenu(fieldKey)}
                                        >
                                            <MoreVertical class="h-4 w-4" />
                                        </Button>

                                        {#if activeFieldOptionsMenu === fieldKey}
                                            <div
                                                class="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
                                            >
                                                <div
                                                    class="px-3 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400"
                                                >
                                                    Auf andere Seite verschieben
                                                </div>
                                                <div class="max-h-64 overflow-y-auto">
                                                    {#each formSchema["x-form"].layout.pages as page}
                                                        {@const isCurrentPage =
                                                            placement.pageId === page.id}
                                                        <Button
                                                            type="button"
                                                            variant="menu"
                                                            tone="neutral"
                                                            align="left"
                                                            disabled={isCurrentPage}
                                                            dividerTop
                                                            onclick={() =>
                                                                relocateFieldToPage(
                                                                    fieldKey,
                                                                    page.id,
                                                                )}
                                                        >
                                                            {page.title || page.id}
                                                            {#if isCurrentPage}
                                                                <span class="ml-auto text-xs text-zinc-400 dark:text-zinc-500">
                                                                    Aktuell
                                                                </span>
                                                            {/if}
                                                        </Button>
                                                    {/each}
                                                </div>
                                                <div
                                                    class="border-t border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
                                                >
                                                    Feldtyp ändern
                                                </div>
                                                <div class="max-h-56 overflow-y-auto">
                                                    {#each fieldKindOptions as option}
                                                        {@const isCurrentKind = kind === option.value}
                                                        <Button
                                                            type="button"
                                                            variant="menu"
                                                            tone="neutral"
                                                            align="left"
                                                            disabled={isCurrentKind}
                                                            dividerTop
                                                            onclick={() => {
                                                                setFieldKind(
                                                                    fieldKey,
                                                                    option.value,
                                                                );
                                                                activeFieldOptionsMenu = null;
                                                            }}
                                                        >
                                                            {option.label}
                                                            {#if isCurrentKind}
                                                                <span class="ml-auto text-xs text-zinc-400 dark:text-zinc-500">
                                                                    Aktuell
                                                                </span>
                                                            {/if}
                                                        </Button>
                                                    {/each}
                                                </div>
                                            </div>
                                        {/if}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        tone="danger"
                                        size="xs"
                                        onclick={() => handleRemoveField(fieldKey)}
                                    >
                                        <Trash2 class="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <TextInput
                                    label="Bezeichnung"
                                    value={field.title || ""}
                                    oninput={(e: Event) =>
                                        updateField(fieldKey, (current) => {
                                            current.title =
                                                (e.currentTarget as HTMLInputElement).value;
                                        })}
                                />

                                <TextInput
                                    label="Hilfetext"
                                    value={field["x-ui"]?.helpText || ""}
                                    oninput={(e: Event) =>
                                        updateField(fieldKey, (current) => {
                                            current["x-ui"] = {
                                                ...(current["x-ui"] || {}),
                                                helpText: (e.currentTarget as HTMLInputElement)
                                                    .value,
                                            };
                                        })}
                                />

                                <Toggle
                                    checked={formSchema.required?.includes(fieldKey) || false}
                                    onchange={(checked) =>
                                        toggleFieldRequired(fieldKey, checked)}
                                    label="Pflichtfeld"
                                    class="text-sm text-zinc-700 dark:text-zinc-300"
                                />
                            </div>

                            <div class="rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-300">
                                Position: {currentPlacementPage?.title || currentPlacementPage?.id}
                            </div>

                            {#if kind === "text" || kind === "textarea" || kind === "email"}
                                <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                                    <TextInput
                                        label="Platzhalter"
                                        value={field["x-ui"]?.placeholder || ""}
                                        oninput={(e: Event) =>
                                            updateField(fieldKey, (current) => {
                                                current["x-ui"] = {
                                                    ...(current["x-ui"] || {}),
                                                    placeholder: (
                                                        e.currentTarget as HTMLInputElement
                                                    ).value,
                                                    widget:
                                                        kind === "textarea"
                                                            ? "textarea"
                                                            : kind === "email"
                                                              ? "email"
                                                              : "text",
                                                };
                                            })}
                                    />
                                </div>
                            {/if}

                            {#if kind === "select"}
                                <TextInput
                                    label="Optionen (kommagetrennt)"
                                    value={(field.enum || []).join(", ")}
                                    oninput={(e: Event) =>
                                        updateEnumFromCsv(
                                            fieldKey,
                                            (e.currentTarget as HTMLInputElement).value,
                                        )}
                                />
                            {/if}

                            {#if kind === "boolean"}
                                <Toggle
                                    checked={field.const === true}
                                    onchange={(checked) =>
                                        updateField(fieldKey, (current) => {
                                            current.const = checked ? true : undefined;
                                            current.type = "boolean";
                                            current["x-ui"] = {
                                                ...(current["x-ui"] || {}),
                                                widget: "checkbox",
                                            };
                                        })}
                                    label="Muss aktiv angehakt sein (const=true)"
                                    class="text-sm text-zinc-700 dark:text-zinc-300"
                                />
                            {/if}

                            {#if kind === "repeater"}
                                <div class="space-y-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
                                    <div class="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                        Wiederholfeld-Einträge
                                    </div>

                                    {#if field.items?.type !== "object"}
                                        <p class="text-xs text-zinc-500 dark:text-zinc-400">
                                            Eintrags-Schema ist kein Objekt. Beim Hinzufügen wird ein Objekt erzeugt.
                                        </p>
                                    {/if}

                                    <div class="space-y-2">
                                        {#each Object.entries(field.items?.properties || {}) as [childKey, childSchema]}
                                            <div
                                                class="rounded-md border border-zinc-200 p-2 dark:border-zinc-700 space-y-2"
                                            >
                                                <div class="flex items-center justify-between gap-2">
                                                    <span class="text-xs text-zinc-500 dark:text-zinc-400">
                                                        {childKey}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        tone="danger"
                                                        size="xs"
                                                        onclick={() =>
                                                            removeRepeaterItemField(
                                                                fieldKey,
                                                                childKey,
                                                            )}
                                                    >
                                                        <Trash2 class="h-4 w-4" />
                                                    </Button>
                                                </div>

                                                <div class="grid grid-cols-1 gap-2 md:grid-cols-3">
                                                    <TextInput
                                                        label="Bezeichnung"
                                                        value={childSchema.title || ""}
                                                        oninput={(e: Event) =>
                                                            updateRepeaterItemField(
                                                                fieldKey,
                                                                childKey,
                                                                (current) => {
                                                                    current.title = (
                                                                        e.currentTarget as HTMLInputElement
                                                                    ).value;
                                                                },
                                                            )}
                                                    />

                                                    <SearchableSelect
                                                        id={`child-type-${fieldKey}-${childKey}`}
                                                        label="Typ"
                                                        options={[
                                                            { value: "string", label: "Text" },
                                                            { value: "number", label: "Zahl" },
                                                            { value: "boolean", label: "Ja/Nein" },
                                                        ]}
                                                        value={childSchema.type || "string"}
                                                        searchable={false}
                                                        onchange={(nextType) =>
                                                            updateRepeaterItemField(
                                                                fieldKey,
                                                                childKey,
                                                                (current) => {
                                                                    current.type = nextType;
                                                                    current["x-ui"] = {
                                                                        ...(current["x-ui"] || {}),
                                                                        widget:
                                                                            nextType === "boolean"
                                                                                ? "checkbox"
                                                                                : nextType === "number"
                                                                                  ? "number"
                                                                                  : "text",
                                                                    };
                                                                },
                                                            )}
                                                    />

                                                    <Toggle
                                                        checked={
                                                            field.items?.required?.includes(childKey) ||
                                                            false
                                                        }
                                                        onchange={(checked) =>
                                                            updateRepeaterItemField(
                                                                fieldKey,
                                                                childKey,
                                                                (_child, required) => {
                                                                    if (checked) {
                                                                        required.add(childKey);
                                                                    } else {
                                                                        required.delete(childKey);
                                                                    }
                                                                },
                                                            )}
                                                        label="Pflichtfeld"
                                                        class="pb-1 text-sm text-zinc-700 dark:text-zinc-300"
                                                    />
                                                </div>
                                            </div>
                                        {/each}
                                    </div>

                                    <div class="grid grid-cols-1 gap-2 md:grid-cols-4">
                                        <TextInput
                                            label="Eintragsschlüssel"
                                            value={getRepeaterDraft(fieldKey).key}
                                            oninput={(e: Event) =>
                                                setRepeaterDraft(fieldKey, {
                                                    key: (e.currentTarget as HTMLInputElement).value,
                                                })}
                                        />
                                        <TextInput
                                            label="Eintragsbezeichnung"
                                            value={getRepeaterDraft(fieldKey).title}
                                            oninput={(e: Event) =>
                                                setRepeaterDraft(fieldKey, {
                                                    title: (e.currentTarget as HTMLInputElement)
                                                        .value,
                                                })}
                                        />
                                        <SearchableSelect
                                            id={`repeater-type-${fieldKey}`}
                                            label="Eintragstyp"
                                            options={[
                                                { value: "string", label: "Text" },
                                                { value: "number", label: "Zahl" },
                                                { value: "boolean", label: "Ja/Nein" },
                                            ]}
                                            value={getRepeaterDraft(fieldKey).type}
                                            searchable={false}
                                            onchange={(value) =>
                                                setRepeaterDraft(fieldKey, {
                                                    type: value as "string" | "number" | "boolean",
                                                })}
                                        />

                                        <div class="flex flex-col justify-end gap-2 pb-1">
                                            <Toggle
                                                checked={getRepeaterDraft(fieldKey).required}
                                                onchange={(checked) =>
                                                    setRepeaterDraft(fieldKey, {
                                                        required: checked,
                                                    })}
                                                label="Pflicht"
                                                class="text-sm text-zinc-700 dark:text-zinc-300"
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        tone="neutral"
                                        size="sm"
                                        onclick={() => addRepeaterItemField(fieldKey)}
                                    >
                                        <Plus class="h-4 w-4" />
                                        Eintragsfeld hinzufügen
                                    </Button>
                                </div>
                            {/if}

                            <div class="space-y-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
                                <h4 class="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                    Regeln
                                </h4>

                                {#if kind === "text" || kind === "textarea" || kind === "email"}
                                    <div class="space-y-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
                                        <div class="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                            Validierung (optional)
                                        </div>
                                        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                                            <Toggle
                                                checked={field.minLength !== undefined}
                                                onchange={(checked) =>
                                                    toggleFieldConstraint(
                                                        fieldKey,
                                                        "minLength",
                                                        checked,
                                                    )}
                                                label="minLength aktiv"
                                                class="text-sm text-zinc-700 dark:text-zinc-300"
                                            />
                                            {#if field.minLength !== undefined}
                                                <TextInput
                                                    label="minLength"
                                                    type="number"
                                                    value={String(field.minLength)}
                                                    oninput={(e: Event) =>
                                                        setFieldConstraintValue(
                                                            fieldKey,
                                                            "minLength",
                                                            (e.currentTarget as HTMLInputElement)
                                                                .value,
                                                        )}
                                                />
                                            {/if}

                                            <Toggle
                                                checked={field.maxLength !== undefined}
                                                onchange={(checked) =>
                                                    toggleFieldConstraint(
                                                        fieldKey,
                                                        "maxLength",
                                                        checked,
                                                    )}
                                                label="maxLength aktiv"
                                                class="text-sm text-zinc-700 dark:text-zinc-300"
                                            />
                                            {#if field.maxLength !== undefined}
                                                <TextInput
                                                    label="maxLength"
                                                    type="number"
                                                    value={String(field.maxLength)}
                                                    oninput={(e: Event) =>
                                                        setFieldConstraintValue(
                                                            fieldKey,
                                                            "maxLength",
                                                            (e.currentTarget as HTMLInputElement)
                                                                .value,
                                                        )}
                                                />
                                            {/if}
                                        </div>
                                    </div>
                                {/if}

                                {#if kind === "number"}
                                    <div class="space-y-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
                                        <div class="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                            Validierung (optional)
                                        </div>
                                        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                                            <Toggle
                                                checked={field.minimum !== undefined}
                                                onchange={(checked) =>
                                                    toggleFieldConstraint(
                                                        fieldKey,
                                                        "minimum",
                                                        checked,
                                                    )}
                                                label="minimum aktiv"
                                                class="text-sm text-zinc-700 dark:text-zinc-300"
                                            />
                                            {#if field.minimum !== undefined}
                                                <TextInput
                                                    label="minimum"
                                                    type="number"
                                                    value={String(field.minimum)}
                                                    oninput={(e: Event) =>
                                                        setFieldConstraintValue(
                                                            fieldKey,
                                                            "minimum",
                                                            (e.currentTarget as HTMLInputElement)
                                                                .value,
                                                        )}
                                                />
                                            {/if}

                                            <Toggle
                                                checked={field.maximum !== undefined}
                                                onchange={(checked) =>
                                                    toggleFieldConstraint(
                                                        fieldKey,
                                                        "maximum",
                                                        checked,
                                                    )}
                                                label="maximum aktiv"
                                                class="text-sm text-zinc-700 dark:text-zinc-300"
                                            />
                                            {#if field.maximum !== undefined}
                                                <TextInput
                                                    label="maximum"
                                                    type="number"
                                                    value={String(field.maximum)}
                                                    oninput={(e: Event) =>
                                                        setFieldConstraintValue(
                                                            fieldKey,
                                                            "maximum",
                                                            (e.currentTarget as HTMLInputElement)
                                                                .value,
                                                        )}
                                                />
                                            {/if}
                                        </div>
                                    </div>
                                {/if}

                                {#if kind === "repeater"}
                                    <div class="space-y-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
                                        <div class="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                            Validierung (optional)
                                        </div>
                                        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                                            <Toggle
                                                checked={field.minItems !== undefined}
                                                onchange={(checked) =>
                                                    toggleFieldConstraint(
                                                        fieldKey,
                                                        "minItems",
                                                        checked,
                                                    )}
                                                label="minItems aktiv"
                                                class="text-sm text-zinc-700 dark:text-zinc-300"
                                            />
                                            {#if field.minItems !== undefined}
                                                <TextInput
                                                    label="minItems"
                                                    type="number"
                                                    value={String(field.minItems)}
                                                    oninput={(e: Event) =>
                                                        setFieldConstraintValue(
                                                            fieldKey,
                                                            "minItems",
                                                            (e.currentTarget as HTMLInputElement)
                                                                .value,
                                                        )}
                                                />
                                            {/if}

                                            <Toggle
                                                checked={field.maxItems !== undefined}
                                                onchange={(checked) =>
                                                    toggleFieldConstraint(
                                                        fieldKey,
                                                        "maxItems",
                                                        checked,
                                                    )}
                                                label="maxItems aktiv"
                                                class="text-sm text-zinc-700 dark:text-zinc-300"
                                            />
                                            {#if field.maxItems !== undefined}
                                                <TextInput
                                                    label="maxItems"
                                                    type="number"
                                                    value={String(field.maxItems)}
                                                    oninput={(e: Event) =>
                                                        setFieldConstraintValue(
                                                            fieldKey,
                                                            "maxItems",
                                                            (e.currentTarget as HTMLInputElement)
                                                                .value,
                                                        )}
                                                />
                                            {/if}
                                        </div>
                                    </div>
                                {/if}

                                {#each ["visibleWhen", "requiredWhen"] as mode}
                                    {@const condition = getRuleCondition(fieldKey, mode as RuleMode)}
                                    <div class="space-y-2">
                                        <Toggle
                                            checked={!!condition}
                                            onchange={(checked) =>
                                                setRuleEnabled(
                                                    fieldKey,
                                                    mode as RuleMode,
                                                    checked,
                                                )}
                                            label={mode === "visibleWhen"
                                                ? "Sichtbarkeit ist bedingt"
                                                : "Pflichtfeld ist bedingt"}
                                            class="text-sm text-zinc-700 dark:text-zinc-300"
                                        />

                                        {#if condition}
                                            <div class="grid grid-cols-1 gap-2 md:grid-cols-3">
                                                <SearchableSelect
                                                    id={`rule-field-${fieldKey}-${mode}`}
                                                    label="Feld"
                                                    options={Object.keys(formSchema.properties)
                                                        .filter((key) => key !== fieldKey)
                                                        .map((key) => ({
                                                            value: key,
                                                            label: key,
                                                        }))}
                                                    value={condition.field}
                                                    searchable
                                                    onchange={(value) =>
                                                        updateRuleCondition(
                                                            fieldKey,
                                                            mode as RuleMode,
                                                            {
                                                                field: value,
                                                            },
                                                        )}
                                                />

                                                <SearchableSelect
                                                    id={`rule-op-${fieldKey}-${mode}`}
                                                    label="Vergleichsoperator"
                                                    options={operatorOptions.map((operator) => ({
                                                        value: operator,
                                                        label: operator,
                                                    }))}
                                                    value={condition.op}
                                                    searchable={false}
                                                    onchange={(value) =>
                                                        updateRuleCondition(
                                                            fieldKey,
                                                            mode as RuleMode,
                                                            {
                                                                op: value as RuleOperator,
                                                            },
                                                        )}
                                                />

                                                <TextInput
                                                    label="Wert (JSON oder Text)"
                                                    value={
                                                        condition.value === undefined
                                                            ? ""
                                                            : typeof condition.value === "string"
                                                              ? condition.value
                                                              : JSON.stringify(condition.value)
                                                    }
                                                    oninput={(e: Event) =>
                                                        updateRuleCondition(
                                                            fieldKey,
                                                            mode as RuleMode,
                                                            {
                                                                value: readRuleValue(
                                                                    (
                                                                        e.currentTarget as HTMLInputElement
                                                                    ).value,
                                                                ),
                                                            },
                                                        )}
                                                />
                                            </div>
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                        </article>
                    {/each}
                </div>
            {/if}
        </section>

        <details class="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            <summary class="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Schema JSON Vorschau
            </summary>
            <pre class="mt-3 max-h-96 overflow-auto rounded-lg bg-zinc-900 p-3 text-xs text-zinc-100"
                >{JSON.stringify(formSchema, null, 2)}</pre
            >
        </details>

        <Button
            type="submit"
            variant="solid"
            tone="primary"
            width="full"
            loading={formLoading}
            disabled={formLoading}
        >
            {editingForm ? "Formular speichern" : "Formular erstellen"}
        </Button>
    </form>
</Modal>
