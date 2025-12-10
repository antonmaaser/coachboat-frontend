<script lang="ts">
    import { userApi } from "$lib/api/users";
    import { auth } from "$lib/stores/auth";
    import Modal from "$lib/components/Modal.svelte";
    import UserForm from "$lib/components/UserForm.svelte";
    import {
        Users,
        Plus,
        Shield,
        ShieldAlert,
        User as UserIcon,
        MoreVertical,
        Copy,
        Check,
        Pencil,
        Trash2,
        KeyRound,
        ArrowUp,
        ArrowDown,
    } from "lucide-svelte";
    import { onMount } from "svelte";
    import { generatePassword } from "$lib/utils";

    let users = $state<any[]>([]);
    let loading = $state(true);

    // Sorting state
    let sortField = $state("name"); // 'name', 'email', 'status'
    let sortDirection = $state<"asc" | "desc">("asc");

    let sortedUsers = $derived.by(() => {
        return [...users].sort((a, b) => {
            let valA, valB;

            if (sortField === "name") {
                valA =
                    `${a.attributes["first-name"]} ${a.attributes.name}`.toLowerCase();
                valB =
                    `${b.attributes["first-name"]} ${b.attributes.name}`.toLowerCase();
            } else if (sortField === "email") {
                valA = a.attributes.email.toLowerCase();
                valB = b.attributes.email.toLowerCase();
            } else if (sortField === "status") {
                valA = a.attributes.status;
                valB = b.attributes.status;
            }

            if (valA < valB) return sortDirection === "asc" ? -1 : 1;
            if (valA > valB) return sortDirection === "asc" ? 1 : -1;
            return 0;
        });
    });

    function toggleSort(field: string) {
        if (sortField === field) {
            sortDirection = sortDirection === "asc" ? "desc" : "asc";
        } else {
            sortField = field;
            sortDirection = "asc";
        }
    }
    let showModal = $state(false);
    let editingUser = $state<any>(undefined);
    let activeMenu = $state<string | null>(null);

    let showPasswordModal = $state(false);
    let newPassword = $state("");
    let recentlyCopied = $state(false);

    async function handleResetPassword(user: any) {
        if (
            !confirm(
                `Reset password for ${user.attributes["first-name"]} ${user.attributes.name}?`,
            )
        )
            return;

        const pwd = generatePassword(12);
        try {
            const res = await userApi.update(user.id, { password: pwd });
            if (res.ok) {
                newPassword = pwd;
                showPasswordModal = true;
            } else {
                alert("Failed to reset password");
            }
        } catch (e) {
            console.error(e);
            alert("Error resetting password");
        }
    }

    async function handleDeleteUser(user: any) {
        if (
            !confirm(
                `Are you sure you want to delete ${user.attributes["first-name"]} ${user.attributes.name}? This action cannot be undone.`,
            )
        )
            return;

        try {
            const res = await userApi.delete(user.id);
            if (res.ok) {
                loadUsers();
            } else {
                alert("Failed to delete user");
            }
        } catch (e) {
            console.error(e);
            alert("Error deleting user");
        }
    }

    function copyToClipboard() {
        navigator.clipboard.writeText(newPassword);
        recentlyCopied = true;
        setTimeout(() => (recentlyCopied = false), 2000);
    }

    // Only admins can see this page content ideally, but API protects it too.
    // Sidebar hides link.

    async function loadUsers() {
        loading = true;
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
    }

    function openCreateModal() {
        editingUser = undefined;
        showModal = true;
    }

    function openEditModal(user: any) {
        editingUser = user;
        showModal = true;
    }

    function handleSuccess() {
        showModal = false;
        loadUsers();
    }

    onMount(() => {
        loadUsers();
    });

    function getStatusBadge(status: number) {
        if (status >= 3)
            return {
                label: "Admin",
                color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
            };
        if (status >= 1)
            return {
                label: "Aktiviert",
                color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
            };
        return {
            label: "Deaktiviert",
            color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
        };
    }
</script>

