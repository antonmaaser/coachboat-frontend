<script lang="ts">
    import { SendHorizontal, User, Users } from 'lucide-svelte';
    import type { CreateMessageAttributes, MessageTargetKind } from '$lib/api/messages';
    import type { ConversationResource } from '$lib/api/types';
    import Button from '$lib/components/ui/Button.svelte';
    import ErrorAlert from '$lib/components/ui/ErrorAlert.svelte';
    import SearchableSelect from '$lib/components/ui/SearchableSelect.svelte';
    import TabToggle, { type TabToggleOption } from '$lib/components/ui/TabToggle.svelte';

    let {
        mode = 'conversation',
        conversation = null,
        users = [],
        groups = [],
        target = null,
        externalTargetOnly = false,
        embedded = false,
        loading = false,
        disabled = false,
        error = '',
        onSubmit,
    } = $props<{
        mode?: 'conversation' | 'new';
        conversation?: ConversationResource | null;
        users?: Array<{ value: string; label: string }>;
        groups?: Array<{ value: string; label: string }>;
        target?: {
            kind: MessageTargetKind;
            id: string;
            label: string;
        } | null;
        externalTargetOnly?: boolean;
        embedded?: boolean;
        loading?: boolean;
        disabled?: boolean;
        error?: string;
        onSubmit?: (payload: CreateMessageAttributes) => Promise<boolean> | boolean;
    }>();

    let targetKind = $state<MessageTargetKind>('direct');
    let targetUserId = $state('');
    let targetGroupId = $state('');
    let body = $state('');
    let bodyFocused = $state(false);
    let localError = $state('');
    const targetKindOptions = [
        { value: 'direct', label: 'Direkt', icon: User },
        { value: 'group', label: 'Gruppe', icon: Users },
    ] satisfies TabToggleOption[];

    const combinedError = $derived(localError || error);
    const submitDisabled = $derived(
        disabled ||
            loading ||
            (mode === 'conversation' && !conversation) ||
            (mode === 'new' && externalTargetOnly && !target),
    );

    $effect(() => {
        mode;
        conversation?.id;
        target?.id;
        localError = '';
    });

    function resolveConversationTarget(
        activeConversation: ConversationResource | null,
    ): Pick<CreateMessageAttributes, 'recipient-id' | 'group-id'> | null {
        if (!activeConversation) return null;
        if (activeConversation.attributes.kind === 'group') {
            const groupId = activeConversation.attributes['group-id'];
            if (!groupId) return null;
            return { 'group-id': groupId };
        }

        const recipientId = activeConversation.attributes['counterpart-user-id'];
        if (!recipientId) return null;
        return { 'recipient-id': recipientId };
    }

    function normalizeBody(rawBody: string): string {
        return rawBody.replace(/\r\n/g, '\n').trim();
    }

    async function handleSubmit(event: Event) {
        event.preventDefault();
        localError = '';

        const normalizedBody = normalizeBody(body);
        if (!normalizedBody) {
            localError = 'Bitte einen Nachrichtentext eingeben.';
            return;
        }

        const payload: CreateMessageAttributes = { body: normalizedBody };

        if (mode === 'conversation') {
            const target = resolveConversationTarget(conversation);
            if (!target) {
                localError = 'Unterhaltung hat kein gültiges Ziel.';
                return;
            }
            Object.assign(payload, target);
        } else if (target) {
            if (target.kind === 'direct') {
                payload['recipient-id'] = target.id;
            } else {
                payload['group-id'] = target.id;
            }
        } else if (targetKind === 'direct') {
            if (!targetUserId) {
                localError = 'Bitte einen Empfänger auswählen.';
                return;
            }
            payload['recipient-id'] = targetUserId;
        } else {
            if (!targetGroupId) {
                localError = 'Bitte eine Gruppe auswählen.';
                return;
            }
            payload['group-id'] = targetGroupId;
        }

        const success = (await onSubmit?.(payload)) ?? false;
        if (success) {
            body = '';
        }
    }
</script>

<div class={!embedded
    ? 'rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800'
    : ''}>
    {#if !embedded}
        <h2 class="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">
            Nachricht schreiben
        </h2>
    {/if}

    <ErrorAlert error={combinedError} />

    <form class="space-y-3" onsubmit={handleSubmit}>
        {#if mode === 'new' && !target && !externalTargetOnly}
            <div class="space-y-3">
                <TabToggle
                    size="sm"
                    gap
                    options={targetKindOptions}
                    value={targetKind}
                    onchange={(nextValue) => {
                        targetKind = nextValue as MessageTargetKind;
                        if (nextValue === 'direct') {
                            targetGroupId = '';
                        } else {
                            targetUserId = '';
                        }
                    }}
                />

                {#if targetKind === 'direct'}
                    <SearchableSelect
                        options={users}
                        value={targetUserId}
                        label="Empfänger"
                        placeholder="Benutzer auswählen..."
                        onchange={(value) => {
                            targetUserId = value;
                        }}
                    />
                {:else}
                    <SearchableSelect
                        options={groups}
                        value={targetGroupId}
                        label="Gruppe"
                        placeholder="Gruppe auswählen..."
                        onchange={(value) => {
                            targetGroupId = value;
                        }}
                    />
                {/if}
            </div>
        {/if}

        <div class="space-y-1">
            <div class="relative">
                <textarea
                    id="message-composer-input"
                    bind:value={body}
                    rows={bodyFocused ? 4 : 1}
                    required
                    disabled={submitDisabled}
                    onfocus={() => {
                        bodyFocused = true;
                    }}
                    onblur={() => {
                        bodyFocused = false;
                    }}
                    class="block w-full resize-none overflow-hidden rounded-lg border-0 bg-zinc-50 px-3 pr-14 text-sm text-zinc-900 ring-1 ring-inset ring-zinc-200 placeholder:text-zinc-400 transition-[height,padding] duration-200 ease-out focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-zinc-900/50 dark:text-white dark:ring-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 {bodyFocused
                        ? 'h-24 py-2'
                        : 'h-10 py-2.5'}"
                    placeholder="Nachricht eingeben..."
                ></textarea>

                <Button
                    variant="solid"
                    tone="primary"
                    size="xs"
                    type="submit"
                    loading={loading}
                    disabled={submitDisabled}
                    ariaLabel="Senden"
                    class="absolute bottom-2 right-2"
                >
                    <SendHorizontal class="h-4 w-4" />
                </Button>
            </div>
        </div>
    </form>
</div>
