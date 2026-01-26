<script lang="ts">
    import { groupApi } from "$lib/api/groups";
    import { userApi } from "$lib/api/users";
    import { auth, hasPermission } from "$lib/stores/auth";
    import {
        Loader2,
        UserPlus,
        Trash2,
        Shield,
        User,
        Ear,
        X,
        MoreVertical,
        Check,
    } from "lucide-svelte";
    import { onMount } from "svelte";
    import SearchableSelect from "$lib/components/ui/SearchableSelect.svelte";
    import { portal } from "$lib/actions/portal";

    let { group, show = $bindable(false) } = $props<{
        group: any;
        show: boolean;
    }>();

    let loading = $state(false);
    let members = $state<any[]>([]);
    let allUsers = $state<any[]>([]);
    let error = $state("");

    // Add Member Form State
    let selectedUserId = $state("");
    let selectedRole = $state<string>("");

    let addingMember = $state(false);

    // Menu State
    let activeMenu = $state<string | null>(null);
    let menuPosition = $state({ x: 0, y: 0 });
    const activeMember = $derived(members.find((m) => m.id === activeMenu));

    function toggleMenu(e: MouseEvent, memberId: string) {
        if (activeMenu === memberId) {
            activeMenu = null;
            return;
        }

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        // Position: Top = button bottom, Right aligned = button right
        menuPosition = {
            x: rect.right,
            y: rect.bottom + 5,
        };
        activeMenu = memberId;
    }

    // Close menu on scroll to prevent detachment
    function handleScroll() {
        if (activeMenu) activeMenu = null;
    }

    // Close menu on scroll to prevent detachment

    async function loadData() {
        if (!group?.id) return;
        loading = true;
        error = "";

        try {
            // Fetch group details to get members
            // Assuming the API returns members in included or similar.
            // For now, let's assume standard JSON:API include or check how backend serves it.
            // Adjusting based on common patterns: fetching group often includes relationships.
            // If not, we might need a separate endpoint, but none is documented.

            // Fetch group details and users separately to handle permissions
            let groupJson;
            try {
                const groupRes = await groupApi.get(group.id);
                if (groupRes.ok) {
                    groupJson = await groupRes.json();
                } else {
                    throw new Error("Failed to load group details");
                }
            } catch (e) {
                console.error("Group fetch error:", e);
                error = "Failed to load group details";
                return;
            }

            // Try to fetch all users, but don't fail if it fails (admin only?)
            try {
                const usersRes = await userApi.list();
                if (usersRes.ok) {
                    const usersJson = await usersRes.json();
                    allUsers = usersJson.data || usersJson;
                }
            } catch (e) {
                console.warn(
                    "Could not load all users (likely permission issue):",
                    e,
                );
                allUsers = [];
            }

            // Process members from group response
            const groupMembers = groupJson.data?.attributes?.members || [];

            // If we couldn't get all users via bulk list, we might need to fetch them individually
            // This is "N+1" queryish but necessary if non-admins can't list all users but can see group members
            const memberPromises = groupMembers.map(async (m: any) => {
                // 1. Check if we already have it from allUsers
                const fromAll = allUsers.find((u: any) => u.id == m.id);
                if (fromAll) {
                    return { ...fromAll, groupRole: m.role };
                }

                // 2. Check if the group response included enough info (unlikely for standard JSON:API but possible)
                if (m.name && m.email) {
                    return {
                        id: m.id,
                        attributes: {
                            name: m.name,
                            "first-name": m.first_name || "",
                            email: m.email,
                        },
                        groupRole: m.role,
                    };
                }

                // 3. Try to fetch this specific user details
                try {
                    const res = await userApi.get(m.id);
                    if (res.ok) {
                        const json = await res.json();
                        const u = json.data || json;
                        return { ...u, groupRole: m.role };
                    }
                } catch (e) {
                    /* ignore */
                }

                // 4. Fallback
                return {
                    id: m.id,
                    attributes: {
                        name: "Nutzer",
                        "first-name": "Unbekannter",
                        email: `ID: ${m.id}`,
                    },
                    groupRole: m.role,
                };
            });

            const resolvedMembers = await Promise.all(memberPromises);
            members = resolvedMembers.filter(Boolean);
        } catch (e: any) {
            console.error(e);
            error = "Failed to load members";
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        if (show && group?.id) {
            loadData();
        }
    });

    async function handleAddMember() {
        if (!selectedUserId) return;
        addingMember = true;
        try {
            const res = await groupApi.addMember(group.id, {
                userId: selectedUserId,
                role: (selectedRole || null) as any, // Convert empty string to null and strict cast
            });

            if (res.ok) {
                selectedUserId = ""; // Reset
                loadData(); // Reload list
            } else {
                alert("Failed to add member");
            }
        } catch (e) {
            console.error(e);
            alert("Error adding member");
        } finally {
            addingMember = false;
        }
    }

    async function handleUpdateMember(userId: string, newRole: string) {
        try {
            const role = newRole || null; // Convert empty string to null
            const res = await groupApi.updateMember(group.id, userId, role);
            if (res.ok) {
                loadData();
            } else {
                alert("Failed to update role");
                loadData(); // Reset UI
            }
        } catch (e) {
            console.error(e);
            alert("Error updating role");
        }
    }

    async function handleRemoveMember(userId: string) {
        if (!confirm("Remove this user from the group?")) return;

        try {
            const res = await groupApi.removeMember(group.id, userId);
            if (res.ok) {
                loadData();
            } else {
                alert("Failed to remove member");
            }
        } catch (e) {
            console.error(e);
            alert("Error removing member");
        }
    }

    // Permissions
    const currentUser = $derived($auth.user);
    const isAdmin = $derived(hasPermission(currentUser, "groups:manage"));

    // We need to know if current user is moderator of THIS group
    const isGroupModerator = $derived(
        members.find((m) => m.id === currentUser?.id)?.groupRole ===
            "moderator",
    );

    const canManageMembers = $derived(isAdmin || isGroupModerator);

    // Filter users available to add (not already in members)
    const availableUsers = $derived(
        allUsers.filter((u) => !members.find((m) => m.id == u.id)),
    );

    function canRemoveUser(targetUser: any) {
        if (!canManageMembers) return false;
        if (targetUser.id === currentUser?.id) return false; // Cannot remove self

        // Admin rule: Target Admin can only be removed by Admin
        if (targetUser.attributes.status >= 4) {
            return isAdmin;
        }

        return true;
    }

    function getRoleIcon(role: string) {
        if (role === "moderator") return Shield;
        if (role === "listener") return Ear;
        return User; // Standard
    }
