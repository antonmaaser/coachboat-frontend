<script lang="ts">
    import { groupApi, type GroupMemberRole } from "$lib/api/groups";
    import { userApi } from "$lib/api/users";
    import { auth, hasPermission } from "$lib/stores/auth";
    import {
        Loader2,
        UserPlus,
        Trash2,
        Shield,
        User,
        Eye,
        X,
        MoreVertical,
        Check,
    } from "lucide-svelte";
    import SearchableSelect from "$lib/components/ui/SearchableSelect.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import { portal } from "$lib/actions/portal";

    type UserLike = {
        id: string;
        attributes: {
            name?: string;
            "first-name"?: string;
            email?: string;
            status?: number;
        };
    };

    type MemberView = UserLike & { groupRole: GroupMemberRole };

    const GROUP_MEMBER_ROLES: GroupMemberRole[] = [
        "owner",
        "admin",
        "moderator",
        "member",
        "viewer",
    ];

    let { group, show = $bindable(false) } = $props<{
        group: any;
        show: boolean;
    }>();

    let loading = $state(false);
    let members = $state<MemberView[]>([]);
    let allUsers = $state<UserLike[]>([]);
    let error = $state("");

    // Add Member Form State
    let selectedUserId = $state("");
    let selectedRole = $state<GroupMemberRole>("member");

    let addingMember = $state(false);

    // Menu State
    let activeMenu = $state<string | null>(null);
    let menuPosition = $state({ x: 0, y: 0 });
    const activeMember = $derived(members.find((m) => m.id === activeMenu));

    function normalizeRole(value: unknown): GroupMemberRole {
        const role = String(value || "").toLowerCase() as GroupMemberRole;
        return GROUP_MEMBER_ROLES.includes(role) ? role : "member";
    }

    function roleLabel(role: GroupMemberRole): string {
        if (role === "owner") return "Inhaber";
        if (role === "admin") return "Administrator";
        if (role === "moderator") return "Moderator";
        if (role === "viewer") return "Zuschauer";
        return "Mitglied";
    }

    function roleColor(role: GroupMemberRole): string {
        if (role === "owner") {
            return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
        }
        if (role === "admin") {
            return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
        }
        if (role === "moderator") {
            return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";
        }
        if (role === "viewer") {
            return "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300";
        }
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    }

    function getRoleIcon(role: GroupMemberRole) {
        if (role === "owner" || role === "admin" || role === "moderator") {
            return Shield;
        }
        if (role === "viewer") return Eye;
        return User;
    }

    function toggleMenu(e: MouseEvent, memberId: string) {
        if (activeMenu === memberId) {
            activeMenu = null;
            return;
        }

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        menuPosition = {
            x: rect.right,
            y: rect.bottom + 5,
        };
        activeMenu = memberId;
    }

    function handleScroll() {
        if (activeMenu) activeMenu = null;
    }

    async function resolveMemberDetails(
        member: any,
        usersById: Map<string, UserLike>,
        fallbackRoleMap: Map<string, GroupMemberRole>,
    ): Promise<MemberView> {
        const id = String(member.id);
        const fallbackUser = usersById.get(id);

        let attributes: UserLike["attributes"] = {
            name: member.attributes?.name ?? fallbackUser?.attributes?.name,
            "first-name":
                member.attributes?.["first-name"] ??
                fallbackUser?.attributes?.["first-name"],
            email: member.attributes?.email ?? fallbackUser?.attributes?.email,
            status: member.attributes?.status ?? fallbackUser?.attributes?.status,
        };

        if (!attributes.name || !attributes.email) {
            try {
                const userRes = await userApi.get(id);
                if (userRes.ok) {
                    const userJson = await userRes.json();
                    const fetched = userJson.data || userJson;
                    attributes = {
                        name: fetched.attributes?.name ?? attributes.name,
                        "first-name":
                            fetched.attributes?.["first-name"] ??
                            attributes["first-name"],
                        email: fetched.attributes?.email ?? attributes.email,
                        status: fetched.attributes?.status ?? attributes.status,
                    };
                }
            } catch {
                // Non-fatal; fallback below.
            }
        }

        const role = normalizeRole(
            member.attributes?.role ??
                member.meta?.role ??
                fallbackRoleMap.get(id) ??
                "member",
        );

        return {
            id,
            attributes: {
                name: attributes.name || "Nutzer",
                "first-name": attributes["first-name"] || "Unbekannter",
                email: attributes.email || `ID: ${id}`,
                status: attributes.status,
            },
            groupRole: role,
        };
    }

    async function loadData() {
        if (!group?.id) return;
        loading = true;
        error = "";

        if (!canViewMembers) {
            members = [];
            allUsers = [];
            error = "Keine Berechtigung, Mitglieder anzusehen";
            loading = false;
            return;
        }

        try {
            const [membersRes, usersRes] = await Promise.all([
                groupApi.getMembers(group.id),
                userApi.list(),
            ]);

            if (usersRes.ok) {
                const usersJson = await usersRes.json();
                allUsers = (usersJson.data || usersJson) as UserLike[];
            } else {
                allUsers = [];
            }

            if (!membersRes.ok) {
                throw new Error("Gruppenmitglieder konnten nicht geladen werden");
            }

            const membersJson = await membersRes.json();
            const memberList = membersJson.data || [];

            const usersById = new Map(allUsers.map((u) => [String(u.id), u]));
            const fallbackRoleEntries: Array<[string, GroupMemberRole]> = (
                group?.attributes?.members || []
            ).map((m: any) => [String(m.id), normalizeRole(m.role)]);
            const fallbackRoleMap = new Map<string, GroupMemberRole>(
                fallbackRoleEntries,
            );

            members = await Promise.all(
                memberList.map((member: any) =>
                    resolveMemberDetails(member, usersById, fallbackRoleMap),
                ),
            );
        } catch (e: any) {
            console.error(e);
            error = "Mitglieder konnten nicht geladen werden";
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
        if (!canManageMembers) {
            alert("Keine Berechtigung, Mitglieder zu bearbeiten");
            return;
        }
        if (!selectedUserId) return;
        addingMember = true;
        try {
            const res = await groupApi.addMember(group.id, {
                userId: selectedUserId,
                role: selectedRole,
            });

            if (res.ok) {
                selectedUserId = "";
                selectedRole = "member";
                loadData();
            } else {
                alert("Mitglied konnte nicht hinzugefügt werden");
            }
        } catch (e) {
            console.error(e);
            alert("Fehler beim Hinzufügen des Mitglieds");
        } finally {
            addingMember = false;
        }
    }

    async function handleUpdateMember(userId: string, role: GroupMemberRole) {
        if (!canManageMembers) {
            alert("Keine Berechtigung, Mitglieder zu bearbeiten");
            return;
        }
        try {
            const res = await groupApi.updateMember(group.id, userId, role);
            if (res.ok) {
                loadData();
            } else {
                alert("Rolle konnte nicht aktualisiert werden");
                loadData();
            }
        } catch (e) {
            console.error(e);
            alert("Fehler beim Aktualisieren der Rolle");
        }
    }

    async function handleRemoveMember(userId: string) {
        if (!canManageMembers) {
            alert("Keine Berechtigung, Mitglieder zu bearbeiten");
            return;
        }
        if (!confirm("Diesen Benutzer aus der Gruppe entfernen?")) return;

        try {
            const res = await groupApi.removeMember(group.id, userId);
            if (res.ok) {
                loadData();
            } else {
                alert("Mitglied konnte nicht entfernt werden");
            }
        } catch (e) {
            console.error(e);
            alert("Fehler beim Entfernen des Mitglieds");
        }
    }

    const currentUser = $derived($auth.user);
    const groupId = $derived(group?.id ? String(group.id) : null);
    const canViewMembers = $derived(
        !!groupId &&
            (hasPermission(currentUser, "groups:read", groupId) ||
                hasPermission(currentUser, "groups:update:any", groupId)),
    );
    const canManageMembers = $derived(
        !!groupId && hasPermission(currentUser, "groups:update:any", groupId),
    );

    const availableUsers = $derived(
        allUsers.filter((u) => !members.find((m) => m.id == u.id)),
    );

    function canRemoveUser(targetUser: MemberView) {
        if (!canManageMembers) return false;
        if (targetUser.id === currentUser?.id) return false;
        return true;
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
                <Button
                    variant="icon"
                    tone="neutral"
                    iconOnly
                    ariaLabel="Schließen"
                    onclick={() => (show = false)}
                >
                    <X class="w-5 h-5" />
                </Button>
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
                    {#if canManageMembers}
                        <div
                            data-testid="group-members-add-section"
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
                                        label: `${u.attributes["first-name"] || ""} ${u.attributes.name || ""} (${u.attributes.email || "-"})`,
                                    }))}
                                    bind:value={selectedUserId}
                                    placeholder="Benutzer auswählen..."
                                    class="flex-1"
                                />

                                <SearchableSelect
                                    options={GROUP_MEMBER_ROLES.map((role) => ({
                                        value: role,
                                        label: roleLabel(role),
                                    }))}
                                    bind:value={selectedRole}
                                    searchable={false}
                                    placeholder="Rolle auswählen..."
                                    class="w-full sm:w-40"
                                />

                                <Button
                                    variant="solid"
                                    tone="primary"
                                    size="sm"
                                    onclick={handleAddMember}
                                    disabled={!selectedUserId || addingMember}
                                >
                                    Hinzu
                                </Button>
                            </div>
                        </div>
                    {/if}

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
                                                {member.attributes["first-name"]}
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
                                        <span
                                            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium {roleColor(
                                                member.groupRole,
                                            )}"
                                        >
                                            <RoleIcon class="w-3 h-3" />
                                            {roleLabel(member.groupRole)}
                                        </span>

                                        {#if canManageMembers && member.id !== currentUser?.id}
                                            <div
                                                class="relative inline-block text-left"
                                            >
                                                <Button
                                                    variant="icon"
                                                    tone="neutral"
                                                    iconOnly
                                                    ariaLabel="Mitgliedsaktionen"
                                                    onclick={(e: MouseEvent) =>
                                                        toggleMenu(
                                                            e,
                                                            member.id,
                                                        )}
                                                >
                                                    <MoreVertical
                                                        class="w-5 h-5"
                                                    />
                                                </Button>
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
                <Button
                    variant="outline"
                    tone="neutral"
                    onclick={() => (show = false)}
                >
                    Schließen
                </Button>
            </div>
        </div>
    </div>

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
                {#each GROUP_MEMBER_ROLES as role}
                    {@const RoleIcon = getRoleIcon(role)}
                    <Button
                        variant="menu"
                        tone="neutral"
                        align="left"
                        compact
                        onclick={() => {
                            handleUpdateMember(activeMenu!, role);
                            activeMenu = null;
                        }}
                    >
                        <div class="flex w-full items-center justify-between gap-2 group">
                            <RoleIcon
                                class="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300"
                            />
                            <span class="flex-1">{roleLabel(role)}</span>
                            {#if activeMember?.groupRole === role}
                                <Check class="w-4 h-4 text-blue-600" />
                            {/if}
                        </div>
                    </Button>
                {/each}

                {#if activeMember && canRemoveUser(activeMember)}
                    <div
                        class="border-t border-zinc-100 dark:border-zinc-700 my-1"
                    ></div>
                    <Button
                        variant="menu"
                        tone="danger"
                        align="left"
                        compact
                        onclick={() => {
                            handleRemoveMember(activeMember.id);
                            activeMenu = null;
                        }}
                    >
                        <Trash2 class="w-4 h-4" />
                        Entfernen
                    </Button>
                {/if}
            </div>
        </div>
    {/if}
{/if}
