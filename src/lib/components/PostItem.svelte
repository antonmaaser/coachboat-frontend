<script lang="ts">
    import { auth } from "$lib/stores/auth";
    import { MoreVertical, Pencil, Trash2 } from "lucide-svelte";
    import TextInput from "$lib/components/ui/TextInput.svelte";

    let { post, canModerate, onDelete, onUpdate } = $props<{
        post: any;
        canModerate: boolean;
        onDelete: (id: string) => void;
        onUpdate: (id: string, content: string, isPinned: boolean) => void;
    }>();

    let isEditing = $state(false);
    let editContent = $state(post.attributes.body);
    let showMenu = $state(false);

    const currentUser = $derived($auth.user);
    const isAuthor = $derived(
        post.attributes["created-by"] === currentUser?.id,
    );
    const canEdit = $derived(isAuthor || canModerate); // Admins/Mods can edit? Requirements just say "edit/delete posts" for logic. Usually mods can delete, maybe edit. Let's assume mods can delete, authors can edit.
    // Actually API schema says: PATCH /:id/posts/:postId  - Auth: ? Likely Author or Admin.
    // Let's assume Author can edit, Mods/Admin can delete.

    // For now, let's allow Mods to delete, Author to edit.
    const canDelete = $derived(isAuthor || canModerate);

    function handleUpdate() {
        onUpdate(post.id, editContent, post.attributes.is_pinned);
        isEditing = false;
    }

    function formatDate(dateString: string) {
        if (!dateString) return "";
        return new Intl.DateTimeFormat("de-DE", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(new Date(dateString));
    }
</script>

<div
    class="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-3"
>
    <div class="flex justify-between items-start">
        <div class="flex items-center gap-2">
            <div
                class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs"
            >
                {(
                    (post.relationships?.user?.attributes?.[
                        "first-name"
                    ]?.[0] || "") +
                        (post.relationships?.user?.attributes?.name?.[0] ||
                            "") || "?"
                ).toUpperCase()}
            </div>
            <div>
                <p class="text-sm font-medium text-zinc-900 dark:text-white">
                    {#if post.relationships?.user?.attributes?.["first-name"]}
                        {post.relationships?.user?.attributes?.["first-name"]}
                        {post.relationships?.user?.attributes?.name}
                    {:else}
                        {post.relationships?.user?.attributes?.name ||
                            "Unbekannt"}
                    {/if}
                </p>
                <p class="text-xs text-zinc-500">
                    {formatDate(post.attributes["created-at"])}
                </p>
            </div>
        </div>

        {#if canDelete || isAuthor}
            <div class="relative">
                <button
                    onclick={() => (showMenu = !showMenu)}
                    class="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                    <MoreVertical class="w-4 h-4" />
                </button>

                {#if showMenu}
                    <div
                        class="absolute right-0 mt-1 w-32 bg-white dark:bg-zinc-800 rounded shadow-lg border border-zinc-200 dark:border-zinc-700 z-10 py-1"
                        onclick={() => (showMenu = false)}
                    >
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div
                            class="fixed inset-0 z-[-1]"
                            onclick={() => (showMenu = false)}
                        ></div>

                        {#if isAuthor}
                            <button
                                onclick={() => {
                                    isEditing = true;
                                    showMenu = false;
                                }}
                                class="w-full text-left px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 flex items-center gap-2"
                            >
                                <Pencil class="w-3 h-3" /> Bearbeiten
                            </button>
                        {/if}

                        {#if canDelete}
                            <button
                                onclick={() => onDelete(post.id)}
                                class="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                            >
                                <Trash2 class="w-3 h-3" /> Löschen
                            </button>
                        {/if}
                    </div>
                {/if}
            </div>
        {/if}
    </div>

    {#if isEditing}
        <TextInput
            multiline
            rows={3}
            bind:value={editContent}
            class="w-full"
            placeholder="Deinen Post bearbeiten..."
        />
        <div class="flex justify-end gap-2">
            <button
                onclick={() => (isEditing = false)}
                class="px-3 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-700"
            >
                Abbrechen
            </button>
            <button
                onclick={handleUpdate}
                class="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-500"
            >
                Speichern
            </button>
        </div>
    {:else}
        <p class="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
            {post.attributes.body}
        </p>
    {/if}
</div>
