<script lang="ts">
    import { onMount } from "svelte";
    import { rolesApi, type Role } from "$lib/api/roles";
    import {
        LoaderCircle,
        ShieldAlert,
        Check,
        Shield,
        Users,
    } from "lucide-svelte";

    import type { JSONAPIResponse } from "$lib/api/types";

    let loading = $state(true);
    let error = $state<string | null>(null);
    let roles = $state<Role[]>([]);

    function normalizePermissions(value: unknown): string[] {
        let parsed = value;
        if (typeof parsed === "string") {
            try {
                parsed = JSON.parse(parsed);
            } catch {
                return [];
            }
        }
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((permission): permission is string =>
            typeof permission === "string"
        );
    }

    function normalizeRole(role: Role): Role {
        return {
            ...role,
            attributes: {
                ...role.attributes,
                permissions: normalizePermissions(role.attributes.permissions),
            },
        };
    }

    onMount(async () => {
        try {
            const res = await rolesApi.getAll();
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                    throw new Error(
                        err.errors?.[0]?.detail ||
                            err.errors?.[0]?.title ||
                            `Fehler: ${res.statusText}`,
                    );
            }
            const json: JSONAPIResponse<Role[]> = await res.json();
            roles = (json.data || []).map(normalizeRole);
        } catch (e: any) {
            console.error(e);
            error = e.message;
        } finally {
            loading = false;
        }
    });

    // RBAC Logic Inlined
    let allPermissions = $derived.by(() => {
        const perms = new Set<string>();
        roles.forEach((r: Role) =>
            r.attributes.permissions.forEach((p: string) => perms.add(p)),
        );
        return Array.from(perms).sort();
    });

    let groupedPermissions = $derived.by(() => {
        const groups: Record<string, string[]> = {};
        allPermissions.forEach((p: string) => {
            const [resource] = p.split(":");
            if (!groups[resource]) groups[resource] = [];
            groups[resource].push(p);
        });
        return groups;
    });

    let hasMatrixData = $derived(allPermissions.length > 0);

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
            <LoaderCircle class="w-8 h-8 text-blue-600 animate-spin" />
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
        {#if hasMatrixData}
            <div
                class="bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
                <div class="overflow-x-auto">
                    <table
                        class="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700"
                    >
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
                                        <div
                                            class="flex flex-col items-center gap-1"
                                        >
                                            <span
                                                class="inline-flex items-center gap-1"
                                            >
                                                <Shield
                                                    class="w-3 h-3 text-blue-500"
                                                />
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
                                            <div
                                                class="flex flex-col items-center gap-1"
                                            >
                                                <span
                                                    class="inline-flex items-center gap-1"
                                                >
                                                    <Users
                                                        class="w-3 h-3 text-amber-500"
                                                    />
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
                                            <td
                                                class="px-3 py-4 whitespace-nowrap text-center"
                                            >
                                                {#if role.attributes.permissions.includes(permission)}
                                                    <div
                                                        class="flex justify-center"
                                                    >
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
                                        {#if contextRoles.length > 0}
                                            <td
                                                class="px-1 py-4 border-l border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/20"
                                            ></td>
                                            {#each contextRoles as role}
                                                <td
                                                    class="px-3 py-4 whitespace-nowrap text-center"
                                                >
                                                    {#if role.attributes.permissions.includes(permission)}
                                                        <div
                                                            class="flex justify-center"
                                                        >
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
            </div>
        {:else}
            <div
                class="rounded-md bg-amber-50 dark:bg-amber-900/20 p-4 border border-amber-200 dark:border-amber-800"
            >
                <p class="text-sm text-amber-800 dark:text-amber-200">
                    Keine Berechtigungen gefunden. Die Rollen sind geladen, aber
                    enthalten derzeit keine `permissions`.
                </p>
            </div>
        {/if}
    {/if}
</div>
