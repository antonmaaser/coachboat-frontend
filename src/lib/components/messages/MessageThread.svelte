<script lang="ts">
    import type { Snippet } from 'svelte';
    import { MessageSquare } from 'lucide-svelte';
    import type { ConversationResource, MessageResource } from '$lib/api/types';
    import Button from '$lib/components/ui/Button.svelte';
    import ErrorAlert from '$lib/components/ui/ErrorAlert.svelte';
    import {
        formatDateTime,
        getFirstNameWithLastInitial,
        getConversationTitle,
        isOwnMessage,
    } from './utils';

    let {
        conversation = null,
        displayTitle = undefined,
        displaySubtitle = undefined,
        hasThreadContext = undefined,
        messages = [],
        loading = false,
        loadingMore = false,
        hasMore = false,
        error = '',
        currentUserId = null,
        composer,
        onLoadMore,
        onRetry,
    } = $props<{
        conversation?: ConversationResource | null;
        displayTitle?: string;
        displaySubtitle?: string;
        hasThreadContext?: boolean;
        messages?: MessageResource[];
        loading?: boolean;
        loadingMore?: boolean;
        hasMore?: boolean;
        error?: string;
        currentUserId?: string | null;
        composer?: Snippet;
        onLoadMore?: () => void;
        onRetry?: () => void;
    }>();

    const resolvedHasThreadContext = $derived(hasThreadContext ?? !!conversation);
    const resolvedTitle = $derived(
        displayTitle || (conversation ? getConversationTitle(conversation) : 'Nachrichten'),
    );
    const resolvedSubtitle = $derived(
        displaySubtitle ||
            (conversation
                ? conversation.attributes.kind === 'group'
                    ? 'Gruppenchat'
                    : 'Direktnachricht'
                : ''),
    );

    function getMessageSeriesKey(message: MessageResource, own: boolean): string {
        const senderId = message.attributes['sender-id'];
        if (typeof senderId === 'string' && senderId.trim() !== '') {
            return `sender:${senderId}`;
        }
        if (!own && conversation?.attributes.kind === 'direct') {
            return 'sender:counterpart';
        }
        return own ? 'sender:self' : `message:${message.id}`;
    }

    function getOtherAuthorLabel(message: MessageResource): string {
        const senderSource =
            message.attributes.sender ??
            message.attributes.author ??
            message.attributes.user ??
            null;
        const fromMessage = getFirstNameWithLastInitial(senderSource, '');
        if (fromMessage) {
            return fromMessage;
        }

        if (conversation?.attributes.kind === 'direct') {
            return getFirstNameWithLastInitial(conversation.attributes.counterpart, 'Teilnehmer');
        }

        return 'Teilnehmer';
    }
</script>

<section
    class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
>
    <div class="mb-4 flex items-center justify-between gap-3">
        <div>
            <h2 class="text-sm font-semibold text-zinc-900 dark:text-white">
                {resolvedTitle}
            </h2>
            {#if resolvedSubtitle}
                <p class="text-xs text-zinc-500 dark:text-zinc-400">
                    {resolvedSubtitle}
                </p>
            {/if}
        </div>
    </div>

    <ErrorAlert error={error} />

    {#if !resolvedHasThreadContext}
        <div
            class="flex min-h-44 items-center justify-center rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
        >
            <span class="inline-flex items-center gap-2">
                <MessageSquare class="h-4 w-4" />
                Wähle links eine Unterhaltung aus oder starte eine neue.
            </span>
        </div>
    {:else if loading}
        <div
            class="min-h-44 rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
        >
            Lade Nachrichten...
        </div>
    {:else}
        {#if hasMore}
            <div class="mb-3 flex justify-center">
                <Button
                    variant="outline"
                    tone="neutral"
                    size="sm"
                    loading={loadingMore}
                    onclick={onLoadMore}
                >
                    Ältere Nachrichten laden
                </Button>
            </div>
        {/if}

        {#if messages.length === 0}
            <div
                class="min-h-44 rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
            >
                Noch keine Nachrichten in dieser Unterhaltung.
            </div>
        {:else}
            <div class="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
                {#each messages as message, index (message.id)}
                    {@const own = isOwnMessage(message, currentUserId)}
                    {@const previous = index > 0 ? messages[index - 1] : null}
                    {@const next = index < messages.length - 1 ? messages[index + 1] : null}
                    {@const seriesKey = getMessageSeriesKey(message, own)}
                    {@const previousSeriesKey = previous
                        ? getMessageSeriesKey(previous, isOwnMessage(previous, currentUserId))
                        : null}
                    {@const nextSeriesKey = next
                        ? getMessageSeriesKey(next, isOwnMessage(next, currentUserId))
                        : null}
                    {@const showAuthor = previousSeriesKey !== seriesKey}
                    {@const showTimestamp = nextSeriesKey !== seriesKey}
                    {@const authorLabel = own ? 'Du' : getOtherAuthorLabel(message)}
                    <article class="flex flex-col {own ? 'items-end' : 'items-start'}">
                        <div
                            class="min-w-[14rem] max-w-[90%] rounded-2xl px-4 py-3 shadow-sm sm:min-w-[18rem] sm:max-w-[80%] {own
                                ? 'bg-blue-600 text-white'
                                : 'border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-700/50 dark:text-zinc-100'}"
                        >
                            {#if showAuthor}
                                <p
                                    class="mb-1 text-xs font-medium {own
                                        ? 'text-blue-100'
                                        : 'text-zinc-500 dark:text-zinc-300'}"
                                >
                                    {authorLabel}
                                </p>
                            {/if}

                            <p class="whitespace-pre-wrap text-sm leading-relaxed">
                                {message.attributes.body}
                            </p>
                        </div>
                        {#if showTimestamp}
                            <div class="mt-1 px-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                <span>{formatDateTime(message.attributes['created-at'])}</span>
                            </div>
                        {/if}
                    </article>
                {/each}
            </div>
        {/if}
    {/if}

    <div class="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
        {@render composer?.()}
    </div>
</section>
