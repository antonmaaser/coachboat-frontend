<script lang="ts">
    import { groupApi, type GroupAttributes } from "$lib/api/groups";
    import { auth, hasPermission } from "$lib/stores/auth";
    import Modal from "$lib/components/Modal.svelte";
    // GroupForm removed
    import TextInput from "$lib/components/ui/TextInput.svelte";
    import SearchableSelect from "$lib/components/ui/SearchableSelect.svelte";
    import {
        Users,
        Plus,
        MoreVertical,
        Pencil,
        Trash2,
        Eye,
        EyeOff,
        Shield,
        UserPlus,
        Loader2,
    } from "lucide-svelte";
    import GroupMembersModal from "$lib/components/GroupMembersModal.svelte";
    import { onMount } from "svelte";

    let groups = $state<any[]>([]);
    let loading = $state(true);

    let showModal = $state(false);
    let editingGroup = $state<any>(undefined);
    let activeMenu = $state<string | null>(null);

    let showMembersModal = $state(false);
    let selectedGroupForMembers = $state<any>(undefined);

    // Form State
    let formTitle = $state("");
    let formDescription = $state("");
    let formVisibility = $state("all");
    let formLoading = $state(false);
    let formError = $state("");

    $effect(() => {
        if (showModal) {
            formTitle = editingGroup?.attributes.title || "";
            formDescription = editingGroup?.attributes.description || "";
            formVisibility = editingGroup?.attributes.visibility || "all";
            formError = "";
            formLoading = false;
        }
    });

    async function handleFormSubmit(e: Event) {
        e.preventDefault();
        formLoading = true;
        formError = "";

        try {
            const attributes: Partial<GroupAttributes> = {
                title: formTitle,
                description: formDescription,
                visibility: formVisibility as "all" | "hidden",
            };

            let res;
            if (editingGroup?.id) {
                res = await groupApi.update(editingGroup.id, attributes);
            } else {
                res = await groupApi.create(attributes as GroupAttributes);
            }

            if (!res.ok) {
                const json = await res.json();
                throw new Error(
                    json.errors?.[0]?.detail || "Failed to save group",
                );
            }

            handleSuccess();
        } catch (e: any) {
            formError = e.message;
        } finally {
            formLoading = false;
        }
    }

    async function loadGroups() {
        loading = true;
        try {
            const res = await groupApi.list();
            if (res.ok) {
                const json = await res.json();
                groups = json.data || json;
            }
        } catch (e) {
            console.error(e);
        } finally {
            loading = false;
        }
    }

    function openCreateModal() {
        editingGroup = undefined;
        showModal = true;
    }

    function openEditModal(group: any) {
        editingGroup = group;
        showModal = true;
    }

    async function handleDeleteGroup(group: any) {
        if (
            !confirm(
                `Are you sure you want to delete group "${group.attributes.title}"?`,
            )
        )
            return;

        try {
            const res = await groupApi.delete(group.id);
            if (res.ok) {
                loadGroups();
            } else {
                alert("Failed to delete group");
            }
        } catch (e) {
            console.error(e);
            alert("Error deleting group");
        }
    }

    function handleSuccess() {
        showModal = false;
        loadGroups();
    }

    onMount(() => {
        loadGroups();
    });

    function getVisibilityBadge(visibility: string) {
        switch (visibility) {
            case "all":
                return {
                    label: "Für Alle",
                    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
                    icon: Eye,
                };
            case "admin":
                return {
                    label: "Admins",
                    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
                    icon: Shield,
                };
            case "none":
                return {
                    label: "Nicht sichtbar",
                    color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
                    icon: EyeOff,
                };
            default:
                return {
                    label: visibility,
                    color: "bg-gray-100 text-gray-700",
                    icon: Eye,
                };
        }
    }

    // isAdmin removed in favor of granular permissions
</script>

