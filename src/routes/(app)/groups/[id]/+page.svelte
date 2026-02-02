<script lang="ts">
    import { page } from "$app/state";
    import { groupApi } from "$lib/api/groups";
    import { auth, hasPermission } from "$lib/stores/auth";
    import { onMount, onDestroy } from "svelte";
    import GroupMembersModal from "$lib/components/GroupMembersModal.svelte";
    import {
        Users,
        Settings,
        ArrowLeft,
        Loader,
        Send,
        EllipsisVertical,
        Pencil,
        Trash2,
        Pin,
    } from "lucide-svelte";
    import Editor from "$lib/components/editor/Editor.svelte";
    import { client } from "$lib/api/client"; // For SSE if needed, or window.EventSource

    const groupId = page.params.id;
    let group = $state<any>(null);
    let loading = $state(true);
    let error = $state("");
    let showMembersModal = $state(false);

    // Feed State
    let posts = $state<any[]>([]);
    let postsLoading = $state(true);
    let postsError = $state("");
    let newPostData = $state<any>(null);
    let isSubmitting = $state(false);
    let connection: EventSource | null = null;

    // Post Item State Management
    class PostState {
        isEditing = $state(false);
        showMenu = $state(false);
        currentEditData = $state<any>(null);
    }
    // Map to hold state for each post, keyed by ID
    let postStates = $state(new Map<string, PostState>());

    function getPostState(id: string) {
        if (!postStates.has(id)) {
            postStates.set(id, new PostState());
        }
        return postStates.get(id)!;
    }

    async function loadGroup() {
        loading = true;
        try {
            if (!groupId) return;
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

    async function loadPosts() {
        if (!groupId) return;
        postsLoading = true;
        try {
            const res = await groupApi.getFeed(groupId);
            if (res.ok) {
                const json = await res.json();
                posts = json.data || json;
            } else {
                postsError = "Fehler beim Laden der Beiträge";
            }
        } catch (e) {
            console.error(e);
            postsError = "Fehler beim Laden der Beiträge";
        } finally {
            postsLoading = false;
        }
    }

    function connectSSE() {
        if (!groupId) return;
        // Close existing
        if (connection) connection.close();

        const url = `/api/groups/${groupId}/feed/stream`;
        // We need to use specific browser API or library if auth headers are needed.
        // Usually EventSource doesn't support headers.
        // If the backend requires auth via cookie, it works.
        // If via header, we might need a polyfill or token in URL.
        // Assuming cookie or existing mechanism.
        // Checking GroupFeed implementation... it used window.EventSource logic or library?
        // It likely used the native EventSource.
        // Let's assume the native one works (maybe via cookie).

        try {
            // Check if we need to append token
            const token = $auth.accessToken;
            const sseUrl = token
                ? `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/groups/${groupId}/feed/stream?token=${token}`
                : `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/groups/${groupId}/feed/stream`;

            connection = new EventSource(sseUrl);

            connection.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === "post_created") {
                        // Check if we already have it
                        if (!posts.find((p) => p.id === data.data.id)) {
                            posts = [data.data, ...posts];
                        }
                    } else if (data.type === "post_updated") {
                        posts = posts.map((p) =>
                            p.id === data.data.id ? data.data : p,
                        );
                    } else if (data.type === "post_deleted") {
                        posts = posts.filter((p) => p.id !== data.data.id);
                    }
                } catch (e) {
                    console.error("SSE Parse Error", e);
                }
            };
        } catch (e) {
            console.error("SSE Connection Error", e);
        }
    }

    async function handleCreatePost() {
        if (!newPostData || !groupId) return;
        // Check if empty
        if (
            !newPostData.blocks ||
            newPostData.blocks.length === 0 ||
            (newPostData.blocks.length === 1 &&
                !newPostData.blocks[0].data.text)
        )
            return;

        isSubmitting = true;
        try {
            const body = JSON.stringify(newPostData);
            const res = await groupApi.createPost(groupId, { body });

            if (res.ok) {
                newPostData = {
                    blocks: [
                        {
                            type: "paragraph",
                            data: { text: "" },
                        },
                    ],
                }; // Clear
                loadPosts(); // Refresh (SSE should also handle it, but fallback)
            } else {
                console.error("Failed to create post");
            }
        } catch (e) {
            console.error(e);
        } finally {
            isSubmitting = false;
        }
    }

    async function handleDeletePost(id: string) {
        if (!confirm("Beitrag wirklich löschen?")) return;
        try {
            const res = await groupApi.deletePost(groupId, id);
            if (res.ok) {
                posts = posts.filter((p) => p.id !== id);
                postStates.delete(id);
            }
        } catch (e) {
            console.error(e);
        }
    }

    async function handleUpdatePost(
        id: string,
        content: string,
        isPinned: boolean,
    ) {
        try {
            const res = await groupApi.updatePost(groupId, id, {
                body: content,
                is_pinned: isPinned,
            });
            if (res.ok) {
                const json = await res.json();
                posts = posts.map((p) => (p.id === id ? json.data : p));
                const state = postStates.get(id);
                if (state) state.isEditing = false;
            }
        } catch (e) {
            console.error(e);
        }
    }

    function parseBody(body: any) {
        if (!body) return null;
        if (typeof body === "object") return body;
        try {
            const parsed = JSON.parse(body);
            if (parsed && Array.isArray(parsed.blocks)) return parsed;
        } catch (e) {
            // Not JSON
        }
        return null; // or fallback
    }

    function formatDate(dateString: string) {
        if (!dateString) return "";
        return new Intl.DateTimeFormat("de-DE", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(new Date(dateString));
    }

    function getInitialEditData(post: any) {
        const postData = parseBody(post.attributes.body);
        if (postData) return postData;
        return {
            blocks: [
                {
                    type: "paragraph",
                    data: {
                        text: post.attributes.body || "",
                    },
                },
            ],
        };
    }

    onMount(() => {
        loadGroup();
        loadPosts();
        connectSSE();
    });

    onDestroy(() => {
        if (connection) connection.close();
    });

    const currentUser = $derived($auth.user);
    const canManageGroup = $derived(
        hasPermission(currentUser, "groups:manage"),
    );
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

                <!-- Feed Content -->
                <div class="space-y-6">
                    <!-- Create Post -->
                    <div
                        class="bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4"
                    >
                        <Editor
                            data={{
                                blocks: [
                                    {
                                        type: "paragraph",
                                        data: { text: "" },
                                    },
                                ],
                            }}
                            onChange={(d) => (newPostData = d)}
                            placeholder="Schreibe etwas..."
                        />
                        <div class="flex justify-end mt-2">
                            <button
                                onclick={handleCreatePost}
                                disabled={isSubmitting}
                                class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {#if isSubmitting}
                                    <Loader class="w-4 h-4 animate-spin" />
                                {:else}
                                    <Send class="w-4 h-4" />
                                {/if}
                                Posten
                            </button>
                        </div>
                    </div>

                    <!-- Posts List -->
                    {#if postsLoading}
                        <div class="flex justify-center p-8">
                            <Loader
                                class="w-8 h-8 animate-spin text-zinc-400"
                            />
                        </div>
                    {:else if posts.length === 0}
                        <div
                            class="text-center p-8 text-zinc-500 dark:text-zinc-400 italic"
                        >
                            Noch keine Beiträge.
                        </div>
                    {:else}
                        <div class="space-y-4">
                            {#each posts as post (post.id)}
                                {@const state = getPostState(post.id)}
                                {@const isAuthor =
                                    post.attributes["created-by"] ===
                                    currentUser?.id}
                                {@const canDelete = isAuthor || canManageGroup}
                                {@const postData = parseBody(
                                    post.attributes.body,
                                )}

                                <div
                                    class="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-3 relative {state.isEditing
                                        ? 'z-30'
                                        : 'z-0'}"
                                >
                                    <div
                                        class="flex justify-between items-start"
                                    >
                                        <div class="flex items-center gap-2">
                                            <div
                                                class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs"
                                            >
                                                {(
                                                    (post.relationships?.user
                                                        ?.attributes?.[
                                                        "first-name"
                                                    ]?.[0] || "") +
                                                        (post.relationships
                                                            ?.user?.attributes
                                                            ?.name?.[0] ||
                                                            "") || "?"
                                                ).toUpperCase()}
                                            </div>
                                            <div>
                                                <p
                                                    class="text-sm font-medium text-zinc-900 dark:text-white"
                                                >
                                                    {#if post.relationships?.user?.attributes?.["first-name"]}
                                                        {post.relationships
                                                            ?.user
                                                            ?.attributes?.[
                                                            "first-name"
                                                        ]}
                                                        {post.relationships
                                                            ?.user?.attributes
                                                            ?.name}
                                                    {:else}
                                                        {post.relationships
                                                            ?.user?.attributes
                                                            ?.name ||
                                                            "Unbekannt"}
                                                    {/if}
                                                </p>
                                                <p
                                                    class="text-xs text-zinc-500"
                                                >
                                                    {formatDate(
                                                        post.attributes[
                                                            "created-at"
                                                        ],
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        {#if canDelete || isAuthor}
                                            <div class="relative">
                                                <button
                                                    onclick={() =>
                                                        (state.showMenu =
                                                            !state.showMenu)}
                                                    class="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                                >
                                                    <EllipsisVertical
                                                        class="w-4 h-4"
                                                    />
                                                </button>

                                                {#if state.showMenu}
                                                    <div
                                                        class="absolute right-0 mt-1 w-32 bg-white dark:bg-zinc-800 rounded shadow-lg border border-zinc-200 dark:border-zinc-700 z-10 py-1"
                                                        role="menu"
                                                        tabindex="-1"
                                                        onclick={() =>
                                                            (state.showMenu = false)}
                                                        onkeydown={(e) =>
                                                            e.key ===
                                                                "Escape" &&
                                                            (state.showMenu = false)}
                                                    >
                                                        <button
                                                            type="button"
                                                            class="fixed inset-0 z-[-1] cursor-default w-full h-full block"
                                                            onclick={() =>
                                                                (state.showMenu = false)}
                                                            aria-label="Close menu"
                                                        ></button>

                                                        {#if isAuthor}
                                                            <button
                                                                onclick={() => {
                                                                    state.isEditing = true;
                                                                    state.showMenu = false;
                                                                    state.currentEditData =
                                                                        getInitialEditData(
                                                                            post,
                                                                        );
                                                                }}
                                                                class="w-full text-left px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 flex items-center gap-2"
                                                            >
                                                                <Pencil
                                                                    class="w-3 h-3"
                                                                /> Bearbeiten
                                                            </button>
                                                        {/if}

                                                        {#if canDelete}
                                                            <button
                                                                onclick={() =>
                                                                    handleDeletePost(
                                                                        post.id,
                                                                    )}
                                                                class="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                                            >
                                                                <Trash2
                                                                    class="w-3 h-3"
                                                                /> Löschen
                                                            </button>
                                                        {/if}
                                                    </div>
                                                {/if}
                                            </div>
                                        {/if}
                                    </div>

                                    {#if state.isEditing}
                                        <div
                                            class="border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 bg-zinc-50 dark:bg-zinc-900"
                                        >
                                            <Editor
                                                data={state.currentEditData}
                                                onChange={(data) =>
                                                    (state.currentEditData =
                                                        data)}
                                                placeholder="Post bearbeiten..."
                                            />
                                        </div>
                                        <div class="flex justify-end gap-2">
                                            <button
                                                onclick={() =>
                                                    (state.isEditing = false)}
                                                class="px-3 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-700"
                                            >
                                                Abbrechen
                                            </button>
                                            <button
                                                onclick={() => {
                                                    const stringified =
                                                        JSON.stringify(
                                                            state.currentEditData,
                                                        );
                                                    handleUpdatePost(
                                                        post.id,
                                                        stringified,
                                                        post.attributes
                                                            .is_pinned,
                                                    );
                                                }}
                                                class="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-500"
                                            >
                                                Speichern
                                            </button>
                                        </div>
                                    {:else}
                                        <div
                                            class="text-sm text-zinc-700 dark:text-zinc-300"
                                        >
                                            {#if postData}
                                                <Editor
                                                    data={postData}
                                                    readOnly={true}
                                                />
                                            {:else}
                                                <p class="whitespace-pre-wrap">
                                                    {post.attributes.body}
                                                </p>
                                            {/if}
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    {/if}

    {#if showMembersModal && group}
        <GroupMembersModal bind:show={showMembersModal} {group} />
    {/if}
</div>
