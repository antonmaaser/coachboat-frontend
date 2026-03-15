<script lang="ts">
    import { userApi, type UserAttributes } from "$lib/api/users";
    import { auth, hasPermission } from "$lib/stores/auth";
    import Modal from "$lib/components/Modal.svelte";
    // UserForm removed
    import TextInput from "$lib/components/ui/TextInput.svelte";
    import SearchableSelect from "$lib/components/ui/SearchableSelect.svelte";
    import Toggle from "$lib/components/ui/Toggle.svelte";
    import Button from "$lib/components/ui/Button.svelte";
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
                    json.errors?.[0]?.detail ||
                        "Benutzer konnte nicht gespeichert werden",
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
                `Passwort für ${user.attributes["first-name"]} ${user.attributes.name} zurücksetzen?`,
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
                alert("Passwort konnte nicht zurückgesetzt werden");
            }
        } catch (e) {
            console.error(e);
            alert("Fehler beim Zurücksetzen des Passworts");
        }
    }

    async function handleDeleteUser(user: any) {
        if (
            !confirm(
                `Möchten Sie ${user.attributes["first-name"]} ${user.attributes.name} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
            )
        )
            return;

        try {
            const res = await userApi.delete(user.id);
            if (res.ok) {
                loadUsers();
            } else {
                alert("Benutzer konnte nicht gelöscht werden");
            }
        } catch (e) {
            console.error(e);
            alert("Fehler beim Löschen des Benutzers");
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

    type PermissionGroup = {
        resource: string;
        actions: string[];
    };

    function groupPermissionsByResource(
        permissionList: string[] = [],
    ): PermissionGroup[] {
        const groups = new Map<string, Set<string>>();

        for (const permission of permissionList) {
            if (typeof permission !== "string") continue;
            const normalized = permission.trim();
            if (!normalized) continue;

            const [resourceRaw, ...actionParts] = normalized.split(":");
            const resource = resourceRaw?.trim() || "unknown";
            const action = actionParts.join(":").trim() || "*";

            if (!groups.has(resource)) groups.set(resource, new Set<string>());
            groups.get(resource)?.add(action);
        }

        return Array.from(groups.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([resource, actions]) => ({
                resource,
                actions: Array.from(actions).sort((a, b) => a.localeCompare(b)),
            }));
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
            <Button
                variant="solid"
                tone="primary"
                width="full-mobile"
                elevated
                onclick={openCreateModal}
            >
                <Plus class="w-5 h-5" />
                Benutzer hinzufügen
            </Button>
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
                            <Button
                                variant="ghost"
                                tone="neutral"
                                size="sm"
                                align="left"
                                onclick={() => toggleSort("name")}
                            >
                                Name
                                {#if sortField === "name"}
                                    {#if sortDirection === "asc"}
                                        <ArrowUp class="w-4 h-4" />
                                    {:else}
                                        <ArrowDown class="w-4 h-4" />
                                    {/if}
                                {/if}
                            </Button>
                        </th>
                        <th class="px-6 py-4">
                            <Button
                                variant="ghost"
                                tone="neutral"
                                size="sm"
                                align="left"
                                onclick={() => toggleSort("email")}
                            >
                                E-Mail
                                {#if sortField === "email"}
                                    {#if sortDirection === "asc"}
                                        <ArrowUp class="w-4 h-4" />
                                    {:else}
                                        <ArrowDown class="w-4 h-4" />
                                    {/if}
                                {/if}
                            </Button>
                        </th>
                        <th class="px-6 py-4">
                            <Button
                                variant="ghost"
                                tone="neutral"
                                size="sm"
                                align="left"
                                onclick={() => toggleSort("status")}
                            >
                                Status
                                {#if sortField === "status"}
                                    {#if sortDirection === "asc"}
                                        <ArrowUp class="w-4 h-4" />
                                    {:else}
                                        <ArrowDown class="w-4 h-4" />
                                    {/if}
                                {/if}
                            </Button>
                        </th>
                        {#if hasPermission($auth.user, "users:update") || hasPermission($auth.user, "users:delete")}
                            <th class="px-6 py-4 text-right">Aktionen</th>
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
                                        <Button
                                            variant="icon"
                                            tone="neutral"
                                            iconOnly
                                            ariaLabel="Benutzeroptionen"
                                            onclick={() =>
                                                (activeMenu =
                                                    activeMenu === user.id
                                                        ? null
                                                        : user.id)}
                                        >
                                            <EllipsisVertical class="w-5 h-5" />
                                        </Button>

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
                                                    <Button
                                                        variant="menu"
                                                        tone="neutral"
                                                        align="left"
                                                        onclick={() => {
                                                            activeMenu = null;
                                                            openEditModal(user);
                                                        }}
                                                    >
                                                        <Pencil
                                                            class="w-4 h-4"
                                                        />
                                                        Bearbeiten
                                                    </Button>
                                                    <Button
                                                        variant="menu"
                                                        tone="neutral"
                                                        align="left"
                                                        onclick={() => {
                                                            activeMenu = null;
                                                            handleResetPassword(
                                                                user,
                                                            );
                                                        }}
                                                    >
                                                        <KeyRound
                                                            class="w-4 h-4"
                                                        />
                                                        Passwort zurücksetzen
                                                    </Button>
                                                    <Button
                                                        variant="menu"
                                                        tone="neutral"
                                                        align="left"
                                                        onclick={() => {
                                                            activeMenu = null;
                                                            openEditModal(
                                                                user,
                                                                "permissions",
                                                            );
                                                        }}
                                                    >
                                                        <Shield
                                                            class="w-4 h-4"
                                                        />
                                                        Berechtigungen
                                                    </Button>
                                                {/if}
                                                {#if hasPermission($auth.user, "users:delete") && user.attributes.status < 1}
                                                    <Button
                                                        variant="menu"
                                                        tone="danger"
                                                        align="left"
                                                        dividerTop
                                                        onclick={() => {
                                                            activeMenu = null;
                                                            handleDeleteUser(
                                                                user,
                                                            );
                                                        }}
                                                    >
                                                        <Trash2
                                                            class="w-4 h-4"
                                                        />
                                                        Benutzer löschen
                                                    </Button>
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
                        <Button
                            variant="tab"
                            active={formActiveTab === "details"}
                            type="button"
                            onclick={() => (formActiveTab = "details")}
                        >
                            Details
                        </Button>
                        <Button
                            variant="tab"
                            active={formActiveTab === "permissions"}
                            type="button"
                            onclick={() => (formActiveTab = "permissions")}
                        >
                            Berechtigungen
                        </Button>
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
                                    label="Vorname"
                                    bind:value={formFirstName}
                                    required
                                />
                            </div>
                            <div>
                                <TextInput
                                    id="name"
                                    label="Nachname"
                                    bind:value={formName}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <TextInput
                                id="email"
                                type="email"
                                label="E-Mail"
                                bind:value={formEmail}
                                required
                            />
                        </div>

                        {#if !editingUser?.id}
                            <div>
                                <TextInput
                                    id="password"
                                    type="password"
                                    label="Startpasswort"
                                    bind:value={formPassword}
                                    placeholder="Leer lassen für Standardwert"
                                />
                                <p class="text-xs text-zinc-500 mt-1">
                                    Standard: ChangeMe123!
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
                                label="Konto aktiviert"
                            />
                        </div>

                        <div class="pt-2">
                            <Button
                                variant="solid"
                                tone="primary"
                                width="full"
                                type="submit"
                                disabled={formLoading}
                            >
                                {#if formLoading}
                                    <Loader class="w-4 h-4 animate-spin mr-2" />
                                    Speichern...
                                {:else}
                                    {editingUser
                                        ? "Benutzer aktualisieren"
                                        : "Benutzer erstellen"}
                                {/if}
                            </Button>
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
                                                <div class="space-y-3">
                                                    {#each groupPermissionsByResource(permissions.global.permissions) as group}
                                                        <div
                                                            class="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3"
                                                        >
                                                            <p
                                                                class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                                                            >
                                                                {group.resource}
                                                            </p>
                                                            <div
                                                                class="mt-2 flex flex-wrap gap-2"
                                                            >
                                                                {#each group.actions as action}
                                                                    <span
                                                                        class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                                                                    >
                                                                        <Check
                                                                            class="w-3 h-3"
                                                                        />
                                                                        {action}
                                                                    </span>
                                                                {/each}
                                                            </div>
                                                        </div>
                                                    {:else}
                                                        <p
                                                            class="text-sm text-zinc-500 italic dark:text-zinc-500"
                                                        >
                                                            Keine spezifischen
                                                            Rechte zugewiesen.
                                                        </p>
                                                    {/each}
                                                </div>
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
                                                    <div class="space-y-3">
                                                        {#each groupPermissionsByResource(ctx.permissions) as group}
                                                            <div
                                                                class="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3"
                                                            >
                                                                <p
                                                                    class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                                                                >
                                                                    {group.resource}
                                                                </p>
                                                                <div
                                                                    class="mt-2 flex flex-wrap gap-2"
                                                                >
                                                                    {#each group.actions as action}
                                                                        <span
                                                                            class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                                                                        >
                                                                            <Check
                                                                                class="w-3 h-3"
                                                                            />
                                                                            {action}
                                                                        </span>
                                                                    {/each}
                                                                </div>
                                                            </div>
                                                        {:else}
                                                            <p
                                                                class="text-sm text-zinc-500 italic dark:text-zinc-500"
                                                            >
                                                                Keine
                                                                spezifischen
                                                                Rechte
                                                                zugewiesen.
                                                            </p>
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
                <div class="absolute right-2 top-2">
                    <Button
                        variant="icon"
                        tone="neutral"
                        iconOnly
                        ariaLabel="In Zwischenablage kopieren"
                        onclick={copyToClipboard}
                        title="In Zwischenablage kopieren"
                    >
                        {#if recentlyCopied}
                            <Check class="w-5 h-5 text-green-500" />
                        {:else}
                            <Copy class="w-5 h-5" />
                        {/if}
                    </Button>
                </div>
            </div>
            <div class="flex justify-end pt-2">
                <Button
                    variant="solid"
                    tone="primary"
                    onclick={() => (showPasswordModal = false)}
                >
                    Fertig
                </Button>
            </div>
        </div>
    </Modal>
</div>
