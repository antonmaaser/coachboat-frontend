<script lang="ts">
    import { resourceApi } from "$lib/api/resources";
    import { auth } from "$lib/stores/auth";
    import {
        Ship,
        Plus,
        MoreVertical,
        CheckCircle2,
        XCircle,
    } from "lucide-svelte";
    import { onMount } from "svelte";

    let resources = $state<any[]>([]);
    let loading = $state(true);

    onMount(async () => {
        try {
            const res = await resourceApi.list();
            if (res.ok) {
                const json = await res.json();
                resources = json.data || json;
            }
        } catch (e) {
            console.error(e);
        } finally {
            loading = false;
        }
    });

    let isAdmin = $derived($auth.user?.status && $auth.user.status >= 3);
</script>

<div class="space-y-6">
    <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">
            Resources
        </h1>

        {#if isAdmin}
            <button
                onclick={() => alert("Create Resource feature coming soon!")}
                class="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/20"
            >
                <Plus class="w-5 h-5" />
                New Resource
            </button>
        {/if}
    </div>

    {#if loading}
        <div class="flex w-full justify-center p-12">
            <div
                class="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"
            ></div>
        </div>
    {:else if resources.length === 0}
        <div
            class="text-center p-12 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700"
        >
            <Ship class="w-12 h-12 mx-auto text-zinc-400 mb-4" />
            <h3 class="text-lg font-medium text-zinc-900 dark:text-white">
                No resources found
            </h3>
            <p class="text-zinc-500 mt-1">
                There are no boats or resources available yet.
            </p>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each resources as resource}
                {@const attrs = resource.attributes}
                <div
                    class="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 relative group transition-all hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-600"
                >
                    <div class="flex items-start justify-between mb-4">
                        <div
                            class="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400"
                        >
                            <Ship class="w-6 h-6" />
                        </div>
                        {#if isAdmin}
                            <button
                                onclick={() =>
                                    alert("Edit feature coming soon!")}
                                class="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                            >
                                <MoreVertical class="w-5 h-5" />
                            </button>
                        {/if}
                    </div>

                    <h3
                        class="text-lg font-bold text-zinc-900 dark:text-white mb-2"
                    >
                        {attrs.title}
                    </h3>
                    <p
                        class="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-3 mb-4 min-h-[3em]"
                    >
                        {attrs.description || "No description provided."}
                    </p>

                    <div
                        class="flex items-center gap-2 text-sm pt-4 border-t border-zinc-100 dark:border-zinc-700/50"
                    >
                        {#if attrs["is-ready"]}
                            <CheckCircle2 class="w-4 h-4 text-green-500" />
                            <span
                                class="text-green-700 dark:text-green-400 font-medium"
                                >Ready for use</span
                            >
                        {:else}
                            <XCircle class="w-4 h-4 text-red-500" />
                            <span
                                class="text-red-700 dark:text-red-400 font-medium"
                                >Not available</span
                            >
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
