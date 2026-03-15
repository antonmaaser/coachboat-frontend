<script lang="ts">
    import { page } from "$app/state";
    import { groupApi, type GroupMemberRole } from "$lib/api/groups";
    import { auth, hasPermission } from "$lib/stores/auth";
    import { onMount, onDestroy } from "svelte";
    import GroupMembersModal from "$lib/components/GroupMembersModal.svelte";
    import type {
        GroupResource,
        GroupActivityResource,
        GroupPostResource,
    } from "$lib/api/types";
    import {
        Users,
        ArrowLeft,
        Loader,
        Send,
        EllipsisVertical,
        Pencil,
        Trash2,
        MessageSquare,
        Activity,
        Pin,
    } from "lucide-svelte";
    import Editor from "$lib/components/editor/Editor.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import ProfileAvatar from "$lib/components/ui/ProfileAvatar.svelte";

    const groupId = page.params.id;
    const MAX_RECONNECT_ATTEMPTS = 6;

    let group = $state<GroupResource | null>(null);
    let loading = $state(true);
    let error = $state("");
    let showMembersModal = $state(false);

    let viewMode = $state<"posts" | "activity">("posts");

    // Posts state
    let posts = $state<GroupPostResource[]>([]);
    let postsLoading = $state(true);
    let postsError = $state("");
    let newPostData = $state<any>(null);
    let isSubmitting = $state(false);

    // Activity state
    let activityFeed = $state<GroupActivityResource[]>([]);
    let activityLoading = $state(true);
    let activityError = $state("");

    // SSE state
    let connection: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = $state(0);
    let disposed = false;

    class PostState {
        isEditing = $state(false);
        showMenu = $state(false);
        currentEditData = $state<any>(null);
        isPinned = $state(false);
    }

    let postStates = $state(new Map<string, PostState>());

    function getPostState(id: string) {
        if (!postStates.has(id)) {
            postStates.set(id, new PostState());
        }
        return postStates.get(id)!;
    }

    async function loadGroup() {
        loading = true;
        error = "";
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
        postsError = "";
        try {
            const res = await groupApi.listPosts(groupId, { "page[limit]": 100 });
            if (res.ok) {
                const json = await res.json();
                posts = json.data || [];
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

    async function loadActivity() {
        if (!groupId) return;
        activityLoading = true;
        activityError = "";
        try {
            const res = await groupApi.getFeed(groupId, { "page[limit]": 100 });
            if (res.ok) {
                const json = await res.json();
                activityFeed = json.data || [];
            } else {
                activityError = "Fehler beim Laden der Aktivität";
            }
        } catch (e) {
            console.error(e);
            activityError = "Fehler beim Laden der Aktivität";
        } finally {
            activityLoading = false;
        }
    }

    function clearReconnectTimer() {
        if (!reconnectTimer) return;
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    function closeConnection() {
        if (!connection) return;
        connection.close();
        connection = null;
    }

    function scheduleReconnect() {
        if (disposed) return;
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.warn("SSE reconnect exhausted");
            return;
        }

        const delayMs = Math.min(30000, 1000 * 2 ** reconnectAttempts);
        reconnectAttempts += 1;

        clearReconnectTimer();
        reconnectTimer = setTimeout(() => {
            connectSSE();
        }, delayMs);
    }

    function connectSSE() {
        if (!groupId || disposed) return;

        clearReconnectTimer();
        closeConnection();

        try {
            const sseUrl = groupApi.streamUrl(
                groupId,
                $auth.accessToken || undefined,
                $auth.organizationId || null,
            );

            connection = new EventSource(sseUrl);

            connection.onopen = () => {
                reconnectAttempts = 0;
            };

            connection.onmessage = () => {
                void Promise.all([loadPosts(), loadActivity()]);
            };

            connection.onerror = () => {
                closeConnection();
                scheduleReconnect();
            };
        } catch (e) {
            console.error("SSE Connection Error", e);
            scheduleReconnect();
        }
    }

    function parseBody(body: any) {
        if (!body) return null;
        if (typeof body === "object") return body;
        try {
            const parsed = JSON.parse(body);
            if (parsed && Array.isArray(parsed.blocks)) return parsed;
        } catch {
            // Not JSON Editor data.
        }
        return null;
    }

    function getInitialEditData(body: string | undefined) {
        const parsed = parseBody(body);
        if (parsed) return parsed;
        return {
            blocks: [
                {
                    type: "paragraph",
                    data: { text: body || "" },
                },
            ],
        };
    }

    function formatDate(dateString: string) {
        if (!dateString) return "";
        return new Intl.DateTimeFormat("de-DE", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(new Date(dateString));
    }

    function normalizeText(value: unknown): string {
        return typeof value === "string" ? value.trim() : "";
    }

    function roleLabel(role: GroupMemberRole | null): string {
        if (role === "owner") return "Inhaber";
        if (role === "admin") return "Administrator";
        if (role === "moderator") return "Moderator";
        if (role === "viewer") return "Zuschauer";
        if (role === "member") return "Mitglied";
        return "";
    }

    function roleColor(role: GroupMemberRole | null): string {
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

    async function getCanonicalPost(postId: string) {
        if (!groupId) return null;
        try {
            const res = await groupApi.getPost(groupId, postId);
            if (!res.ok) return null;
            const json = await res.json();
            return (json.data || json) as GroupPostResource;
        } catch (e) {
            console.error("Failed to load canonical post", e);
            return null;
        }
    }

    async function handleCreatePost() {
        if (!newPostData || !groupId) return;

        if (
            !newPostData.blocks ||
            newPostData.blocks.length === 0 ||
            (newPostData.blocks.length === 1 &&
                !newPostData.blocks[0].data.text)
        ) {
            return;
        }

        isSubmitting = true;
        try {
            const body = JSON.stringify(newPostData);
            const res = await groupApi.createPost(groupId, { body });

            if (res.ok) {
                const json = await res.json().catch(() => ({}));
                const created = json?.data as GroupPostResource | undefined;

                if (created?.id) {
                    posts = [created, ...posts];
                } else {
                    await loadPosts();
                }

                newPostData = {
                    blocks: [{ type: "paragraph", data: { text: "" } }],
                };

                void loadActivity();
            } else {
                console.error("Failed to create post");
            }
        } catch (e) {
            console.error(e);
        } finally {
            isSubmitting = false;
        }
    }

    async function startEditingPost(postId: string) {
        const state = getPostState(postId);
        state.showMenu = false;

        const canonical = await getCanonicalPost(postId);
        const source = canonical || posts.find((p) => p.id === postId);
        if (!source) return;

        state.currentEditData = getInitialEditData(source.attributes.body);
        state.isPinned = Boolean(source.attributes["is-pinned"]);
        state.isEditing = true;
    }

    async function handleDeletePost(postId: string) {
        if (!groupId) return;
        if (!confirm("Beitrag wirklich löschen?")) return;

        try {
            const res = await groupApi.deletePost(groupId, postId);
            if (res.ok) {
                posts = posts.filter((p) => p.id !== postId);
                postStates.delete(postId);
                void loadActivity();
            }
        } catch (e) {
            console.error(e);
        }
    }

    async function handleUpdatePost(postId: string) {
        if (!groupId) return;

        const state = getPostState(postId);
        if (!state.currentEditData) return;

        const content = JSON.stringify(state.currentEditData);

        try {
            const res = await groupApi.updatePost(groupId, postId, {
                body: content,
                is_pinned: state.isPinned,
            });

            if (!res.ok) return;

            let updated: GroupPostResource | null = null;
            try {
                const json = await res.json();
                updated = (json?.data || null) as GroupPostResource | null;
            } catch {
                // Response can be metadata-only depending on backend behavior.
            }

            if (!updated) {
                updated = await getCanonicalPost(postId);
            }

            if (updated) {
                posts = posts.map((p) => (p.id === postId ? updated! : p));
            } else {
                posts = posts.map((p) =>
                    p.id === postId
                        ? {
                              ...p,
                              attributes: {
                                  ...p.attributes,
                                  body: content,
                                  "is-pinned": state.isPinned,
                              },
                          }
                        : p,
                );
            }

            state.isEditing = false;
            void loadActivity();
        } catch (e) {
            console.error(e);
        }
    }

    onMount(async () => {
        await loadGroup();
        await Promise.all([loadPosts(), loadActivity()]);
        connectSSE();
    });

    onDestroy(() => {
        disposed = true;
        clearReconnectTimer();
        closeConnection();
    });

    const currentUser = $derived($auth.user);
    const canViewMembers = $derived(
        hasPermission(currentUser, "groups:read", groupId) ||
            hasPermission(currentUser, "groups:update:any", groupId),
    );
    const canCreatePost = $derived(
        hasPermission(currentUser, "posts:create", groupId),
    );
    const canUpdateAnyPost = $derived(
        hasPermission(currentUser, "posts:update:any", groupId),
    );
    const canDeleteAnyPost = $derived(
        hasPermission(currentUser, "posts:delete:any", groupId),
    );

    const memberRoles = $derived.by(() => {
        const roles = new Map<string, GroupMemberRole>();
        for (const member of group?.attributes.members || []) {
            const memberId = normalizeText(member?.id);
            if (!memberId) continue;
            roles.set(memberId, member.role);
        }
        return roles;
    });

    type PostAuthorDetails = {
        id: string | null;
        displayName: string;
        role: GroupMemberRole | null;
        isCurrentUser: boolean;
    };

    const postAuthorDetails = $derived.by(() => {
        const byPostId = new Map<string, PostAuthorDetails>();
        for (const activity of activityFeed) {
            if (activity.attributes.action !== "post.created") continue;
            const postId = String(activity.attributes["object-id"] || "");
            if (!postId) continue;

            const actorIdRaw = activity.relationships?.actor?.data?.id;
            const actorId = actorIdRaw ? String(actorIdRaw) : null;
            const actorMeta = (activity.relationships?.actor?.meta ||
                {}) as Record<string, unknown>;

            const firstName = normalizeText(
                actorMeta["first-name"] ?? actorMeta.firstName,
            );
            const lastName = normalizeText(
                actorMeta["last-name"] ?? actorMeta.lastName ?? actorMeta.name,
            );
            const displayNameFromMeta = normalizeText(
                actorMeta["display-name"] ??
                    actorMeta.displayName ??
                    actorMeta.fullName ??
                    actorMeta.username,
            );
            const displayNameFromCurrentUser =
                actorId && actorId === currentUser?.id
                    ? [
                          normalizeText(currentUser?.firstName),
                          normalizeText(currentUser?.name),
                      ]
                          .filter(Boolean)
                          .join(" ")
                    : "";
            const displayName =
                [firstName, lastName].filter(Boolean).join(" ") ||
                displayNameFromMeta ||
                displayNameFromCurrentUser ||
                "Unbekannter Autor";
            const role = actorId ? (memberRoles.get(actorId) ?? null) : null;

            byPostId.set(postId, {
                id: actorId,
                displayName,
                role,
                isCurrentUser: Boolean(actorId && actorId === currentUser?.id),
            });
        }
        return byPostId;
    });
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
                    <h1 class="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
                        {group.attributes.title}
                    </h1>
                    <p class="text-zinc-600 dark:text-zinc-400">
                        {group.attributes.description || "Keine Beschreibung"}
                    </p>
                </div>

                {#if canViewMembers}
                    <Button
                        variant="solid"
                        tone="neutral"
                        size="sm"
                        onclick={() => (showMembersModal = true)}
                    >
                        <Users class="w-4 h-4" />
                        Mitglieder ({group.attributes.members?.length || 0})
                    </Button>
                {/if}
            </div>

            <div class="border-t border-zinc-100 dark:border-zinc-700 pt-6 space-y-4">
                <div
                    class="inline-flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1 border border-zinc-200 dark:border-zinc-700"
                >
                    <Button
                        variant="segmented"
                        size="sm"
                        active={viewMode === "posts"}
                        onclick={() => (viewMode = "posts")}
                    >
                        <MessageSquare class="w-4 h-4" />
                        Beiträge
                    </Button>
                    <Button
                        variant="segmented"
                        size="sm"
                        active={viewMode === "activity"}
                        onclick={() => (viewMode = "activity")}
                    >
                        <Activity class="w-4 h-4" />
                        Aktivität
                    </Button>
                </div>

                {#if viewMode === "posts"}
                    <div class="space-y-6">
                        {#if canCreatePost}
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
                                    <Button
                                        variant="solid"
                                        tone="primary"
                                        onclick={handleCreatePost}
                                        disabled={isSubmitting}
                                    >
                                        {#if isSubmitting}
                                            <Loader class="w-4 h-4 animate-spin" />
                                        {:else}
                                            <Send class="w-4 h-4" />
                                        {/if}
                                        Posten
                                    </Button>
                                </div>
                            </div>
                        {/if}

                        {#if postsLoading}
                            <div class="flex justify-center p-8">
                                <Loader class="w-8 h-8 animate-spin text-zinc-400" />
                            </div>
                        {:else if postsError}
                            <div class="text-sm text-red-600">{postsError}</div>
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
                                    {@const author = postAuthorDetails.get(post.id)}
                                    {@const fallbackAuthorId = post.attributes["created-by"]
                                        ? String(post.attributes["created-by"])
                                        : null}
                                    {@const authorId = author?.id ?? fallbackAuthorId}
                                    {@const isAuthor =
                                        !!authorId && authorId === currentUser?.id}
                                    {@const authorRole =
                                        author?.role ||
                                        (authorId
                                            ? memberRoles.get(authorId) || null
                                            : null)}
                                    {@const authorName =
                                        author?.displayName ||
                                        (isAuthor
                                            ? [
                                                  normalizeText(
                                                      currentUser?.firstName,
                                                  ),
                                                  normalizeText(
                                                      currentUser?.name,
                                                  ),
                                              ]
                                                  .filter(Boolean)
                                                  .join(" ") ||
                                              currentUser?.email ||
                                              "Du"
                                            : "Unbekannter Autor")}
                                    {@const createdAt =
                                        post.attributes["created-at"] || ""}
                                    {@const updatedAt =
                                        post.attributes["updated-at"] || ""}
                                    {@const wasEdited =
                                        !!createdAt &&
                                        !!updatedAt &&
                                        createdAt !== updatedAt}
                                    {@const canEdit =
                                        canUpdateAnyPost ||
                                        (isAuthor &&
                                            hasPermission(
                                                currentUser,
                                                "posts:update:own",
                                                groupId,
                                            ))}
                                    {@const canDelete =
                                        canDeleteAnyPost ||
                                        (isAuthor &&
                                            hasPermission(
                                                currentUser,
                                                "posts:delete:own",
                                                groupId,
                                            ))}
                                    {@const postBody = parseBody(
                                        post.attributes.body,
                                    )}

                                    <div
                                        class="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-3"
                                    >
                                        <div class="flex justify-between items-start gap-4">
                                            <div class="flex items-start gap-3 min-w-0">
                                                <ProfileAvatar
                                                    name={authorName}
                                                    fallback="U"
                                                    size="lg"
                                                    class="shrink-0"
                                                    ariaLabel={`Avatar von ${authorName}`}
                                                />
                                                <div class="space-y-1 min-w-0">
                                                    <div
                                                        class="flex flex-wrap items-center gap-2"
                                                    >
                                                        <p
                                                            class="text-sm font-semibold text-zinc-900 dark:text-white truncate"
                                                        >
                                                            {authorName}
                                                        </p>
                                                        {#if isAuthor}
                                                            <span
                                                                class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                                            >
                                                                Du
                                                            </span>
                                                        {/if}
                                                        {#if authorRole}
                                                            <span
                                                                class={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${roleColor(
                                                                    authorRole,
                                                                )}`}
                                                            >
                                                                {roleLabel(
                                                                    authorRole,
                                                                )}
                                                            </span>
                                                        {/if}
                                                        {#if post.attributes["is-pinned"]}
                                                            <span
                                                                class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                                            >
                                                                <Pin
                                                                    class="w-3 h-3"
                                                                />
                                                                Angepinnt
                                                            </span>
                                                        {/if}
                                                    </div>
                                                    <div
                                                        class="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400"
                                                    >
                                                        <span>
                                                            {formatDate(createdAt)}
                                                        </span>
                                                        {#if wasEdited}
                                                            <span
                                                                class="text-zinc-400 dark:text-zinc-500"
                                                            >
                                                                •
                                                            </span>
                                                            <span>
                                                                Bearbeitet{" "}
                                                                {formatDate(
                                                                    updatedAt,
                                                                )}
                                                            </span>
                                                        {/if}
                                                    </div>
                                                </div>
                                            </div>

                                            {#if canDelete || canEdit}
                                                <div class="relative">
                                                    <Button
                                                        variant="icon"
                                                        tone="neutral"
                                                        size="xs"
                                                        iconOnly
                                                        ariaLabel="Beitragsaktionen"
                                                        onclick={() =>
                                                            (state.showMenu =
                                                                !state.showMenu)}
                                                    >
                                                        <EllipsisVertical
                                                            class="w-4 h-4"
                                                        />
                                                    </Button>

                                                    {#if state.showMenu}
                                                        <div
                                                            class="absolute right-0 mt-1 w-36 bg-white dark:bg-zinc-800 rounded shadow-lg border border-zinc-200 dark:border-zinc-700 z-10 py-1"
                                                        >
                                                            <Button
                                                                variant="overlay"
                                                                type="button"
                                                                onclick={() =>
                                                                    (state.showMenu = false)}
                                                                ariaLabel="Menü schließen"
                                                            ></Button>

                                                            {#if canEdit}
                                                                <Button
                                                                    variant="menu"
                                                                    tone="neutral"
                                                                    size="xs"
                                                                    align="left"
                                                                    onclick={() =>
                                                                        startEditingPost(
                                                                            post.id,
                                                                        )}
                                                                >
                                                                    <Pencil
                                                                        class="w-3 h-3"
                                                                    />
                                                                    Bearbeiten
                                                                </Button>
                                                            {/if}

                                                            {#if canDelete}
                                                                <Button
                                                                    variant="menu"
                                                                    tone="danger"
                                                                    size="xs"
                                                                    align="left"
                                                                    onclick={() =>
                                                                        handleDeletePost(
                                                                            post.id,
                                                                        )}
                                                                >
                                                                    <Trash2
                                                                        class="w-3 h-3"
                                                                    />
                                                                    Löschen
                                                                </Button>
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
                                            <label
                                                class="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300"
                                            >
                                                <input
                                                    type="checkbox"
                                                    bind:checked={state.isPinned}
                                                    class="rounded border-zinc-300 text-blue-600"
                                                />
                                                Beitrag anpinnen
                                            </label>
                                            <div class="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    tone="neutral"
                                                    size="xs"
                                                    onclick={() =>
                                                        (state.isEditing =
                                                            false)}
                                                >
                                                    Abbrechen
                                                </Button>
                                                <Button
                                                    variant="solid"
                                                    tone="primary"
                                                    size="xs"
                                                    onclick={() =>
                                                        handleUpdatePost(
                                                            post.id,
                                                        )}
                                                >
                                                    Speichern
                                                </Button>
                                            </div>
                                        {:else}
                                            <div
                                                class="text-sm text-zinc-700 dark:text-zinc-300"
                                            >
                                                {#if postBody}
                                                    <Editor
                                                        data={postBody}
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
                {:else}
                    <div class="space-y-4">
                        {#if activityLoading}
                            <div class="flex justify-center p-8">
                                <Loader class="w-8 h-8 animate-spin text-zinc-400" />
                            </div>
                        {:else if activityError}
                            <div class="text-sm text-red-600">{activityError}</div>
                        {:else if activityFeed.length === 0}
                            <div
                                class="text-center p-8 text-zinc-500 dark:text-zinc-400 italic"
                            >
                                Noch keine Aktivität.
                            </div>
                        {:else}
                            {#each activityFeed as activity (activity.id)}
                                {@const actor = activity.relationships?.actor}
                                <div
                                    class="bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4"
                                >
                                    <div class="flex items-start justify-between gap-4">
                                        <div class="space-y-1">
                                            <p
                                                class="text-sm font-medium text-zinc-900 dark:text-white"
                                            >
                                                {activity.attributes.summary ||
                                                    activity.attributes.action}
                                            </p>
                                            <p
                                                class="text-xs text-zinc-500 dark:text-zinc-400"
                                            >
                                                {#if actor?.meta?.["first-name"]}
                                                    {actor.meta["first-name"]}
                                                    {actor.meta.name}
                                                {:else if actor?.meta?.name}
                                                    {actor.meta.name}
                                                {:else}
                                                    System
                                                {/if}
                                            </p>
                                        </div>
                                        <p
                                            class="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap"
                                        >
                                            {formatDate(
                                                activity.attributes[
                                                    "created-at"
                                                ],
                                            )}
                                        </p>
                                    </div>
                                </div>
                            {/each}
                        {/if}
                    </div>
                {/if}
            </div>
        </div>
    {/if}

    {#if showMembersModal && group}
        <GroupMembersModal bind:show={showMembersModal} {group} />
    {/if}
</div>
