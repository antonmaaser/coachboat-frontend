<script lang="ts">
    import type { UserAttributes } from "$lib/api/users";
    import { Shield, Users, Check } from "lucide-svelte";

    let { permissions } = $props<{
        permissions: NonNullable<UserAttributes["effective_permissions"]>;
    }>();
</script>

<div class="space-y-6">
    <!-- Global Permissions -->
    <div
        class="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden"
    >
        <div
            class="px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-2"
        >
            <Shield class="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 class="font-medium text-zinc-900 dark:text-white">
                Globale Berechtigungen
            </h3>
        </div>
        <div class="p-4 space-y-4">
            {#if permissions.global}
                <div class="flex items-center justify-between">
                    <span class="text-sm text-zinc-500 dark:text-zinc-400"
                        >Rolle:</span
                    >
                    <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                    >
                        {permissions.global.roleName}
                    </span>
                </div>
                <div>
                    <span
                        class="text-sm text-zinc-500 dark:text-zinc-400 block mb-2"
                        >Erlaubte Aktionen:</span
                    >
                    {#if permissions.global.permissions.length > 0}
                        <div class="flex flex-wrap gap-2">
                            {#each permissions.global.permissions as perm}
                                <span
                                    class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                                >
                                    <Check class="w-3 h-3" />
                                    {perm}
                                </span>
                            {/each}
                        </div>
                    {:else}
                        <p
                            class="text-sm text-zinc-500 italic dark:text-zinc-500"
                        >
                            Keine spezifischen Rechte zugewiesen.
                        </p>
                    {/if}
                </div>
            {:else}
                <p class="text-sm text-zinc-500 italic">
                    Keine globalen Rollen zugewiesen.
                </p>
            {/if}
        </div>
    </div>

    <!-- Context Permissions -->
    {#if permissions.contexts.length > 0}
        <div
            class="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden"
        >
            <div
                class="px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-2"
            >
                <Users class="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h3 class="font-medium text-zinc-900 dark:text-white">
                    Gruppenberechtigungen
                </h3>
            </div>
            <div class="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                {#each permissions.contexts as ctx}
                    <div class="p-4 space-y-3">
                        <div class="flex items-center justify-between">
                            <h4
                                class="text-sm font-semibold text-zinc-900 dark:text-white"
                            >
                                {ctx.name}
                            </h4>
                            <span
                                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                            >
                                {ctx.roleName}
                            </span>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            {#each ctx.permissions as perm}
                                <span
                                    class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                                >
                                    <Check class="w-3 h-3" />
                                    {perm}
                                </span>
                            {/each}
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>
