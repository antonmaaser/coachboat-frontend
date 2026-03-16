<script lang="ts">
    import { Mail } from 'lucide-svelte';
    import { auth, hasPermission, type User } from '$lib/stores/auth';
    import {
        messagesApi,
        type ConversationKindFilter,
        type CreateMessageAttributes,
        type ListMessagesParams,
        type MessageTargetKind,
        type MessageListDocument,
    } from '$lib/api/messages';
    import { groupApi } from '$lib/api/groups';
    import { realtimeApi } from '$lib/api/realtime';
    import { userApi } from '$lib/api/users';
    import type {
        ConversationResource,
        GroupResource,
        MessageResource,
        UserResource,
    } from '$lib/api/types';
    import ConversationList from '$lib/components/messages/ConversationList.svelte';
    import MessageComposer from '$lib/components/messages/MessageComposer.svelte';
    import MessageThread from '$lib/components/messages/MessageThread.svelte';
    import {
        getDirectConversationTitle,
        getMessageTimestamp,
    } from '$lib/components/messages/utils';
    import ErrorAlert from '$lib/components/ui/ErrorAlert.svelte';
    import { extractErrorMessage } from '$lib/utils/error';

    type ConversationFilter = ConversationKindFilter | 'all';
    type ComposerMode = 'conversation' | 'new';
    type ComposeTarget = {
        kind: MessageTargetKind;
        id: string;
        label: string;
    };
    const MAX_STREAM_RECONNECT_ATTEMPTS = 6;

    let conversationFilter = $state<ConversationFilter>('all');
    let conversations = $state<ConversationResource[]>([]);
    let conversationsLoading = $state(true);
    let conversationsError = $state('');
    let selectedConversationId = $state<string | null>(null);

    let messages = $state<MessageResource[]>([]);
    let messagesLoading = $state(false);
    let loadingOlderMessages = $state(false);
    let messagesError = $state('');
    let nextCursor = $state<string | null>(null);

    let composerMode = $state<ComposerMode>('new');
    let composerTarget = $state<ComposeTarget | null>(null);
    let createLoading = $state(false);
    let createError = $state('');

    let users = $state<UserResource[]>([]);
    let groups = $state<GroupResource[]>([]);
    let composerTargetsLoading = $state(false);
    let composerTargetsError = $state('');
    let streamConnection: EventSource | null = null;
    let streamReconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let streamReconnectAttempts = $state(0);
    let streamDisposed = false;
    let streamRefreshInFlight = false;

    const selectedConversation = $derived(
        conversations.find((conversation) => conversation.id === selectedConversationId) ||
            null,
    );

    const sortedMessages = $derived(
        [...messages].sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b)),
    );

    const canReadMessages = $derived(
        hasPermission($auth.user, 'messages:read', $auth.organizationId) ||
            hasPermission($auth.user, 'messages:read:any', $auth.organizationId) ||
            hasAnyMessagePermission($auth.user, $auth.organizationId, 'messages:read'),
    );

    const canCreateMessages = $derived(
        hasPermission($auth.user, 'messages:create', $auth.organizationId) ||
            hasPermission($auth.user, 'messages:create:any', $auth.organizationId) ||
            hasAnyMessagePermission($auth.user, $auth.organizationId, 'messages:create'),
    );

    const userOptions = $derived(
        users.map((user) => ({
            value: user.id,
            label: getUserOptionLabel(user),
        })),
    );

    const groupOptions = $derived(
        groups.map((group) => ({
            value: group.id,
            label:
                group.attributes.title?.trim() ||
                `Gruppe ${group.id.slice(0, 8)}`,
        })),
    );

    const hasThreadContext = $derived(
        !!selectedConversation || (composerMode === 'new' && !!composerTarget),
    );
    const threadDisplayTitle = $derived(
        composerMode === 'new' && composerTarget ? composerTarget.label : undefined,
    );
    const threadDisplaySubtitle = $derived(
        composerMode === 'new' && composerTarget
            ? composerTarget.kind === 'group'
                ? 'Gruppenchat'
                : 'Direktnachricht'
            : undefined,
    );

    function hasAnyMessagePermission(
        user: User | null,
        contextId: string | null | undefined,
        prefix: string,
    ): boolean {
        if (!user) return false;

        if (
            user.effective_permissions?.global?.permissions.some((permission) =>
                permission.startsWith(prefix),
            )
        ) {
            return true;
        }

        const resolvedContextId = contextId ?? null;
        if (resolvedContextId && user.effective_permissions?.contexts) {
            const context = user.effective_permissions.contexts.find(
                (item) => item.id === resolvedContextId,
            );
            if (context?.permissions.some((permission) => permission.startsWith(prefix))) {
                return true;
            }
        }

        return (
            user.permissions?.some((permission) => permission.startsWith(prefix)) || false
        );
    }

    function resetThreadState() {
        selectedConversationId = null;
        messages = [];
        messagesError = '';
        nextCursor = null;
        composerMode = 'new';
        composerTarget = null;
    }

    function resolveNextConversationId(
        list: ConversationResource[],
        preferredId: string | null,
    ) {
        if (preferredId && list.some((entry) => entry.id === preferredId)) {
            return preferredId;
        }
        return list[0]?.id || null;
    }

    function buildMessageParams(
        conversation: ConversationResource,
        cursor?: string,
    ): ListMessagesParams | null {
        const params: ListMessagesParams = {
            'page[limit]': 30,
        };

        if (conversation.attributes.kind === 'group') {
            const groupId = conversation.attributes['group-id'];
            if (!groupId) return null;
            params['filter[group-id]'] = groupId;
        } else {
            const recipientId = conversation.attributes['counterpart-user-id'];
            if (!recipientId) return null;
            params['filter[recipient-id]'] = recipientId;
        }

        if (cursor) {
            params['page[cursor]'] = cursor;
        }

        return params;
    }

    function mergeMessages(
        existing: MessageResource[],
        incoming: MessageResource[],
    ): MessageResource[] {
        const merged = new Map<string, MessageResource>();
        for (const message of existing) merged.set(message.id, message);
        for (const message of incoming) merged.set(message.id, message);
        return Array.from(merged.values());
    }

    function getUserOptionLabel(user: UserResource): string {
        return getDirectConversationTitle(user, `Benutzer ${user.id.slice(0, 8)}`);
    }

    async function loadMessages(conversation: ConversationResource, cursor?: string) {
        const params = buildMessageParams(conversation, cursor);
        if (!params) {
            messagesError = 'Unterhaltung hat kein gültiges Ziel.';
            return;
        }

        if (cursor) {
            loadingOlderMessages = true;
        } else {
            messagesLoading = true;
            messagesError = '';
        }

        try {
            const res = await messagesApi.list(params);
            if (!res.ok) {
                messagesError = await extractErrorMessage(res);
                if (!cursor) {
                    messages = [];
                    nextCursor = null;
                }
                return;
            }

            const json = (await res.json()) as MessageListDocument;
            const data = (json.data || []) as MessageResource[];
            messages = cursor ? mergeMessages(messages, data) : mergeMessages([], data);

            nextCursor =
                typeof json.meta?.['next-cursor'] === 'string'
                    ? json.meta['next-cursor']
                    : null;
        } catch (err: any) {
            messagesError = await extractErrorMessage(err);
            if (!cursor) {
                messages = [];
                nextCursor = null;
            }
        } finally {
            if (cursor) {
                loadingOlderMessages = false;
            } else {
                messagesLoading = false;
            }
        }
    }

    async function setActiveConversation(
        list: ConversationResource[],
        conversationId: string | null,
    ) {
        selectedConversationId = conversationId;
        createError = '';

        if (!conversationId) {
            resetThreadState();
            return;
        }

        const nextConversation = list.find((conversation) => conversation.id === conversationId);
        if (!nextConversation) {
            resetThreadState();
            return;
        }

        composerMode = 'conversation';
        composerTarget = null;
        await loadMessages(nextConversation);
    }

    async function loadConversations(
        filter: ConversationFilter,
        preferredConversationId: string | null,
    ) {
        if (!canReadMessages) {
            conversationsLoading = false;
            conversations = [];
            conversationsError = '';
            resetThreadState();
            return;
        }

        conversationsLoading = true;
        conversationsError = '';

        try {
            const params =
                filter === 'all'
                    ? { 'page[limit]': 25 }
                    : { 'filter[kind]': filter, 'page[limit]': 25 };
            const res = await messagesApi.listConversations(params);
            if (!res.ok) {
                conversationsError = await extractErrorMessage(res);
                conversations = [];
                resetThreadState();
                return;
            }

            const json = await res.json();
            const data = (json.data || []) as ConversationResource[];
            conversations = data;

            const nextConversationId = resolveNextConversationId(
                data,
                preferredConversationId,
            );
            await setActiveConversation(data, nextConversationId);
        } catch (err: any) {
            conversationsError = await extractErrorMessage(err);
            conversations = [];
            resetThreadState();
        } finally {
            conversationsLoading = false;
        }
    }

    async function loadComposerTargets() {
        if (!canCreateMessages) {
            composerTargetsLoading = false;
            composerTargetsError = '';
            users = [];
            groups = [];
            return;
        }

        composerTargetsLoading = true;
        composerTargetsError = '';

        try {
            const [usersRes, groupsRes] = await Promise.all([
                userApi.list(),
                groupApi.list(),
            ]);

            if (!usersRes.ok) {
                composerTargetsError = await extractErrorMessage(usersRes);
            } else {
                const usersJson = await usersRes.json();
                users = (usersJson.data || []) as UserResource[];
            }

            if (!groupsRes.ok) {
                composerTargetsError =
                    composerTargetsError || (await extractErrorMessage(groupsRes));
            } else {
                const groupsJson = await groupsRes.json();
                groups = (groupsJson.data || []) as GroupResource[];
            }
        } catch (err: any) {
            composerTargetsError = await extractErrorMessage(err);
            users = [];
            groups = [];
        } finally {
            composerTargetsLoading = false;
        }
    }

    function clearStreamReconnectTimer() {
        if (!streamReconnectTimer) return;
        clearTimeout(streamReconnectTimer);
        streamReconnectTimer = null;
    }

    function closeStreamConnection() {
        if (!streamConnection) return;
        streamConnection.close();
        streamConnection = null;
    }

    function disposeMessageStream() {
        streamDisposed = true;
        streamReconnectAttempts = 0;
        clearStreamReconnectTimer();
        closeStreamConnection();
    }

    async function refreshConversationsFromStream() {
        if (streamRefreshInFlight || !canReadMessages) return;
        streamRefreshInFlight = true;
        try {
            await loadConversations(conversationFilter, selectedConversationId);
        } finally {
            streamRefreshInFlight = false;
        }
    }

    function shouldRefreshFromStreamEvent(event: MessageEvent) {
        if (event.type === 'messages.changed') return true;
        if (event.type !== 'message') return false;

        if (typeof event.data !== 'string' || event.data.trim() === '') {
            return false;
        }

        const rawPayload = event.data.trim().toLowerCase();
        if (rawPayload === 'ping' || rawPayload === 'connected') {
            return false;
        }

        try {
            const parsed = JSON.parse(event.data);
            const eventName =
                typeof parsed?.event === 'string'
                    ? parsed.event
                    : typeof parsed?.type === 'string'
                      ? parsed.type
                      : null;
            if (!eventName) {
                return true;
            }
            return eventName === 'messages.changed';
        } catch {
            return true;
        }
    }

    function scheduleMessageStreamReconnect() {
        if (streamDisposed || !canReadMessages) return;
        if (streamReconnectAttempts >= MAX_STREAM_RECONNECT_ATTEMPTS) return;

        const delayMs = Math.min(30000, 1000 * 2 ** streamReconnectAttempts);
        streamReconnectAttempts += 1;

        clearStreamReconnectTimer();
        streamReconnectTimer = setTimeout(() => {
            connectMessageStream();
        }, delayMs);
    }

    function handleMessageStreamEvent(event: MessageEvent) {
        if (!shouldRefreshFromStreamEvent(event)) return;
        void refreshConversationsFromStream();
    }

    function connectMessageStream() {
        if (streamDisposed || !canReadMessages) return;

        const accessToken = $auth.accessToken;
        if (!accessToken) return;

        clearStreamReconnectTimer();
        closeStreamConnection();

        try {
            const url = realtimeApi.streamUrl(accessToken);
            streamConnection = new EventSource(url);

            streamConnection.onopen = () => {
                streamReconnectAttempts = 0;
                void refreshConversationsFromStream();
            };

            streamConnection.onmessage = (event) => {
                handleMessageStreamEvent(event);
            };

            streamConnection.addEventListener('messages.changed', (event) => {
                handleMessageStreamEvent(event as MessageEvent);
            });

            streamConnection.onerror = () => {
                closeStreamConnection();
                scheduleMessageStreamReconnect();
            };
        } catch {
            scheduleMessageStreamReconnect();
        }
    }

    async function reloadCurrentThread() {
        if (!selectedConversation) return;
        await loadMessages(selectedConversation);
    }

    async function loadOlderMessages() {
        if (!selectedConversation || !nextCursor || loadingOlderMessages) return;
        await loadMessages(selectedConversation, nextCursor);
    }

    async function handleSelectConversation(conversation: ConversationResource) {
        await setActiveConversation(conversations, conversation.id);
    }

    function handleComposeNew(target: ComposeTarget) {
        selectedConversationId = null;
        messages = [];
        messagesError = '';
        nextCursor = null;
        composerMode = 'new';
        composerTarget = target;
        createError = '';
    }

    async function handleCreateMessage(payload: CreateMessageAttributes): Promise<boolean> {
        if (!canCreateMessages) {
            createError = 'Keine Berechtigung zum Senden von Nachrichten.';
            return false;
        }

        createLoading = true;
        createError = '';

        try {
            const res = await messagesApi.create(payload);
            if (!res.ok) {
                createError = await extractErrorMessage(res);
                return false;
            }

            const json = await res.json();
            const created = json.data as MessageResource;

            if (composerMode === 'conversation' && selectedConversationId) {
                messages = mergeMessages(messages, [created]);
                await loadConversations(conversationFilter, selectedConversationId);
            } else {
                await loadConversations(conversationFilter, selectedConversationId);

                const targetConversation = conversations.find((conversation) => {
                    if (payload['group-id']) {
                        return (
                            conversation.attributes.kind === 'group' &&
                            conversation.attributes['group-id'] === payload['group-id']
                        );
                    }

                    return (
                        conversation.attributes.kind === 'direct' &&
                        conversation.attributes['counterpart-user-id'] === payload['recipient-id']
                    );
                });

                if (targetConversation) {
                    await setActiveConversation(conversations, targetConversation.id);
                }
            }

            return true;
        } catch (err: any) {
            createError = await extractErrorMessage(err);
            return false;
        } finally {
            createLoading = false;
        }
    }

    $effect(() => {
        $auth.organizationId;
        conversationFilter;
        if (!canReadMessages) {
            conversationsLoading = false;
            conversations = [];
            conversationsError = '';
            resetThreadState();
            return;
        }

        void loadConversations(conversationFilter, null);
    });

    $effect(() => {
        canReadMessages;
        $auth.organizationId;
        $auth.accessToken;

        if (!canReadMessages || !$auth.accessToken) {
            disposeMessageStream();
            return;
        }

        streamDisposed = false;
        streamReconnectAttempts = 0;
        connectMessageStream();

        return () => {
            disposeMessageStream();
        };
    });

    $effect(() => {
        $auth.organizationId;
        if (!canCreateMessages) {
            composerTargetsLoading = false;
            composerTargetsError = '';
            users = [];
            groups = [];
            return;
        }

        void loadComposerTargets();
    });

