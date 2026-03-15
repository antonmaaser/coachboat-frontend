import type { ConversationResource, MessageResource } from '$lib/api/types';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
    if (!value || typeof value !== 'object') return null;
    return value as UnknownRecord;
}

function readText(source: unknown, keys: string[]): string | null {
    const record = asRecord(source);
    if (!record) return null;

    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string' && value.trim() !== '') {
            return value.trim();
        }
    }

    return null;
}

function readTextWithAttributes(source: unknown, keys: string[]): string | null {
    const direct = readText(source, keys);
    if (direct) return direct;
    const record = asRecord(source);
    if (!record) return null;
    return readText(record.attributes, keys);
}

export function getConversationTitle(conversation: ConversationResource): string {
    if (conversation.attributes.kind === 'group') {
        return (
            readTextWithAttributes(conversation.attributes.group, [
                'title',
                'name',
                'slug',
            ]) || 'Gruppenunterhaltung'
        );
    }

    return (
        readTextWithAttributes(conversation.attributes.counterpart, [
            'name',
            'first-name',
            'email',
        ]) || 'Direktnachricht'
    );
}

export function getConversationSubtitle(conversation: ConversationResource): string {
    if (conversation.attributes.kind === 'group') return 'Gruppe';

    return (
        readTextWithAttributes(conversation.attributes.counterpart, ['email']) ||
        'Direkter Chat'
    );
}

export function getConversationAvatarName(conversation: ConversationResource): string {
    return getConversationTitle(conversation);
}

export function getConversationLastBody(
    conversation: ConversationResource,
): string | null {
    const body = conversation.attributes['last-message']?.body;
    if (typeof body === 'string' && body.trim() !== '') return body.trim();
    return null;
}

export function getConversationLastDate(
    conversation: ConversationResource,
): string | null {
    const fromMessage = conversation.attributes['last-message']?.['created-at'];
    if (typeof fromMessage === 'string' && fromMessage.trim() !== '') {
        return fromMessage;
    }

    const updatedAt = conversation.attributes['updated-at'];
    if (typeof updatedAt === 'string' && updatedAt.trim() !== '') {
        return updatedAt;
    }

    return null;
}

export function formatDateTime(value?: string | null, short = true): string {
    if (!value) return 'Unbekannt';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unbekannt';

    return date.toLocaleString('de-DE', {
        dateStyle: short ? 'short' : 'medium',
        timeStyle: 'short',
    });
}

export function getMessageTimestamp(message: MessageResource): number {
    const createdAt = message.attributes['created-at'];
    if (!createdAt) return 0;
    const value = new Date(createdAt).getTime();
    return Number.isNaN(value) ? 0 : value;
}

export function isOwnMessage(
    message: MessageResource,
    currentUserId: string | null | undefined,
): boolean {
    if (!currentUserId) return false;
    return message.attributes['sender-id'] === currentUserId;
}
