<script lang="ts">
    import type { Snippet } from 'svelte';
    import { MessageSquare } from 'lucide-svelte';
    import type { ConversationResource, MessageResource } from '$lib/api/types';
    import Button from '$lib/components/ui/Button.svelte';
    import ErrorAlert from '$lib/components/ui/ErrorAlert.svelte';
    import {
        formatDateTime,
        getConversationTitle,
        isOwnMessage,
    } from './utils';

    let {
        conversation = null,
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
</script>

<section
    class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
>
    <div class="mb-4 flex items-center justify-between gap-3">
        <div>
            <h2 class="text-sm font-semibold text-zinc-900 dark:text-white">
                {conversation ? getConversationTitle(conversation) : 'Nachrichten'}
            </h2>
            {#if conversation}
                <p class="text-xs text-zinc-500 dark:text-zinc-400">
                    {conversation.attributes.kind === 'group' ? 'Gruppenchat' : 'Direktnachricht'}
                </p>
            {/if}
        </div>

        {#if onRetry && conversation}
            <Button variant="outline" tone="neutral" size="xs" onclick={onRetry}>
                Aktualisieren
            </Button>
        {/if}
    </div>

    <ErrorAlert error={error} />

    {#if !conversation}
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
                {#each messages as message}
                    {@const own = isOwnMessage(message, currentUserId)}
                    <article class="flex {own ? 'justify-end' : 'justify-start'}">
                        <div
                            class="max-w-[90%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[80%] {own
                                ? 'bg-blue-600 text-white'
                                : 'border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-700/50 dark:text-zinc-100'}"
                        >
                            {#if message.attributes.subject}
                                <p
                                    class="mb-1 text-xs font-semibold uppercase tracking-wide {own
                                        ? 'text-blue-100'
                                        : 'text-zinc-500 dark:text-zinc-300'}"
                                >
                                    {message.attributes.subject}
                                </p>
                            {/if}

                            <p class="whitespace-pre-wrap text-sm leading-relaxed">
                                {message.attributes.body}
                            </p>

                            <div
                                class="mt-2 flex items-center justify-between gap-3 text-[11px] {own
                                    ? 'text-blue-100'
                                    : 'text-zinc-500 dark:text-zinc-400'}"
                            >
                                <span>{own ? 'Du' : 'Teilnehmer'}</span>
                                <span>
                                    {formatDateTime(message.attributes['created-at'])}
                                </span>
                            </div>
                        </div>
                    </article>
                {/each}
            </div>
        {/if}
    {/if}

    <div class="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
        {@render composer?.()}
    </div>
</section>
