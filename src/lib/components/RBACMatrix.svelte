<script lang="ts">
    import type { Role } from "$lib/api/roles";
    import { Check, X, Shield, Lock, Users } from "lucide-svelte";

    let { roles } = $props<{ roles: Role[] }>();

    // Extract all unique permissions from all roles to build rows
    let allPermissions = $derived.by(() => {
        const perms = new Set<string>();
        roles.forEach((r: Role) =>
            r.attributes.permissions.forEach((p: string) => perms.add(p)),
        );
        return Array.from(perms).sort();
    });

    // Group permissions by resource (e.g. 'users', 'events')
    let groupedPermissions = $derived.by(() => {
        const groups: Record<string, string[]> = {};
        allPermissions.forEach((p: string) => {
            const [resource] = p.split(":");
            if (!groups[resource]) groups[resource] = [];
            groups[resource].push(p);
        });
        return groups;
    });

    // Group roles by type (global vs group)
    let globalRoles = $derived(
        roles
            .filter((r: Role) => r.attributes.type === "global")
            .sort((a: Role, b: Role) =>
                a.attributes.name.localeCompare(b.attributes.name),
            ),
    );
    let contextRoles = $derived(
        roles
            .filter((r: Role) => r.attributes.type !== "global")
            .sort((a: Role, b: Role) =>
                a.attributes.name.localeCompare(b.attributes.name),
            ),
    );
</script>

<div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
        <thead class="bg-zinc-50 dark:bg-zinc-800/50">
            <tr>
                <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider sticky left-0 bg-zinc-50 dark:bg-zinc-900 z-10 border-r border-zinc-200 dark:border-zinc-700 shadow-sm"
                >
                    Permission
                </th>
                {#each globalRoles as role}
                    <th
                        scope="col"
                        class="px-3 py-3 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider min-w-[100px]"
                    >
                        <div class="flex flex-col items-center gap-1">
                            <span class="inline-flex items-center gap-1">
                                <Shield class="w-3 h-3 text-blue-500" />
                                {role.attributes.name}
                            </span>
                        </div>
                    </th>
                {/each}
                {#if contextRoles.length > 0}
                    <th
                        scope="col"
                        class="px-1 py-3 text-center border-l border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 w-1"
                    ></th>
                    {#each contextRoles as role}
                        <th
                            scope="col"
                            class="px-3 py-3 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider min-w-[100px]"
                        >
                            <div class="flex flex-col items-center gap-1">
                                <span class="inline-flex items-center gap-1">
                                    <Users class="w-3 h-3 text-amber-500" />
                                    {role.attributes.name} (Grp)
                                </span>
                            </div>
                        </th>
                    {/each}
                {/if}
            </tr>
        </thead>
        <tbody
            class="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-700"
        >
            {#each Object.entries(groupedPermissions) as [resource, perms]}
                <tr class="bg-zinc-50/50 dark:bg-zinc-800/30">
                    <td
                        colspan={globalRoles.length +
                            contextRoles.length +
                            (contextRoles.length > 0 ? 2 : 1)}
                        class="px-6 py-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider sticky left-0 z-10"
                    >
                        Resource: {resource}
                    </td>
                </tr>
                {#each perms as permission}
                    <tr
                        class="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100 sticky left-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-700"
                        >
                            <code
                                class="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-xs font-mono text-pink-600 dark:text-pink-400 border border-zinc-200 dark:border-zinc-700"
                            >
                                {permission}
                            </code>
                        </td>
                        {#each globalRoles as role}
                            <td class="px-3 py-4 whitespace-nowrap text-center">
                                {#if role.attributes.permissions.includes(permission)}
                                    <div class="flex justify-center">
                                        <Check class="w-5 h-5 text-green-500" />
                                    </div>
                                {:else}
                                    <div class="flex justify-center opacity-10">
                                        <div
                                            class="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600"
                                        ></div>
                                    </div>
                                {/if}
                            </td>
                        {/each}
                        {#if contextRoles.length > 0}
                            <td
                                class="px-1 py-4 border-l border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/20"
                            ></td>
                            {#each contextRoles as role}
                                <td
                                    class="px-3 py-4 whitespace-nowrap text-center"
                                >
                                    {#if role.attributes.permissions.includes(permission)}
                                        <div class="flex justify-center">
                                            <Check
                                                class="w-5 h-5 text-green-500"
                                            />
                                        </div>
                                    {:else}
                                        <div
                                            class="flex justify-center opacity-10"
                                        >
                                            <div
                                                class="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600"
                                            ></div>
                                        </div>
                                    {/if}
                                </td>
                            {/each}
                        {/if}
                    </tr>
                {/each}
            {/each}
        </tbody>
    </table>
</div>
