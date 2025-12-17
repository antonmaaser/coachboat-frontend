<script lang="ts">
    import { page } from "$app/stores";
    import { groupApi } from "$lib/api/groups";
    import { auth } from "$lib/stores/auth";
    import { onMount } from "svelte";
    import GroupFeed from "$lib/components/GroupFeed.svelte";
    import GroupMembersModal from "$lib/components/GroupMembersModal.svelte";
    import { Users, Settings, ArrowLeft } from "lucide-svelte";

    const groupId = $page.params.id;
    let group = $state<any>(null);
    let loading = $state(true);
    let error = $state("");
    let showMembersModal = $state(false);

    async function loadGroup() {
        loading = true;
        try {
            const res = await groupApi.get(groupId);
            if (res.ok) {
                const json = await res.json();
                group = json.data || json;
            } else {
                error = "Gruppe nicht gefunden";
            }
        } catch (e) {
            console.error(e);
            error = "Fehler beim Laden der Gruppe";
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        loadGroup();
    });

    const currentUser = $derived($auth.user);
    const isAdmin = $derived((currentUser?.status || 0) >= 3);

    // Check if user is a moderator of this group
    // We need the member list to check this. The group response might include it.
    // Based on `GroupMembersModal` logic, the group response has `attributes.members`.
    const isGroupModerator = $derived(
        group?.attributes?.members?.find((m: any) => m.id == currentUser?.id)
            ?.role === "moderator",
    );

    const canManageGroup = $derived(isAdmin || isGroupModerator);
</script>

<div class="space-y-6">
    <a
        href="/groups"
        class="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
    >
        <ArrowLeft class="w-4 h-4 mr-1" />
        Zurück zur Übersicht
    </a>

    {#if loading}
        <div class="p-8 text-center text-zinc-500">Lädt...</div>
    {:else if error}
        <div class="p-8 text-center text-red-600">{error}</div>
    {:else if group}
        <div
            class="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700 shadow-sm"
        >
            <div
                class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6"
            >
                <div>
                    <h1
                        class="text-3xl font-bold text-zinc-900 dark:text-white mb-2"
                    >
                        {group.attributes.title}
                    </h1>
                    <p class="text-zinc-600 dark:text-zinc-400">
                        {group.attributes.description || "Keine Beschreibung"}
                    </p>
                </div>

                <button
                    onclick={() => (showMembersModal = true)}
                    class="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-200 transition-colors"
                >
                    <Users class="w-4 h-4" />
                    Mitglieder ({group.attributes.members?.length || 0})
                </button>
            </div>

            <div class="border-t border-zinc-100 dark:border-zinc-700 pt-6">
                <h2
                    class="text-lg font-semibold text-zinc-900 dark:text-white mb-4"
                >
                    Pinnwand
                </h2>
                <GroupFeed {groupId} canModerate={canManageGroup} />
            </div>
        </div>
    {/if}

    {#if showMembersModal && group}
        <GroupMembersModal bind:show={showMembersModal} {group} />
    {/if}
</div>