</script>

{#if show}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        role="dialog"
        aria-modal="true"
    >
        <div
            class="bg-white dark:bg-zinc-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        >
            <div
                class="p-6 border-b border-zinc-100 dark:border-zinc-700 flex items-center justify-between"
            >
                <h2 class="text-xl font-bold text-zinc-900 dark:text-white">
                    Mitglieder: {group?.attributes.title}
                </h2>
                <button
                    onclick={() => (show = false)}
                    class="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            <div
                class="flex-1 overflow-y-auto p-6 space-y-6"
                onscroll={handleScroll}
            >
                {#if loading && members.length === 0}
                    <div class="flex justify-center p-8">
                        <Loader2 class="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                {:else}
                    <!-- Add Member Section -->
                    {#if canManageMembers}
                        <div
                            class="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-4"
                        >
                            <h3
                                class="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2"
                            >
                                <UserPlus class="w-4 h-4" />
                                Mitglied hinzufügen
                            </h3>
                            <div class="flex flex-col sm:flex-row gap-3">
                                <SearchableSelect
                                    options={availableUsers.map((u) => ({
                                        value: u.id,
                                        label: `${u.attributes["first-name"]} ${u.attributes.name} (${u.attributes.email})`,
                                    }))}
                                    bind:value={selectedUserId}
                                    placeholder="Benutzer auswählen..."
                                    class="flex-1"
                                />

                                <SearchableSelect
                                    options={[
                                        { value: "", label: "Standard" },
                                        {
                                            value: "listener",
                                            label: "Listener",
                                        },
                                        {
                                            value: "moderator",
                                            label: "Moderator",
                                        },
                                    ]}
                                    bind:value={selectedRole}
                                    searchable={false}
                                    placeholder="Rolle auswählen..."
                                    class="w-full sm:w-40"
                                />

                                <button
                                    onclick={handleAddMember}
                                    disabled={!selectedUserId || addingMember}
                                    class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    Hinzu
                                </button>
                            </div>
                        </div>
                    {/if}

                    <!-- Members List -->
                    <div>
                        <h3
                            class="text-sm font-semibold text-zinc-900 dark:text-white mb-3"
                        >
                            Aktuelle Mitglieder ({members.length})
                        </h3>
                        <div class="space-y-2">
                            {#each members as member}
                                {@const RoleIcon = getRoleIcon(
                                    member.groupRole,
                                )}
                                <div
                                    class="flex items-center justify-between p-3 bg-white dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-lg hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors"
                                >
                                    <div class="flex items-center gap-3">
                                        <div
                                            class="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-zinc-500"
                                        >
                                            <User class="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p
                                                class="text-sm font-medium text-zinc-900 dark:text-white"
                                            >
                                                {member.attributes[
                                                    "first-name"
                                                ]}
                                                {member.attributes.name}
                                            </p>
                                            <p
                                                class="text-xs text-zinc-500 dark:text-zinc-400"
                                            >
                                                {member.attributes.email}
                                            </p>
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-3">
                                        <!-- Role Badge (Always Visible) -->
                                        <span
                                            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                                            {member.groupRole === 'moderator'
                                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'}"
                                        >
                                            <RoleIcon class="w-3 h-3" />
                                            {member.groupRole || "Standard"}
                                        </span>

                                        <!-- Admin Actions (Menu) -->
                                        {#if canManageMembers && member.id !== currentUser?.id}
                                            <div
                                                class="relative inline-block text-left"
                                            >
                                                <button
                                                    onclick={(e) =>
                                                        toggleMenu(
                                                            e,
                                                            member.id,
                                                        )}
                                                    class="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                                >
                                                    <MoreVertical
                                                        class="w-5 h-5"
                                                    />
                                                </button>
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            {:else}
                                <p
                                    class="text-center text-zinc-500 py-4 text-sm"
                                >
                                    Keine Mitglieder gefunden.
                                </p>
                            {/each}
                        </div>
                    </div>
                {/if}

                {#if error}
                    <div class="text-red-600 text-center text-sm">{error}</div>
                {/if}
            </div>

            <div
                class="p-6 border-t border-zinc-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/30 rounded-b-xl flex justify-end"
            >
                <button
                    onclick={() => (show = false)}
                    class="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                >
                    Schließen
                </button>
            </div>
        </div>
    </div>

    <!-- Floating Menu Portal (Fixed to Viewport) -->
    {#if activeMenu}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div use:portal>
            <div
                class="fixed inset-0 z-[60]"
                onclick={() => (activeMenu = null)}
            ></div>
            <div
                class="fixed z-[70] w-48 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
                style="top: {menuPosition.y}px; left: {menuPosition.x - 192}px;"
            >
                <button
                    onclick={() => {
                        handleUpdateMember(activeMenu!, "");
                        activeMenu = null;
                    }}
                    class="w-full text-left px-4 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 flex items-center justify-between group"
                >
                    <div class="flex items-center gap-2">
                        <User
                            class="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300"
                        />
                        <span>Standard</span>
                    </div>
                    {#if !activeMember?.groupRole}
                        <Check class="w-4 h-4 text-blue-600" />
                    {/if}
                </button>
                <button
                    onclick={() => {
                        handleUpdateMember(activeMenu!, "listener");
                        activeMenu = null;
                    }}
                    class="w-full text-left px-4 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 flex items-center justify-between group"
                >
                    <div class="flex items-center gap-2">
                        <Ear
                            class="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300"
                        />
                        <span>Listener</span>
                    </div>
                    {#if activeMember?.groupRole === "listener"}
                        <Check class="w-4 h-4 text-blue-600" />
                    {/if}
                </button>
                <button
                    onclick={() => {
                        handleUpdateMember(activeMenu!, "moderator");
                        activeMenu = null;
                    }}
                    class="w-full text-left px-4 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 flex items-center justify-between group"
                >
                    <div class="flex items-center gap-2">
                        <Shield
                            class="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300"
                        />
                        <span>Moderator</span>
                    </div>
                    {#if activeMember?.groupRole === "moderator"}
                        <Check class="w-4 h-4 text-blue-600" />
                    {/if}
                </button>

                {#if activeMember && canRemoveUser(activeMember)}
                    <div
                        class="border-t border-zinc-100 dark:border-zinc-700 my-1"
                    ></div>
                    <button
                        onclick={() => {
                            handleRemoveMember(activeMember.id);
                            activeMenu = null;
                        }}
                        class="w-full text-left px-4 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm text-red-600 dark:text-red-400 flex items-center gap-2"
                    >
                        <Trash2 class="w-4 h-4" />
                        Entfernen
                    </button>
                {/if}
            </div>
        </div>
    {/if}
{/if}
