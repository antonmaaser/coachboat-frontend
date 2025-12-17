<script lang="ts">
    import { groupApi } from "$lib/api/groups";
    import PostItem from "./PostItem.svelte";
    import { Loader2, Send } from "lucide-svelte";
    import { onMount, untrack } from "svelte";

    let { groupId, canModerate } = $props<{
        groupId: string;
        canModerate: boolean;
    }>();

    // State
    let loading = $state(true);
    let error = $state<string | null>(null);
    let items = $state<any[]>([]);

    // Post Creation State
    let newPostContent = $state("");
    let creating = $state(false);

    async function loadFeed() {
        if (!groupId) return;

        loading = true;
        error = null;

        try {
            console.log("[GroupFeed] Feed abrufen für", groupId);
            const res = await groupApi.getFeed(groupId);

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Fehler: ${res.status} ${res.statusText}`);
            }

            const json = await res.json();
            const rawActivities = json.data || [];
            console.log("[GroupFeed] Feed abgerufen:", rawActivities.length);

            // Process items
            items = rawActivities
                .map((a: any) => mapActivity(a))
                .filter(Boolean);
        } catch (e: any) {
            console.error("[GroupFeed] Error:", e);
            error = e.message || "Unbekannter Fehler beim Laden des Feeds";
        } finally {
            loading = false;
        }
    }

    function mapActivity(a: any) {
        const action = a.attributes?.action;

        // 1. Handle Posts
        if (action === "post.created") {
            return {
                key: a.id, // Unique Activity ID for Svelte Loop
                id: a.attributes?.["object-id"],
                type: "post",
                attributes: {
                    body: a.attributes?.payload?.body_snippet || "",
                    "created-at": a.attributes?.["created-at"],
                    "created-by": a.relationships?.actor?.data?.id,
                },
                relationships: {
                    user: {
                        id: a.relationships?.actor?.data?.id,
                        attributes: {
                            name:
                                a.relationships?.actor?.meta?.name ||
                                "Unbekannt",
                            "first-name":
                                a.relationships?.actor?.meta?.["first-name"] ||
                                "",
                        },
                    },
                },
            };
        }

        // 2. Handle Other Activities (Only for Moderators)
        if (canModerate) {
            return {
                key: a.id,
                id: a.id,
                type: "activity",
                attributes: {
                    summary: a.attributes?.summary || "Unbekannte Aktivität",
                    "created-at": a.attributes?.["created-at"],
                    action: action,
                },
                relationships: {
                    user: {
                        id: a.relationships?.actor?.data?.id,
                        attributes: {
                            name:
                                a.relationships?.actor?.meta?.name ||
                                "Unbekannt",
                            "first-name":
                                a.relationships?.actor?.meta?.["first-name"] ||
                                "",
                        },
                    },
                },
            };
        }

        return null;
    }

    async function handleCreatePost() {
        if (!newPostContent.trim()) return;
        creating = true;
        try {
            const res = await groupApi.createPost(groupId, {
                body: newPostContent,
            });
            if (res.ok) {
                newPostContent = "";
                await loadFeed();
            } else {
                alert("Fehler beim Erstellen des Posts");
            }
        } catch (e) {
            console.error(e);
            alert("Fehler beim Erstellen des Posts");
        } finally {
            creating = false;
        }
    }

    async function handleDeletePost(postId: string) {
        if (!confirm("Diesen Post löschen?")) return;
        try {
            const res = await groupApi.deletePost(groupId, postId);
            if (res.ok) {
                await loadFeed();
            }
        } catch (e) {
            console.error(e);
        }
    }

    async function handleUpdatePost(postId: string, content: string) {
        try {
            const res = await groupApi.updatePost(groupId, postId, {
                body: content,
            });
            if (res.ok) {
                await loadFeed();
            }
        } catch (e) {
            console.error(e);
        }
    }

    // React to groupId changes
    $effect(() => {
        if (groupId) {
            untrack(() => loadFeed());
        }
    });
</script>

<div class="space-y-6">
    <!-- Post Creation -->
    <div
        class="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700 shadow-sm"
    >
        <textarea
            bind:value={newPostContent}
            class="w-full p-3 rounded-lg border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-blue-500 mb-3 resize-none"
            placeholder="Schreibe etwas..."
            rows="3"
        ></textarea>
        <div class="flex justify-end">
            <button
                onclick={handleCreatePost}
                disabled={!newPostContent.trim() || creating}
                class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {#if creating}
                    <Loader2 class="w-4 h-4 animate-spin" />
                {:else}
                    <Send class="w-4 h-4" />
                {/if}
                Post
            </button>
        </div>
    </div>

    <!-- Feed List -->
    {#if loading}
        <div class="flex justify-center p-8">
            <Loader2 class="w-8 h-8 animate-spin text-blue-600" />
        </div>
    {:else if error}
        <div class="p-4 bg-red-50 text-red-600 rounded-lg text-sm text-center">
            {error}
            <button class="block mx-auto mt-2 underline" onclick={loadFeed}
                >Nochmal versuchen</button
            >
        </div>
    {:else if items.length === 0}
        <div class="text-center p-8 text-zinc-500">Noch keine Posts.</div>
    {:else}
        <div class="space-y-4">
            {#each items as item (item.key)}
                {#if item.type === "post"}
                    <PostItem
                        post={item}
                        {canModerate}
                        onDelete={handleDeletePost}
                        onUpdate={(id, content) =>
                            handleUpdatePost(id, content)}
                    />
                {:else}
                    <!-- Activity Item -->
                    <div
                        class="flex items-center gap-3 p-3 text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-800"
                    >
                        <div
                            class="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-500 dark:text-zinc-400"
                        >
                            {(
                                item.relationships?.user?.attributes?.[
                                    "first-name"
                                ]?.[0] ||
                                item.relationships?.user?.attributes
                                    ?.name?.[0] ||
                                "?"
                            ).toUpperCase()}
                        </div>
                        <div class="flex-1">
                            <span
                                class="font-medium text-zinc-700 dark:text-zinc-300"
                            >
                                {#if item.relationships?.user?.attributes?.["first-name"]}
                                    {item.relationships?.user?.attributes?.[
                                        "first-name"
                                    ]}
                                    {item.relationships?.user?.attributes?.name}
                                {:else}
                                    {item.relationships?.user?.attributes?.name}
                                {/if}
                            </span>
                            <span>{item.attributes.summary}</span>
                        </div>
                        <div class="text-xs opacity-70">
                            {new Date(
                                item.attributes["created-at"],
                            ).toLocaleString()}
                        </div>
                    </div>
                {/if}
            {/each}
        </div>
    {/if}
</div>