</script>

<div class="space-y-6">
    <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
            <Mail class="h-6 w-6 text-zinc-700 dark:text-zinc-300" />
            <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">
                Nachrichten
            </h1>
        </div>

    </div>

    {#if !canReadMessages && !canCreateMessages}
        <section
            class="rounded-xl border border-zinc-200 bg-white p-6 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
            Keine Berechtigung für Nachrichten (`messages:read` oder `messages:create`).
        </section>
    {:else if canReadMessages}
        <div class="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
            <ConversationList
                conversations={conversations}
                selectedConversationId={selectedConversationId}
                loading={conversationsLoading}
                error={conversationsError}
                filterKind={conversationFilter}
                onSelect={handleSelectConversation}
                composeUsers={userOptions}
                composeGroups={groupOptions}
                composeTargetsLoading={composerTargetsLoading}
                composeTargetsError={composerTargetsError}
                onComposeNew={handleComposeNew}
                onFilterChange={(nextFilter) => {
                    conversationFilter = nextFilter;
                }}
            />
            <MessageThread
                conversation={selectedConversation}
                displayTitle={threadDisplayTitle}
                displaySubtitle={threadDisplaySubtitle}
                hasThreadContext={hasThreadContext}
                messages={sortedMessages}
                loading={messagesLoading}
                loadingMore={loadingOlderMessages}
                hasMore={!!nextCursor}
                error={messagesError}
                currentUserId={$auth.user?.id || null}
                onLoadMore={loadOlderMessages}
                onRetry={reloadCurrentThread}
            >
                {#snippet composer()}
                    {#if canCreateMessages}
                        <MessageComposer
                            mode={composerMode}
                            embedded
                            conversation={selectedConversation}
                            users={userOptions}
                            groups={groupOptions}
                            target={composerTarget}
                            externalTargetOnly
                            loading={createLoading}
                            error={createError}
                            disabled={composerTargetsLoading}
                            onSubmit={handleCreateMessage}
                        />
                    {/if}
                {/snippet}
            </MessageThread>
        </div>
    {:else}
        <div class="space-y-4">
            <section
                class="rounded-xl border border-zinc-200 bg-white p-6 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
                Lesen ist nicht erlaubt, aber neue Nachrichten können erstellt werden.
            </section>
            <ErrorAlert error={composerTargetsError} />
            <MessageComposer
                mode="new"
                users={userOptions}
                groups={groupOptions}
                loading={createLoading}
                error={createError}
                disabled={composerTargetsLoading}
                onSubmit={handleCreateMessage}
            />
        </div>
    {/if}
</div>
