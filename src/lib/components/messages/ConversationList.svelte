<script lang="ts">
    import { MessageSquare, Plus, Users } from 'lucide-svelte';
    import type { ConversationResource } from '$lib/api/types';
    import type { ConversationKindFilter, MessageTargetKind } from '$lib/api/messages';
    import { clickOutside } from '$lib/actions/clickOutside';
    import Button from '$lib/components/ui/Button.svelte';
    import ErrorAlert from '$lib/components/ui/ErrorAlert.svelte';
    import ProfileAvatar from '$lib/components/ui/ProfileAvatar.svelte';
    import SearchableSelect from '$lib/components/ui/SearchableSelect.svelte';
    import TabToggle, { type TabToggleOption } from '$lib/components/ui/TabToggle.svelte';
    import {
        formatDateTime,
        getConversationAvatarName,
        getConversationLastBody,
        getConversationLastDate,
        getConversationSubtitle,
        getConversationTitle,
    } from './utils';

    type ConversationFilter = ConversationKindFilter | 'all';

    let {
        conversations = [],
        selectedConversationId = null,
        loading = false,
        error = '',
        filterKind = 'all',
        onSelect,
        onFilterChange,
        composeUsers = [],
        composeGroups = [],
        composeTargetsLoading = false,
        composeTargetsError = '',
        onComposeNew,
    } = $props<{
        conversations?: ConversationResource[];
        selectedConversationId?: string | null;
        loading?: boolean;
        error?: string;
        filterKind?: ConversationFilter;
        onSelect?: (conversation: ConversationResource) => void;
        onFilterChange?: (filter: ConversationFilter) => void;
        composeUsers?: Array<{ value: string; label: string }>;
        composeGroups?: Array<{ value: string; label: string }>;
        composeTargetsLoading?: boolean;
        composeTargetsError?: string;
        onComposeNew?: (target: {
            kind: MessageTargetKind;
            id: string;
            label: string;
        }) => void;
    }>();

    let showComposePopover = $state(false);
    let composeKind = $state<MessageTargetKind>('direct');
    let composeUserId = $state('');
    let composeGroupId = $state('');
    let composeError = $state('');
    const canStartCompose = $derived(
        composeKind === 'direct' ? !!composeUserId : !!composeGroupId,
    );
    const composeKindOptions = [
        { value: 'direct', label: 'Direkt' },
        { value: 'group', label: 'Gruppe' },
    ] satisfies TabToggleOption[];
    const conversationFilterOptions = [
        { value: 'all', label: 'Alle' },
        { value: 'direct', label: 'Direkt' },
        { value: 'group', label: 'Gruppen' },
    ] satisfies TabToggleOption[];

    function closeComposePopover() {
        showComposePopover = false;
        composeError = '';
    }

    function getSelectedTarget() {
        if (composeKind === 'direct') {
            if (!composeUserId) return null;
            const selected = composeUsers.find(
                (entry: { value: string; label: string }) =>
                    entry.value === composeUserId,
            );
            return {
                kind: 'direct' as const,
                id: composeUserId,
                label: selected?.label || composeUserId,
            };
        }

        if (!composeGroupId) return null;
        const selected = composeGroups.find(
            (entry: { value: string; label: string }) =>
                entry.value === composeGroupId,
        );
        return {
            kind: 'group' as const,
            id: composeGroupId,
            label: selected?.label || composeGroupId,
        };
    }

    function startComposeFromPopover() {
        composeError = '';
        const selected = getSelectedTarget();
        if (!selected) {
            composeError =
                composeKind === 'direct'
                    ? 'Bitte einen Empfänger auswählen.'
                    : 'Bitte eine Gruppe auswählen.';
            return;
        }

        onComposeNew?.(selected);
        showComposePopover = false;
    }
</script>

<section
    class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800 xl:flex xl:h-full xl:min-h-0 xl:flex-col"
