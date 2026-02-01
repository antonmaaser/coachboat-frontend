<script lang="ts">
    import { onMount } from "svelte";
    import { rolesApi, type Role } from "$lib/api/roles";
    import { Loader2, ShieldAlert } from "lucide-svelte";
    import RBACMatrix from "$lib/components/RBACMatrix.svelte";
    import { auth } from "$lib/stores/auth";

    import type { JSONAPIResponse } from "$lib/api/utils";

    let loading = $state(true);
    let error = $state<string | null>(null);
    let roles = $state<Role[]>([]);

    onMount(async () => {
        try {
            const res = await rolesApi.getAll();
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(
                    err.errors?.[0]?.detail ||
                        err.errors?.[0]?.title ||
                        `Error: ${res.statusText}`,
                );
            }
            const json: JSONAPIResponse<Role[]> = await res.json();
            roles = json.data;
        } catch (e: any) {
            console.error(e);
            error = e.message;
        } finally {
            loading = false;
        }
    });
</script>

<div class="space-y-6">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">
                Berechtigungsmatrix
            </h1>
            <p class="text-zinc-500 dark:text-zinc-400 mt-1">
                Übersicht aller Rollen und deren zugewiesene Berechtigungen.
            </p>
        </div>
    </div>

    {#if loading}
        <div class="flex items-center justify-center p-12">
            <Loader2 class="w-8 h-8 text-blue-600 animate-spin" />
        </div>
    {:else if error}
        <div
            class="rounded-md bg-red-50 dark:bg-red-900/30 p-4 border border-red-200 dark:border-red-800"
        >
            <div class="flex">
                <div class="flex-shrink-0">
                    <ShieldAlert
                        class="h-5 w-5 text-red-400"
                        aria-hidden="true"
                    />
                </div>
                <div class="ml-3">
                    <h3
                        class="text-sm font-medium text-red-800 dark:text-red-200"
                    >
                        Zugriff verweigert oder Fehler
                    </h3>
                    <div class="mt-2 text-sm text-red-700 dark:text-red-300">
                        <p>{error}</p>
                    </div>
                </div>
            </div>
        </div>
    {:else}
        <div
            class="bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-800 overflow-hidden"
        >
            <RBACMatrix {roles} />
        </div>
    {/if}
</div>
