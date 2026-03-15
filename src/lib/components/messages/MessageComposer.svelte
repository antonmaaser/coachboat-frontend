<script lang="ts">
    import { SendHorizontal, User, Users } from 'lucide-svelte';
    import type { CreateMessageAttributes, MessageTargetKind } from '$lib/api/messages';
    import type { ConversationResource } from '$lib/api/types';
    import Button from '$lib/components/ui/Button.svelte';
    import ErrorAlert from '$lib/components/ui/ErrorAlert.svelte';
    import SearchableSelect from '$lib/components/ui/SearchableSelect.svelte';
    import TabToggle, { type TabToggleOption } from '$lib/components/ui/TabToggle.svelte';
    import Toggle from '$lib/components/ui/Toggle.svelte';

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
    let firstLineAsSubject = $state(false);
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

    function buildBodyAndSubject(rawBody: string): {
        body: string;
        subject?: string;
    } {
        const normalized = rawBody.replace(/\r\n/g, '\n');

        if (!firstLineAsSubject) {
            return {
                body: normalized.trim(),
            };
        }

        const lines = normalized.split('\n');
        if (lines.length < 2) {
            return {
                body: normalized.trim(),
            };
        }

        const [firstLine, ...rest] = lines;
        const parsedSubject = firstLine.trim();
        const parsedBody = rest.join('\n').trim();

        if (!parsedSubject) {
            return {
                body: normalized.trim(),
            };
        }

        return {
            body: parsedBody,
            subject: parsedSubject,
        };
    }

    async function handleSubmit(event: Event) {
        event.preventDefault();
        localError = '';

        const parsed = buildBodyAndSubject(body);
        if (!parsed.body) {
            localError = 'Bitte einen Nachrichtentext eingeben.';
            return;
        }

        const payload: CreateMessageAttributes = { body: parsed.body };
        if (parsed.subject) {
            payload.subject = parsed.subject;
        }

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

    {#if !conversation}
        <div
            class="mb-3 rounded-lg border border-dashed border-zinc-200 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
        >
            {#if mode === 'conversation'}
                Wähle eine Unterhaltung aus, um zu antworten.
            {:else if target}
                Neue Unterhaltung mit: {target.label}
            {:else if externalTargetOnly}
                Starte über den Neu-Button eine Unterhaltung und wähle dort das Ziel.
            {:else}
                Wähle ein Ziel für die neue Unterhaltung.
            {/if}
        </div>
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
        {:else if mode === 'new' && target}
            <div
                class="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-700/40 dark:text-zinc-200"
            >
                Ziel: {target.label}
            </div>
        {/if}

        <Toggle
            checked={firstLineAsSubject}
            onchange={(checked) => {
                firstLineAsSubject = checked;
            }}
            label="Erste Zeile als Betreff verwenden"
            class="text-sm text-zinc-700 dark:text-zinc-300"
        />

        {#if firstLineAsSubject}
            <p class="text-xs text-zinc-500 dark:text-zinc-400">
                Erste Zeile = Betreff, restliche Zeilen = Nachricht.
            </p>
        {/if}

        <div class="space-y-1">
            <label
                for="message-composer-input"
                class="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
                Nachricht<span class="text-red-500">*</span>
            </label>
            <div class="relative">
                <textarea
                    id="message-composer-input"
                    bind:value={body}
                    rows={4}
                    required
                    disabled={submitDisabled}
                    class="block w-full rounded-lg border-0 bg-zinc-50 px-3 py-2 pr-14 text-sm text-zinc-900 ring-1 ring-inset ring-zinc-200 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-zinc-900/50 dark:text-white dark:ring-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder={firstLineAsSubject
                        ? "Betreff in die erste Zeile, dann Nachrichtentext..."
                        : "Nachricht eingeben..."}
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
