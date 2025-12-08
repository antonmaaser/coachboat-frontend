<script lang="ts">
    import { userApi } from "$lib/api/users";
    import { auth } from "$lib/stores/auth";
    import {
        Users,
        Plus,
        Shield,
        ShieldAlert,
        User as UserIcon,
    } from "lucide-svelte";
    import { onMount } from "svelte";

    let users = $state<any[]>([]);
    let loading = $state(true);

    // Only admins can see this page content ideally, but API protects it too.
    // Sidebar hides link.

    onMount(async () => {
        try {
            const res = await userApi.list();
            if (res.ok) {
                const json = await res.json();
                users = json.data || json;
            }
        } catch (e) {
            console.error(e);
        } finally {
            loading = false;
        }
    });

    function getStatusBadge(status: number) {
        if (status >= 3)
            return {
                label: "Admin",
                color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
            };
        if (status >= 1)
            return {
                label: "Active",
                color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
            };
        return {
            label: "Inactive",
            color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
        };
    }
</script>

<div class="space-y-6">
    <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">Users</h1>

        <button
            onclick={() => alert("Invite feature coming soon!")}
            class="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/20"
        >
            <Plus class="w-5 h-5" />
            Invite User
        </button>
    </div>

    <div
        class="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden"
    >
        <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
                <thead
                    class="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 font-medium border-b border-zinc-200 dark:border-zinc-700"
                >
                    <tr>
                        <th class="px-6 py-4">User</th>
                        <th class="px-6 py-4">Email</th>
                        <th class="px-6 py-4">Status</th>
                        <th class="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                    {#if loading}
                        <tr
                            ><td colspan="4" class="p-8 text-center"
                                >Loading...</td
                            ></tr
                        >
                    {:else if users.length === 0}
                        <tr
                            ><td
                                colspan="4"
                                class="p-8 text-center text-zinc-500"
                                >No users found.</td
                            ></tr
                        >
                    {:else}
                        {#each users as user}
                            {@const attrs = user.attributes}
                            {@const badge = getStatusBadge(attrs.status)}
                            <tr
                                class="hover:bg-zinc-50 dark:hover:bg-zinc-700/20 transition-colors"
                            >
                                <td class="px-6 py-4">
                                    <div class="flex items-center gap-3">
                                        <div
                                            class="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400"
                                        >
                                            <UserIcon class="w-4 h-4" />
                                        </div>
                                        <span
                                            class="font-medium text-zinc-900 dark:text-white"
                                            >{attrs.first_name}
                                            {attrs.name}</span
                                        >
                                    </div>
                                </td>
                                <td
                                    class="px-6 py-4 text-zinc-600 dark:text-zinc-400"
                                    >{attrs.email}</td
                                >
                                <td class="px-6 py-4">
                                    <span
                                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {badge.color}"
                                    >
                                        {badge.label}
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-right">
                                    <button
                                        onclick={() =>
                                            alert("Edit feature coming soon!")}
                                        class="text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                                    >
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        {/each}
                    {/if}
                </tbody>
            </table>
        </div>
    </div>
</div>
