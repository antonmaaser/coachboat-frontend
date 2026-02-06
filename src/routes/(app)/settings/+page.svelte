<script lang="ts">
    import { userApi } from "$lib/api/users";
    import {
        resourceCategoryApi,
        type ResourceCategoryAttributes,
    } from "$lib/api/resource-categories";
    import { auth, hasPermission } from "$lib/stores/auth";
    import {
        Loader2,
        CheckCircle2,
        AlertCircle,
        Pencil,
        Trash2,
        Plus,
    } from "lucide-svelte";
    import * as Icons from "lucide-svelte";
    // ResourceCategories removed
    import TextInput from "$lib/components/ui/TextInput.svelte";
    import { onMount } from "svelte";

    let oldPassword = $state("");
    let newPassword = $state("");
    let confirmPassword = $state("");
    let loading = $state(false);
    let success = $state(false);
    let error = $state("");

    let canManageCategories = $derived(
        hasPermission(
            $auth.user,
            "resource_categories:manage",
            $auth.organizationId,
        ),
    );

    // Categories State
    let categories = $state<any[]>([]);
    let categoriesLoading = $state(true);
    let catShowDialog = $state(false);
    let catEditingCategory = $state<any>(undefined);

    // Category Form State
    let catFormTitle = $state("");
    let catFormColor = $state("#3b82f6");
    let catFormIcon = $state("Ship");
    let catFormLoading = $state(false);
    let catFormError = $state("");

    async function loadCategories() {
        if (!canManageCategories) {
            categoriesLoading = false;
            return;
        }
        categoriesLoading = true;
        try {
            const res = await resourceCategoryApi.list();
            if (res.ok) {
                const json = await res.json();
                categories = json.data || json;
            }
        } catch (e) {
            console.error(e);
        } finally {
            categoriesLoading = false;
        }
    }

    $effect(() => {
        // Load categories if admin status changes to true (e.g. initial load or login)
        if (
            canManageCategories &&
            categories.length === 0 &&
            categoriesLoading
        ) {
            loadCategories();
        }
    });

    $effect(() => {
        if (catShowDialog) {
            catFormError = "";
            if (catEditingCategory) {
                catFormTitle = catEditingCategory.attributes.title;
                catFormColor = catEditingCategory.attributes.color || "#3b82f6";
                catFormIcon = catEditingCategory.attributes.icon || "Ship";
            } else {
                catFormTitle = "";
                catFormColor = "#3b82f6";
                catFormIcon = "Ship";
            }
        }
    });

    async function handleCategorySubmit(e: Event) {
        e.preventDefault();
        catFormLoading = true;
        catFormError = "";

        try {
            const data: ResourceCategoryAttributes = {
                title: catFormTitle,
                color: catFormColor,
                icon: catFormIcon,
            };
            let res;
            if (catEditingCategory) {
                res = await resourceCategoryApi.update(
                    catEditingCategory.id,
                    data,
                );
            } else {
                res = await resourceCategoryApi.create(data);
            }

            if (res.ok) {
                loadCategories();
                catShowDialog = false;
            } else {
                const json = await res.json();
                catFormError =
                    json.errors?.[0]?.detail || "Ein Fehler ist aufgetreten";
            }
        } catch (e: any) {
            console.error(e);
            catFormError = e.message;
        } finally {
            catFormLoading = false;
        }
    }

    async function handleDeleteCategory(category: any) {
        if (
            !confirm(
                `Kategorie "${category.attributes.title}" wirklich löschen?`,
            )
        )
            return;
        try {
            const res = await resourceCategoryApi.delete(category.id);
            if (res.ok) {
                loadCategories();
            } else {
                alert("Fehler beim Löschen");
            }
        } catch (e) {
            console.error(e);
        }
    }

    function openCreateCategory() {
        catEditingCategory = undefined;
        catShowDialog = true;
    }

    function openEditCategory(cat: any) {
        catEditingCategory = cat;
        catShowDialog = true;
    }

    async function handleSubmit(e: Event) {
        e.preventDefault();
        error = "";
        success = false;

        if (newPassword !== confirmPassword) {
            error = "Die Passwörter stimmen nicht überein.";
            return;
        }

        if (newPassword.length < 8) {
            error = "Das Passwort muss mindestens 8 Zeichen lang sein.";
            return;
        }

        loading = true;
        try {
            const res = await userApi.update($auth.user!.id, {
                password: newPassword,
            });

            if (res.ok) {
                success = true;
                oldPassword = "";
                newPassword = "";
                confirmPassword = "";
            } else {
                const json = await res.json();
                error =
                    json.errors?.[0]?.detail ||
                    "Fehler beim Ändern des Passworts";
            }
        } catch (e: any) {
            console.error(e);
            error = `Ein unerwarteter Fehler ist aufgetreten: ${e.message}`;
        } finally {
            loading = false;
        }
    }
</script>