<div class="space-y-6">
    <div class="flex flex-col md:flex-row items-center justify-between gap-4">
        <h1
            class="text-2xl font-bold text-zinc-900 dark:text-white w-full md:w-auto"
        >
            Gruppen
        </h1>

        {#if hasPermission($auth.user, "groups:create")}
            <button
                onclick={openCreateModal}
                class="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/20"
            >
                <Plus class="w-5 h-5" />
                Gruppe erstellen
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
                        <th class="px-6 py-4">Name</th>
                        <th class="px-6 py-4">Beschreibung</th>
                        <th class="px-6 py-4">Sichtbarkeit</th>
                        <th class="px-6 py-4 text-right">Aktionen</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                    {#if loading}
                        <tr
                            ><td colspan="4" class="p-8 text-center">Lädt...</td
                            ></tr
                        >
                    {:else if groups.length === 0}
                        <tr
                            ><td
                                colspan="4"
                                class="p-8 text-center text-zinc-500"
                                >Keine Gruppen gefunden.</td
                            ></tr
                        >
                    {:else}
                        {#each groups as group}
                            {@const attrs = group.attributes}
                            {@const badge = getVisibilityBadge(
                                attrs.visibility,
                            )}
                            <tr
                                class="hover:bg-zinc-50 dark:hover:bg-zinc-700/20 transition-colors group"
                            >
                                <td
                                    class="px-6 py-4 font-medium text-zinc-900 dark:text-white"
                                >
                                    <a
                                        href="/groups/{group.id}"
                                        class="hover:underline hover:text-blue-600 dark:hover:text-blue-400"
                                    >
                                        {attrs.title}
                                    </a>
                                </td>
                                <td
                                    class="px-6 py-4 text-zinc-600 dark:text-zinc-400 max-w-xs truncate"
                                >
                                    {attrs.description || "-"}
                                </td>
                                <td class="px-6 py-4">
                                    <span
                                        class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium {badge.color}"
                                    >
                                        <badge.icon class="w-3 h-3" />
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
                                                    activeMenu === group.id
                                                        ? null
                                                        : group.id)}
                                            class="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                        >
                                            <MoreVertical class="w-5 h-5" />
                                        </button>

                                        {#if activeMenu === group.id}
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
                                                <a
                                                    href="/groups/{group.id}"
                                                    onclick={() =>
                                                        (activeMenu = null)}
                                                    class="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2"
                                                >
                                                    <Eye class="w-4 h-4" />
                                                    Öffnen
                                                </a>
                                                {#if hasPermission($auth.user, "groups:read", group.id) || hasPermission($auth.user, "groups:update:any", group.id)}
                                                    <button
                                                        onclick={() => {
                                                            activeMenu = null;
                                                            selectedGroupForMembers =
                                                                group;
                                                            showMembersModal = true;
                                                        }}
                                                        class="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2"
                                                    >
                                                        <UserPlus class="w-4 h-4" />
                                                        Mitglieder
                                                    </button>
                                                {/if}
                                                {#if hasPermission($auth.user, "groups:update:any", group.id)}
                                                    <button
                                                        onclick={() => {
                                                            activeMenu = null;
                                                            openEditModal(
                                                                group,
                                                            );
                                                        }}
                                                        class="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-700"
                                                    >
                                                        <Pencil
                                                            class="w-4 h-4"
                                                        />
                                                        Bearbeiten
                                                    </button>
                                                {/if}
                                                {#if hasPermission($auth.user, "groups:delete:any", group.id)}
                                                    <button
                                                        onclick={() => {
                                                            activeMenu = null;
                                                            handleDeleteGroup(
                                                                group,
                                                            );
                                                        }}
                                                        class="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm text-red-600 dark:text-red-400 flex items-center gap-2"
                                                    >
                                                        <Trash2
                                                            class="w-4 h-4"
                                                        />
                                                        Löschen
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
        title={editingGroup ? "Gruppe bearbeiten" : "Gruppe erstellen"}
    >
        {#key editingGroup?.id || "new"}
            <form onsubmit={handleFormSubmit} class="space-y-4">
                {#if formError}
                    <div
                        class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm"
                    >
                        {formError}
                    </div>
                {/if}

                <TextInput
                    id="title"
                    label="Name"
                    bind:value={formTitle}
                    required
                />

                <TextInput
                    id="description"
                    label="Description"
                    bind:value={formDescription}
                    multiline
                    rows={3}
                />

                <div>
                    <SearchableSelect
                        label="Visibility"
                        bind:value={formVisibility}
                        options={[
                            { value: "all", label: "Für Alle" },
                            { value: "hidden", label: "Versteckt" },
                        ]}
                        searchable={false}
                    />
                </div>

                <div class="pt-2">
                    <button
                        type="submit"
                        disabled={formLoading}
                        class="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {#if formLoading}
                            <Loader2 class="w-4 h-4 animate-spin mr-2" />
                            Saving...
                        {:else}
                            {editingGroup ? "Update Group" : "Create Group"}
                        {/if}
                    </button>
                </div>
            </form>
        {/key}
    </Modal>

    {#if showMembersModal && selectedGroupForMembers}
        <GroupMembersModal
            group={selectedGroupForMembers}
            bind:show={showMembersModal}
        />
    {/if}
</div>