>
    <div class="mb-4 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
            <MessageSquare class="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
            <h2 class="text-sm font-semibold text-zinc-900 dark:text-white">
                Unterhaltungen
            </h2>
        </div>

        <div class="flex items-center gap-1">
            <div class="relative" use:clickOutside={closeComposePopover}>
                <Button
                    variant="ghost"
                    tone="primary"
                    size="xs"
                    onclick={() => {
                        showComposePopover = !showComposePopover;
                        composeError = '';
                    }}
                >
                    <Plus class="h-4 w-4" />
                    Neu
                </Button>

                {#if showComposePopover}
                    <div
                        class="absolute right-0 z-30 mt-2 w-80 rounded-lg border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
                    >
                        <div class="space-y-3">
                            <TabToggle
                                size="sm"
                                gap
                                options={composeKindOptions}
                                value={composeKind}
                                onchange={(nextValue) => {
                                    composeKind = nextValue as MessageTargetKind;
                                    if (nextValue === 'direct') {
                                        composeGroupId = '';
                                    } else {
                                        composeUserId = '';
                                    }
                                }}
                            />

                            {#if composeKind === 'direct'}
                                <SearchableSelect
                                    options={composeUsers}
                                    value={composeUserId}
                                    label="Empfänger"
                                    placeholder="Benutzer auswählen..."
                                    onchange={(value) => {
                                        composeUserId = value;
                                    }}
                                />
                            {:else}
                                <SearchableSelect
                                    options={composeGroups}
                                    value={composeGroupId}
                                    label="Gruppe"
                                    placeholder="Gruppe auswählen..."
                                    onchange={(value) => {
                                        composeGroupId = value;
                                    }}
                                />
                            {/if}

                            <ErrorAlert error={composeError || composeTargetsError} />

                            <div class="flex justify-end">
                                <Button
                                    variant="solid"
                                    tone="primary"
                                    size="sm"
                                    onclick={startComposeFromPopover}
                                    disabled={composeTargetsLoading || !canStartCompose}
                                >
                                    Unterhaltung starten
                                </Button>
                            </div>
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>

    <TabToggle
        class="mb-4"
        size="sm"
        options={conversationFilterOptions}
        value={filterKind}
        onchange={(nextValue) => onFilterChange?.(nextValue as ConversationFilter)}
    />

    <ErrorAlert error={error} />

    <div class="xl:min-h-0 xl:flex-1">
        {#if loading}
            <div
                class="rounded-lg border border-dashed border-zinc-200 px-3 py-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
            >
                Lade Unterhaltungen...
            </div>
        {:else if conversations.length === 0}
            <div
                class="rounded-lg border border-dashed border-zinc-200 px-3 py-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
            >
                Keine Unterhaltungen gefunden.
            </div>
        {:else}
            <div class="space-y-2 xl:h-full xl:overflow-y-auto xl:pr-1">
                {#each conversations as conversation (conversation.id)}
                    {@const active = conversation.id === selectedConversationId}
                    {@const title = getConversationTitle(conversation)}
                    {@const subtitle = getConversationSubtitle(conversation)}
                    {@const preview = getConversationLastBody(conversation)}
                    {@const updatedAt = getConversationLastDate(conversation)}
                    <button
                        type="button"
                        class="w-full rounded-lg border p-3 text-left transition-colors {active
                            ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
                            : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-700/60'}"
                        onclick={() => onSelect?.(conversation)}
                    >
                        <div class="flex items-start gap-3">
                            {#if conversation.attributes.kind === 'group'}
                                <div
                                    class="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                                >
                                    <Users class="h-4 w-4" />
                                </div>
                            {:else}
                                <ProfileAvatar
                                    name={getConversationAvatarName(conversation)}
                                    fallback="D"
                                    size="sm"
                                />
                            {/if}

                            <div class="min-w-0 flex-1">
                                <div class="mb-1 flex items-center justify-between gap-2">
                                    <p
                                        class="truncate text-sm font-semibold text-zinc-900 dark:text-white"
                                    >
                                        {title}
                                    </p>
                                    <p class="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                                        {formatDateTime(updatedAt)}
                                    </p>
                                </div>

                                <p class="mb-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                                    {subtitle}
                                </p>

                                <p class="truncate text-sm text-zinc-700 dark:text-zinc-300">
                                    {preview || 'Noch keine Nachricht im Verlauf.'}
                                </p>
                            </div>
                        </div>
                    </button>
                {/each}
            </div>
        {/if}
    </div>
</section>