<div class="space-y-6">
    <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">
            Einstellungen
        </h1>
    </div>

    {#if canManageCategories}
        <div
            class="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 max-w-2xl"
        >
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <h3
                        class="text-lg font-semibold text-zinc-900 dark:text-white"
                    >
                        Material-Kategorien
                    </h3>
                    <button
                        onclick={openCreateCategory}
                        class="text-sm bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-900 dark:text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Plus class="w-4 h-4" />
                        Neu
                    </button>
                </div>

                {#if categoriesLoading}
                    <div class="flex justify-center p-4">
                        <Loader2 class="w-6 h-6 animate-spin text-zinc-400" />
                    </div>
                {:else if categories.length === 0}
                    <div class="text-center p-4 text-zinc-500 text-sm italic">
                        Keine Kategorien vorhanden.
                    </div>
                {:else}
                    <div class="grid gap-3">
                        {#each categories as cat}
                            <div
                                class="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                            >
                                <div class="flex items-center gap-3">
                                    <div
                                        class="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-100 dark:bg-zinc-700"
                                        style="color: {cat.attributes.color}"
                                    >
                                        {#if cat.attributes.icon && (Icons as any)[cat.attributes.icon]}
                                            {@const Icon = (Icons as any)[
                                                cat.attributes.icon
                                            ]}
                                            <Icon class="w-5 h-5" />
                                        {:else}
                                            <span
                                                class="w-4 h-4 block bg-current rounded-full"
                                            ></span>
                                        {/if}
                                    </div>
                                    <div>
                                        <div
                                            class="font-medium text-zinc-900 dark:text-white"
                                        >
                                            {cat.attributes.title}
                                        </div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-1">
                                    <button
                                        onclick={() => openEditCategory(cat)}
                                        class="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg"
                                    >
                                        <Pencil class="w-4 h-4" />
                                    </button>
                                    <button
                                        onclick={() =>
                                            handleDeleteCategory(cat)}
                                        class="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                    >
                                        <Trash2 class="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            {#if catShowDialog}
                <div
                    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                >
                    <div
                        class="bg-white dark:bg-zinc-800 rounded-xl shadow-xl max-w-md w-full p-6 relative"
                    >
                        <h2
                            class="text-xl font-bold mb-4 text-zinc-900 dark:text-white"
                        >
                            {catEditingCategory
                                ? "Kategorie bearbeiten"
                                : "Neue Kategorie"}
                        </h2>

                        {#if catFormError}
                            <div
                                class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm"
                            >
                                {catFormError}
                            </div>
                        {/if}

                        <form onsubmit={handleCategorySubmit} class="space-y-4">
                            <div>
                                <label
                                    for="cat-title"
                                    class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                                >
                                    Titel *
                                </label>
                                <input
                                    id="cat-title"
                                    type="text"
                                    bind:value={catFormTitle}
                                    required
                                    class="w-full rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label
                                    for="cat-color"
                                    class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                                >
                                    Farbe
                                </label>
                                <div class="space-y-3">
                                    <div class="flex flex-wrap gap-2">
                                        {#each ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#64748b", "#71717a"] as preset}
                                            <button
                                                type="button"
                                                aria-label="Farbe {preset}"
                                                class="w-6 h-6 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                class:border-zinc-300={catFormColor !==
                                                    preset}
                                                class:dark:border-zinc-600={catFormColor !==
                                                    preset}
                                                class:border-zinc-900={catFormColor ===
                                                    preset}
                                                class:dark:border-white={catFormColor ===
                                                    preset}
                                                class:scale-110={catFormColor ===
                                                    preset}
                                                style="background-color: {preset}"
                                                onclick={() =>
                                                    (catFormColor = preset)}
                                            ></button>
                                        {/each}
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <div
                                            class="w-10 h-10 rounded-lg border border-zinc-200 dark:border-zinc-700"
                                            style="background-color: {catFormColor}"
                                        ></div>
                                        <input
                                            type="text"
                                            bind:value={catFormColor}
                                            placeholder="#000000"
                                            class="flex-1 rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white uppercase"
                                            maxlength="7"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label
                                    for="cat-icon"
                                    class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                                >
                                    Icon (Lucide Name)
                                </label>
                                <div class="flex gap-2 items-center">
                                    <input
                                        id="cat-icon"
                                        type="text"
                                        bind:value={catFormIcon}
                                        placeholder="z.B. Ship, Anchor, Truck"
                                        class="flex-1 rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                                    />
                                    <div
                                        class="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-700 rounded-lg"
                                    >
                                        {#if catFormIcon && (Icons as any)[catFormIcon]}
                                            {@const Icon = (Icons as any)[
                                                catFormIcon
                                            ]}
                                            <Icon
                                                class="w-6 h-6 text-zinc-600 dark:text-zinc-300"
                                            />
                                        {/if}
                                    </div>
                                </div>
                                <p class="text-xs text-zinc-500 mt-1">
                                    Gültige Lucide Icons namen eingeben.
                                </p>
                            </div>

                            <div class="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onclick={() => (catShowDialog = false)}
                                    class="px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    type="submit"
                                    disabled={catFormLoading}
                                    class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {#if catFormLoading}
                                        <Loader2 class="w-4 h-4 animate-spin" />
                                    {/if}
                                    Speichern
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            {/if}
        </div>
    {/if}

    <div
        class="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 max-w-2xl"
    >
        <h2 class="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Passwort ändern
        </h2>

        <form onsubmit={handleSubmit} class="space-y-4">
            {#if success}
                <div
                    class="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-lg flex items-center gap-2"
                >
                    <CheckCircle2 class="w-5 h-5" />
                    Passwort wurde erfolgreich geändert.
                </div>
            {/if}

            {#if error}
                <div
                    class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center gap-2"
                >
                    <AlertCircle class="w-5 h-5" />
                    {error}
                </div>
            {/if}

            <div>
                <TextInput
                    id="newPassword"
                    type="password"
                    label="Neues Passwort"
                    bind:value={newPassword}
                    required
                />
            </div>

            <div>
                <TextInput
                    id="confirmPassword"
                    type="password"
                    label="Passwort bestätigen"
                    bind:value={confirmPassword}
                    required
                />
            </div>

            <div class="pt-4">
                <button
                    type="submit"
                    disabled={loading}
                    class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {#if loading}
                        <Loader2 class="w-4 h-4 animate-spin" />
                        Speichern...
                    {:else}
                        Passwort speichern
                    {/if}
                </button>
            </div>
        </form>
    </div>
</div>
