<script lang="ts">
    import { groupApi } from "$lib/api/groups";
    import PostItem from "./PostItem.svelte";
    import Editor from "$lib/components/editor/Editor.svelte";
    import { Loader2, Send } from "lucide-svelte";
    import { onMount, untrack } from "svelte";
    import { auth } from "$lib/stores/auth";
    import { API_BASE } from "$lib/config";
    import { get } from "svelte/store";
    import { extractErrorMessage } from "$lib/utils/error";
    import ErrorAlert from "$lib/components/ui/ErrorAlert.svelte";
    import { toast } from "$lib/stores/toast";

    let { groupId, canModerate } = $props<{
        groupId: string;
        canModerate: boolean;
    }>();

    // State
    let loading = $state(true);
    let error = $state<string | null>(null);
    let items = $state<any[]>([]);

    // Post Creation State
    let editorData = $state<any>(null);
    let renderKey = $state(0);
    let creating = $state(false);

    async function loadFeed() {
        if (!groupId) return;

        loading = true;
        error = null;

        try {
            const res = await groupApi.getFeed(groupId);

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Fehler: ${res.status} ${res.statusText}`);
            }

            const json = await res.json();
            const rawActivities = json.data || [];

            // Process items
            items = rawActivities
                .map((a: any) => mapActivity(a))
                .filter(Boolean);
        } catch (e: any) {
            console.error("[GroupFeed] Error:", e);
            error = await extractErrorMessage(e);
        } finally {
            loading = false;
        }
    }

    function mapActivity(a: any) {
        const action = a.attributes?.action;

        if (action === "post.created") {
            let payload = a.attributes?.payload;
            if (typeof payload === "string") {
                try {
                    payload = JSON.parse(payload);
                } catch (e) {
                    console.error("Failed to parse payload", e);
                }
            }

            return {
                key: a.id, // Unique Activity ID for Svelte Loop
                id: a.attributes?.["object-id"],
                type: "post",
                attributes: {
                    body: payload?.body || payload?.body_snippet || "",
                    "created-at": a.attributes?.["created-at"],
                    "created-by": a.relationships?.actor?.data?.id,
                    payload: payload,
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
        if (!editorData || editorData.blocks?.length === 0) return;
        creating = true;
        try {
            const res = await groupApi.createPost(groupId, {
                body: JSON.stringify(editorData),
            });
            if (res.ok) {
                editorData = null;
                renderKey++; // Reset editor
                await loadFeed();
            } else {
                const msg = await extractErrorMessage(res);
                toast.error(msg);
            }
        } catch (e) {
            console.error(e);
            const msg = await extractErrorMessage(e);
            toast.error(msg);
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
            } else {
                const msg = await extractErrorMessage(res);
                toast.error(msg);
            }
        } catch (e) {
            console.error(e);
            const msg = await extractErrorMessage(e);
            toast.error(msg);
        }
    }

    async function handleUpdatePost(postId: string, content: string) {
        try {
            const res = await groupApi.updatePost(groupId, postId, {
                body: content,
            });
            if (res.ok) {
                await loadFeed();
            } else {
                const msg = await extractErrorMessage(res);
                toast.error(msg);
            }
        } catch (e) {
            console.error(e);
            const msg = await extractErrorMessage(e);
            toast.error(msg);
        }
    }

    // SSE Handling
    let eventSource: EventSource | null = null;

    function setupStream(id: string) {
        if (eventSource) eventSource.close();

        const token = get(auth).accessToken;
        // Ensure API_BASE does not have trailing slash if we add one, or handle it.
        // config.ts says API_BASE is e.g. /api or https://...
        const url = `${API_BASE}/groups/${id}/stream?token=${token}`;

        eventSource = new EventSource(url);

        eventSource.onopen = () => {};

        eventSource.addEventListener("activity", (e) => {
            // Refresh feed
            // Use untrack or just call it? It's async.
            loadFeed();
        });

        eventSource.onerror = (e) => {
            // console.error("[SSE] Error", e);
            // Standard EventSource behavior is to retry.
            // implementation details vary by browser.
            if (eventSource?.readyState === EventSource.CLOSED) {
                // Closed
            }
        };
    }

    // React to groupId changes
    $effect(() => {
        if (groupId) {
            untrack(() => {
                loadFeed();
                setupStream(groupId);
            });
        }

        return () => {
            if (eventSource) {
                eventSource.close();
                eventSource = null;
            }
        };
    });
</script>

<div class="space-y-6">
    <!-- Post Creation -->
    <div
        class="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700 shadow-sm relative z-20"
    >
        <div
            class="mb-3 block w-full rounded-lg border-0 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-900 dark:text-white ring-1 ring-inset ring-zinc-200 dark:ring-zinc-700 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600 sm:text-sm sm:leading-6 px-3 py-2 transition-all"
        >
            {#key renderKey}
                <Editor
                    placeholder="Schreibe etwas..."
                    onChange={(data) => (editorData = data)}
                />
            {/key}
        </div>
        <div class="flex justify-end">
            <button
                onclick={handleCreatePost}
                disabled={!editorData ||
                    editorData.blocks?.length === 0 ||
                    creating}
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
        <div class="space-y-2">
            <ErrorAlert {error} />
            <button
                class="block mx-auto text-sm text-blue-600 hover:underline"
                onclick={loadFeed}>Nochmal versuchen</button
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
