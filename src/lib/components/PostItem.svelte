<script lang="ts">
    import { auth } from "$lib/stores/auth";
    import { MoreVertical, Pencil, Trash2 } from "lucide-svelte";
    import Editor from "$lib/components/editor/Editor.svelte";

    let { post, canModerate, onDelete, onUpdate } = $props<{
        post: any;
        canModerate: boolean;
        onDelete: (id: string) => void;
        onUpdate: (id: string, content: string, isPinned: boolean) => void;
    }>();

    let isEditing = $state(false);
    let showMenu = $state(false);

    // State to hold current editor data during edit
    let currentEditData = $state<any>(null);

    const currentUser = $derived($auth.user);
    const isAuthor = $derived(
        post.attributes["created-by"] === currentUser?.id,
    );
    const canEdit = $derived(isAuthor);
    const canDelete = $derived(isAuthor || canModerate);

    function parseBody(body: any) {
        if (!body) return null;
        if (typeof body === "object") return body;
        try {
            const parsed = JSON.parse(body);
            // Simple check to see if it looks like EditorJS data
            if (parsed && Array.isArray(parsed.blocks)) return parsed;
        } catch (e) {
            // Not JSON or invalid
        }
        return null;
    }

    // Derived to check generic format
    const postData = $derived(parseBody(post.attributes.body));

    function handleUpdate() {
        if (!currentEditData) {
            // No changes or empty
            isEditing = false;
            return;
        }
        const stringified = JSON.stringify(currentEditData);
        onUpdate(post.id, stringified, post.attributes.is_pinned);
        isEditing = false;
    }

    function formatDate(dateString: string) {
        if (!dateString) return "";
        return new Intl.DateTimeFormat("de-DE", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(new Date(dateString));
    }

    function getInitialEditData() {
        if (postData) return postData;
        // Convert plain text to EditorJS paragraph block
        return {
            blocks: [
                {
                    type: "paragraph",
                    data: {
                        text: post.attributes.body,
                    },
                },
            ],
        };
    }
</script>

<div
    class="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-3 relative {isEditing
        ? 'z-30'
        : 'z-0'}"
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
                        role="menu"
                        tabindex="-1"
                        onclick={() => (showMenu = false)}
                        onkeydown={(e) =>
                            e.key === "Escape" && (showMenu = false)}
                    >
                        <button
                            type="button"
                            class="fixed inset-0 z-[-1] cursor-default w-full h-full block"
                            onclick={() => (showMenu = false)}
                            aria-label="Close menu"
                        ></button>

                        {#if isAuthor}
                            <button
                                onclick={() => {
                                    isEditing = true;
                                    showMenu = false;
                                    currentEditData = getInitialEditData();
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
        <div
            class="border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 bg-zinc-50 dark:bg-zinc-900"
        >
            <Editor
                data={getInitialEditData()}
                onChange={(data) => (currentEditData = data)}
                placeholder="Post bearbeiten..."
            />
        </div>
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
        <div class="text-sm text-zinc-700 dark:text-zinc-300">
            {#if postData}
                <Editor data={postData} readOnly={true} />
            {:else}
                <p class="whitespace-pre-wrap">{post.attributes.body}</p>
            {/if}
        </div>
    {/if}
</div>
