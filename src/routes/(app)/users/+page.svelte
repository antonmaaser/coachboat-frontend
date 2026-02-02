<script lang="ts">
    import { userApi, type UserAttributes } from "$lib/api/users";
    import { auth, hasPermission } from "$lib/stores/auth";
    import Modal from "$lib/components/Modal.svelte";
    // UserForm removed
    import TextInput from "$lib/components/ui/TextInput.svelte";
    import SearchableSelect from "$lib/components/ui/SearchableSelect.svelte";
    import Toggle from "$lib/components/ui/Toggle.svelte";
    import { slide } from "svelte/transition";
    import {
        Users,
        Plus,
        Shield,
        ShieldAlert,
        User as UserIcon,
        EllipsisVertical,
        Copy,
        Check,
        Pencil,
        Trash2,
        KeyRound,
        ArrowUp,
        ArrowDown,
        Loader,
    } from "lucide-svelte";
    import { onMount } from "svelte";
    import { generatePassword } from "$lib/utils";

    let users = $state<any[]>([]);
    let loading = $state(true);

    // Form State (Inlined from UserForm)
    let formName = $state("");
    let formFirstName = $state("");
    let formEmail = $state("");
    let formPassword = $state("");
    let formRoleSlug = $state("user");
    let formIsActive = $state(false);
    let formActiveTab = $state<"details" | "permissions">("details");
    let formFullUser = $state<UserAttributes | null>(null);
    let formLoadingPerms = $state(false);
    let formLoading = $state(false);
    let formError = $state("");

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

    // Form Logic
    async function fetchFormPermissions() {
        if (!editingUser?.id) return;
        formLoadingPerms = true;
        try {
            const res = await userApi.get(editingUser.id);
            if (res.ok) {
                const json = await res.json();
                formFullUser = json.data.attributes;
            }
        } catch (e) {
            console.error(e);
        } finally {
            formLoadingPerms = false;
        }
    }

    $effect(() => {
        // Sync editingUser to form state
        if (showModal) {
            // If editingUser is undefined, it's a create action
            formName = editingUser?.attributes.name || "";
            formFirstName = editingUser?.attributes["first-name"] || "";
            formEmail = editingUser?.attributes.email || "";
            formPassword = ""; // reset
            formRoleSlug = "user"; // default default

            // Role logic
            if (
                editingUser?.attributes.role &&
                typeof editingUser.attributes.role !== "string"
            ) {
                formRoleSlug = editingUser.attributes.role.slug;
            } else if (editingUser) {
                const s = Number(editingUser.attributes.status ?? 1);
                if (s >= 4) formRoleSlug = "admin";
                else if (s === 3) formRoleSlug = "moderator";
                else if (s === 2) formRoleSlug = "user";
                else if (s === 1) formRoleSlug = "group_only";
            }

            formIsActive = editingUser?.attributes["is-active"] ?? false;
            formActiveTab = editingUser?._initialTab || "details";
            formFullUser = null;
        }
    });

    // Watch tab change manually? Or just rely on click handler setting state?
    // If user clicks tab, we need to fetch perms if missing.
    // The click handler sets `formActiveTab`. We can use an effect to watch `formActiveTab`.
    $effect(() => {
        if (
            showModal &&
            formActiveTab === "permissions" &&
            !formFullUser &&
            editingUser?.id
        ) {
            fetchFormPermissions();
        }
    });

    async function handleFormSubmit(e: Event) {
        e.preventDefault();
        formLoading = true;
        formError = "";

        try {
            const attributes: Partial<UserAttributes> = {
                name: formName,
                "first-name": formFirstName,
                email: formEmail,
                role: formRoleSlug,
                "is-active": formIsActive,
            };

            if (!editingUser?.id && formPassword) {
                attributes.password = formPassword;
            }

            let res;
            if (editingUser?.id) {
                res = await userApi.update(editingUser.id, attributes);
            } else {
                if (!formPassword) {
                    attributes.password = "ChangeMe123!";
                }
                res = await userApi.create(attributes as UserAttributes);
            }

            if (!res.ok) {
                const json = await res.json();
                throw new Error(
                    json.errors?.[0]?.detail || "Failed to save user",
                );
            }

            handleSuccess();
        } catch (e: any) {
            formError = e.message;
        } finally {
            formLoading = false;
        }
    }

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

    function openEditModal(
        user: any,
        initialTab: "details" | "permissions" = "details",
    ) {
        // We set _initialTab on the object, but the effect will read it.
        // Or we can just set formActiveTab directly here?
        // The effect runs when `showModal` (or `editingUser`) changes.
        // To be safe, let's keep the object approach or rely on effect logic.
        editingUser = { ...user, _initialTab: initialTab };
        showModal = true;
    }

    function handleSuccess() {
        showModal = false;
        loadUsers();
    }

    onMount(() => {
        loadUsers();
    });

    function getStatusBadge(attrs: any) {
        const role = attrs.role;
        const status = Number(attrs.status);

        if (role) {
            // Use Role-based styling
            switch (role.slug) {
                case "admin":
                    return {
                        label: role.name,
                        color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
                    };
                case "moderator":
                    return {
                        label: role.name,
                        color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
                    };
                case "user":
                    return {
                        label: role.name,
                        color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
                    };
                case "group_only":
                    return {
                        label: role.name,
                        color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
                    };
            }
        }

        // Fallback to legacy status if no role returned
        if (status >= 4)
            return {
                label: "Admin",
                color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
            };
        if (status === 3)
            return {
                label: "Moderator",
                color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
            };
        if (status === 2)
            return {
                label: "Benutzer",
                color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
            };
        if (status === 1)
            return {
                label: "Nur Gruppen",
                color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
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

        {#if hasPermission($auth.user, "users:create")}
            <button
                onclick={openCreateModal}
                class="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/20"
            >
                <Plus class="w-5 h-5" />
                Benutzer hinzufügen
            </button>
        {/if}
    </div>

    <div
        class="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700"
    >
        <div class="overflow-x-auto lg:overflow-visible">
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
                        {#if hasPermission($auth.user, "users:update") || hasPermission($auth.user, "users:delete")}
                            <th class="px-6 py-4 text-right">Actions</th>
                        {/if}
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
                            {@const badge = getStatusBadge(attrs)}
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
                                            <EllipsisVertical class="w-5 h-5" />
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
                                                {#if hasPermission($auth.user, "users:update")}
                                                    <button
                                                        onclick={() => {
                                                            activeMenu = null;
                                                            openEditModal(user);
                                                        }}
                                                        class="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2"
                                                    >
                                                        <Pencil
                                                            class="w-4 h-4"
                                                        />
                                                        Bearbeiten
                                                    </button>
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
                                                    <button
                                                        onclick={() => {
                                                            activeMenu = null;
                                                            openEditModal(
                                                                user,
                                                                "permissions",
                                                            );
                                                        }}
                                                        class="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2"
                                                    >
                                                        <Shield
                                                            class="w-4 h-4"
                                                        />
                                                        Berechtigungen
                                                    </button>
                                                {/if}
                                                {#if hasPermission($auth.user, "users:delete") && user.attributes.status < 1}
                                                    <button
                                                        onclick={() => {
                                                            activeMenu = null;
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
            <div class="space-y-6">
                {#if editingUser?.id}
                    <div
                        class="flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-700"
                    >
                        <button
                            type="button"
                            class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {formActiveTab ===
                            'details'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'}"
                            onclick={() => (formActiveTab = "details")}
                        >
                            Details
                        </button>
                        <button
                            type="button"
                            class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {formActiveTab ===
                            'permissions'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'}"
                            onclick={() => (formActiveTab = "permissions")}
                        >
                            Berechtigungen
                        </button>
                    </div>
                {/if}

                {#if formActiveTab === "details"}
                    <form onsubmit={handleFormSubmit} class="space-y-4">
                        {#if formError}
                            <div
                                class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm"
                            >
                                {formError}
                            </div>
                        {/if}

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <TextInput
                                    id="firstName"
                                    label="First Name"
                                    bind:value={formFirstName}
                                    required
                                />
                            </div>
                            <div>
                                <TextInput
                                    id="name"
                                    label="Last Name"
                                    bind:value={formName}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <TextInput
                                id="email"
                                type="email"
                                label="Email"
                                bind:value={formEmail}
                                required
                            />
                        </div>

                        {#if !editingUser?.id}
                            <div>
                                <TextInput
                                    id="password"
                                    type="password"
                                    label="Initial Password"
                                    bind:value={formPassword}
                                    placeholder="Leave blank for default"
                                />
                                <p class="text-xs text-zinc-500 mt-1">
                                    Default: ChangeMe123!
                                </p>
                            </div>
                        {/if}

                        <div>
                            <SearchableSelect
                                label="Rolle"
                                bind:value={formRoleSlug}
                                options={[
                                    { value: "admin", label: "Administrator" },
                                    { value: "moderator", label: "Moderator" },
                                    { value: "user", label: "Benutzer" },
                                    {
                                        value: "group_only",
                                        label: "Nur Gruppen",
                                    },
                                ]}
                                searchable={false}
                            />
                        </div>

                        <div class="flex items-center gap-2">
                            <Toggle
                                id="isActive"
                                bind:checked={formIsActive}
                                label="Account aktiviert"
                            />
                        </div>

                        <div class="pt-2">
                            <button
                                type="submit"
                                disabled={formLoading}
                                class="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {#if formLoading}
                                    <Loader class="w-4 h-4 animate-spin mr-2" />
                                    Saving...
                                {:else}
                                    {editingUser
                                        ? "Update User"
                                        : "Create User"}
                                {/if}
                            </button>
                        </div>
                    </form>
                {:else}
                    <div>
                        {#if formLoadingPerms}
                            <div class="flex justify-center p-8">
                                <Loader
                                    class="w-8 h-8 animate-spin text-zinc-400"
                                />
                            </div>
                        {:else if formFullUser?.effective_permissions}
                            <!-- Inlined UserPermissions -->
                            {@const permissions =
                                formFullUser.effective_permissions}
                            <div class="space-y-6">
                                <!-- Global Permissions -->
                                <div
                                    class="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden"
                                >
                                    <div
                                        class="px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-2"
                                    >
                                        <Shield
                                            class="w-5 h-5 text-blue-600 dark:text-blue-400"
                                        />
                                        <h3
                                            class="font-medium text-zinc-900 dark:text-white"
                                        >
                                            Globale Berechtigungen
                                        </h3>
                                    </div>
                                    <div class="p-4 space-y-4">
                                        {#if permissions.global}
                                            <div
                                                class="flex items-center justify-between"
                                            >
                                                <span
                                                    class="text-sm text-zinc-500 dark:text-zinc-400"
                                                    >Rolle:</span
                                                >
                                                <span
                                                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                                                >
                                                    {permissions.global
                                                        .roleName}
                                                </span>
                                            </div>
                                            <div>
                                                <span
                                                    class="text-sm text-zinc-500 dark:text-zinc-400 block mb-2"
                                                    >Erlaubte Aktionen:</span
                                                >
                                                {#if permissions.global.permissions.length > 0}
                                                    <div
                                                        class="flex flex-wrap gap-2"
                                                    >
                                                        {#each permissions.global.permissions as perm}
                                                            <span
                                                                class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                                                            >
                                                                <Check
                                                                    class="w-3 h-3"
                                                                />
                                                                {perm}
                                                            </span>
                                                        {/each}
                                                    </div>
                                                {:else}
                                                    <p
                                                        class="text-sm text-zinc-500 italic dark:text-zinc-500"
                                                    >
                                                        Keine spezifischen
                                                        Rechte zugewiesen.
                                                    </p>
                                                {/if}
                                            </div>
                                        {:else}
                                            <p
                                                class="text-sm text-zinc-500 italic"
                                            >
                                                Keine globalen Rollen
                                                zugewiesen.
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
                                            <Users
                                                class="w-5 h-5 text-orange-600 dark:text-orange-400"
                                            />
                                            <h3
                                                class="font-medium text-zinc-900 dark:text-white"
                                            >
                                                Gruppenberechtigungen
                                            </h3>
                                        </div>
                                        <div
                                            class="divide-y divide-zinc-100 dark:divide-zinc-700/50"
                                        >
                                            {#each permissions.contexts as ctx}
                                                <div class="p-4 space-y-3">
                                                    <div
                                                        class="flex items-center justify-between"
                                                    >
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
                                                    <div
                                                        class="flex flex-wrap gap-2"
                                                    >
                                                        {#each ctx.permissions as perm}
                                                            <span
                                                                class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                                                            >
                                                                <Check
                                                                    class="w-3 h-3"
                                                                />
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
                        {:else}
                            <div class="text-center p-8 text-zinc-500">
                                {#if !editingUser?.id}
                                    <!-- Should not happen as tab hidden -->
                                {:else}
                                    Keine Berechtigungen gefunden oder Fehler
                                    beim Laden.
                                {/if}
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
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