<div class="space-y-6">
    <div class="flex flex-col md:flex-row items-center justify-between gap-4">
        <h1
            class="text-2xl font-bold text-zinc-900 dark:text-white w-full md:w-auto"
        >
            Benutzer
        </h1>

        <button
            onclick={openCreateModal}
            class="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/20"
        >
            <Plus class="w-5 h-5" />
            Benutzer hinzufügen
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
                        <th class="px-6 py-4">
                            <button
                                onclick={() => toggleSort("name")}
                                class="flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                            >
                                Name
                                {#if sortField === "name"}
                                    {#if sortDirection === "asc"}
                                        <ArrowUp class="w-4 h-4" />
                                    {:else}
                                        <ArrowDown class="w-4 h-4" />
                                    {/if}
                                {/if}
                            </button>
                        </th>
                        <th class="px-6 py-4">
                            <button
                                onclick={() => toggleSort("email")}
                                class="flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                            >
                                E-Mail
                                {#if sortField === "email"}
                                    {#if sortDirection === "asc"}
                                        <ArrowUp class="w-4 h-4" />
                                    {:else}
                                        <ArrowDown class="w-4 h-4" />
                                    {/if}
                                {/if}
                            </button>
                        </th>
                        <th class="px-6 py-4">
                            <button
                                onclick={() => toggleSort("status")}
                                class="flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                            >
                                Status
                                {#if sortField === "status"}
                                    {#if sortDirection === "asc"}
                                        <ArrowUp class="w-4 h-4" />
                                    {:else}
                                        <ArrowDown class="w-4 h-4" />
                                    {/if}
                                {/if}
                            </button>
                        </th>
                        <th class="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                    {#if loading}
                        <tr
                            ><td colspan="4" class="p-8 text-center">Lädt...</td
                            ></tr
                        >
                    {:else if users.length === 0}
                        <tr
                            ><td
                                colspan="4"
                                class="p-8 text-center text-zinc-500"
                                >Keine Benutzer gefunden.</td
                            ></tr
                        >
                    {:else}
                        {#each sortedUsers as user}
                            {@const attrs = user.attributes}
                            {@const badge = getStatusBadge(attrs.status)}
                            <tr
                                class="hover:bg-zinc-50 dark:hover:bg-zinc-700/20 transition-colors group"
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
                                            >{attrs["first-name"]}
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
                                    <div
                                        class="relative inline-block text-left"
                                    >
                                        <button
                                            onclick={() =>
                                                (activeMenu =
                                                    activeMenu === user.id
                                                        ? null
                                                        : user.id)}
                                            class="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                        >
                                            <MoreVertical class="w-5 h-5" />
                                        </button>

                                        {#if activeMenu === user.id}
                                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                                            <div
                                                class="fixed inset-0 z-10"
                                                onclick={() =>
                                                    (activeMenu = null)}
                                            ></div>
                                            <div
                                                class="absolute right-0 z-20 mt-2 w-48 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden transform origin-top-right transition-all"
                                            >
                                                <button
                                                    onclick={() => {
                                                        activeMenu = null;
                                                        openEditModal(user);
                                                    }}
                                                    class="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2"
                                                >
                                                    <Pencil class="w-4 h-4" />
                                                    Bearbeiten
                                                </button>
                                                {#if $auth.user?.status && $auth.user.status >= 3}
                                                    <button
                                                        onclick={() => {
                                                            activeMenu = null;
                                                            handleResetPassword(
                                                                user,
                                                            );
                                                        }}
                                                        class="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2"
                                                    >
                                                        <KeyRound
                                                            class="w-4 h-4"
                                                        />
                                                        Passwort zurücksetzen
                                                    </button>
                                                    {#if user.attributes.status < 1}
                                                        <button
                                                            onclick={() => {
                                                                activeMenu =
                                                                    null;
                                                                handleDeleteUser(
                                                                    user,
                                                                );
                                                            }}
                                                            class="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm text-red-600 dark:text-red-400 flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-700"
                                                        >
                                                            <Trash2
                                                                class="w-4 h-4"
                                                            />
                                                            Benutzer löschen
                                                        </button>
                                                    {/if}
                                                {/if}
                                            </div>
                                        {/if}
                                    </div>
                                </td>
                            </tr>
                        {/each}
                    {/if}
                </tbody>
            </table>
        </div>
    </div>

    <Modal
        bind:show={showModal}
        title={editingUser ? "Benutzer bearbeiten" : "Benutzer hinzufügen"}
    >
        {#key editingUser?.id || "new"}
            <UserForm user={editingUser} onSuccess={handleSuccess} />
        {/key}
    </Modal>

    <Modal bind:show={showPasswordModal} title="Passwort zurückgesetzt">
        <div class="space-y-4">
            <p class="text-zinc-600 dark:text-zinc-400">
                Passwort wurde erfolgreich zurückgesetzt. Bitte kopieren Sie es
                jetzt, es wird nicht mehr angezeigt.
            </p>
            <div class="relative">
                <div
                    class="w-full p-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg font-mono text-lg text-center break-all border border-zinc-200 dark:border-zinc-700 select-all"
                >
                    {newPassword}
                </div>
                <button
                    onclick={copyToClipboard}
                    class="absolute right-2 top-2 p-2 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-500"
                    title="Copy to clipboard"
                >
                    {#if recentlyCopied}
                        <Check class="w-5 h-5 text-green-500" />
                    {:else}
                        <Copy class="w-5 h-5" />
                    {/if}
                </button>
            </div>
            <div class="flex justify-end pt-2">
                <button
                    onclick={() => (showPasswordModal = false)}
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                >
                    Fertig
                </button>
            </div>
        </div>
    </Modal>
</div>
