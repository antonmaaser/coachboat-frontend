<script lang="ts">
    import { resourceCategoryApi } from "$lib/api/resource-categories";
    import { onMount } from "svelte";
    import * as Icons from "lucide-svelte";
    import { Pencil, Trash2, Plus, Loader2, AlertCircle } from "lucide-svelte";
    import ResourceCategoryDialog from "./ResourceCategoryDialog.svelte";

    let categories = $state<any[]>([]);
    let loading = $state(true);
    let showDialog = $state(false);
    let editingCategory = $state<any>(undefined);

    async function loadCategories() {
        loading = true;
        try {
            const res = await resourceCategoryApi.list();
            if (res.ok) {
                const json = await res.json();
                categories = json.data || json;
            }
        } catch (e) {
            console.error(e);
        } finally {
            loading = false;
        }
    }

    async function handleDelete(category: any) {
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

    function openCreate() {
        editingCategory = undefined;
        showDialog = true;
    }

    function openEdit(cat: any) {
        editingCategory = cat;
        showDialog = true;
    }

    onMount(() => {
        loadCategories();
    });
</script>

<div class="space-y-4">
    <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-zinc-900 dark:text-white">
            Material-Kategorien
        </h3>
        <button
            onclick={openCreate}
            class="text-sm bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-900 dark:text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
        >
            <Plus class="w-4 h-4" />
            Neu
        </button>
    </div>

    {#if loading}
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
                            onclick={() => openEdit(cat)}
                            class="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg"
                        >
                            <Pencil class="w-4 h-4" />
                        </button>
                        <button
                            onclick={() => handleDelete(cat)}
                            class="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                            <Trash2 class="w-4 h-4" />
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}

    <ResourceCategoryDialog
        bind:show={showDialog}
        category={editingCategory}
        onSuccess={loadCategories}
    />
</div>
