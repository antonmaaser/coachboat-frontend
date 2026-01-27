<script lang="ts">
    import {
        resourceCategoryApi,
        type ResourceCategoryAttributes,
    } from "$lib/api/resource-categories";
    import { Loader2 } from "lucide-svelte";
    import * as Icons from "lucide-svelte";

    let {
        show = $bindable(false),
        category = undefined,
        onSuccess,
    } = $props<{
        show: boolean;
        category?: any;
        onSuccess: () => void;
    }>();

    let title = $state("");
    let color = $state("#3b82f6");
    let icon = $state("Ship");
    let loading = $state(false);
    let error = $state("");

    $effect(() => {
        if (show) {
            error = "";
            if (category) {
                title = category.attributes.title;
                color = category.attributes.color || "#3b82f6";
                icon = category.attributes.icon || "Ship";
            } else {
                title = "";
                color = "#3b82f6";
                icon = "Ship";
            }
        }
    });

    async function handleSubmit(e: Event) {
        e.preventDefault();
        loading = true;
        error = "";

        try {
            const data: ResourceCategoryAttributes = { title, color, icon };
            let res;
            if (category) {
                res = await resourceCategoryApi.update(category.id, data);
            } else {
                res = await resourceCategoryApi.create(data);
            }

            if (res.ok) {
                onSuccess();
                show = false;
            } else {
                const json = await res.json();
                error =
                    json.errors?.[0]?.detail || "Ein Fehler ist aufgetreten";
            }
        } catch (e: any) {
            console.error(e);
            error = e.message;
        } finally {
            loading = false;
        }
    }
</script>

{#if show}
    <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    >
        <div
            class="bg-white dark:bg-zinc-800 rounded-xl shadow-xl max-w-md w-full p-6 relative"
        >
            <h2 class="text-xl font-bold mb-4 text-zinc-900 dark:text-white">
                {category ? "Kategorie bearbeiten" : "Neue Kategorie"}
            </h2>

            {#if error}
                <div
                    class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm"
                >
                    {error}
                </div>
            {/if}

            <form onsubmit={handleSubmit} class="space-y-4">
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
                        bind:value={title}
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
                                    class:border-zinc-300={color !== preset}
                                    class:dark:border-zinc-600={color !==
                                        preset}
                                    class:border-zinc-900={color === preset}
                                    class:dark:border-white={color === preset}
                                    class:scale-110={color === preset}
                                    style="background-color: {preset}"
                                    onclick={() => (color = preset)}
                                ></button>
                            {/each}
                        </div>
                        <div class="flex items-center gap-2">
                            <div
                                class="w-10 h-10 rounded-lg border border-zinc-200 dark:border-zinc-700"
                                style="background-color: {color}"
                            ></div>
                            <input
                                type="text"
                                bind:value={color}
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
                            bind:value={icon}
                            placeholder="z.B. Ship, Anchor, Truck"
                            class="flex-1 rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                        />
                        <div
                            class="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-700 rounded-lg"
                        >
                            {#if icon && (Icons as any)[icon]}
                                {@const Icon = (Icons as any)[icon]}
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
                        onclick={() => (show = false)}
                        class="px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg"
                    >
                        Abbrechen
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {#if loading}
                            <Loader2 class="w-4 h-4 animate-spin" />
                        {/if}
                        Speichern
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}
