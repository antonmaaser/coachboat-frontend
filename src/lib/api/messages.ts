import { client } from './client';
import type {
    ConversationResource,
    GenericListDocument,
    MessageResource,
} from './types';

export type ConversationKindFilter = 'direct' | 'group';
export type MessageTargetKind = 'direct' | 'group';

export interface ListMessagesParams {
    [key: string]: string | number | boolean | null | undefined;
    'filter[recipient-id]'?: string;
    'filter[group-id]'?: string;
    'page[limit]'?: number;
    'page[cursor]'?: string;
}

export interface ListConversationsParams {
    [key: string]: string | number | boolean | null | undefined;
    'filter[kind]'?: ConversationKindFilter;
    'page[limit]'?: number;
}

export interface CreateMessageAttributes {
    body: string;
    subject?: string;
    'recipient-id'?: string;
    'group-id'?: string;
}

export interface MessageListDocument extends GenericListDocument<MessageResource> {
    meta?: GenericListDocument<MessageResource>['meta'] & {
        'next-cursor'?: string;
    };
}

export const messagesApi = {
    list: (params?: ListMessagesParams) =>
        client<MessageListDocument>('/messages', {
            params,
        }),

    listConversations: (params?: ListConversationsParams) =>
        client<GenericListDocument<ConversationResource>>('/messages/conversations', {
            params,
        }),

    create: (attributes: CreateMessageAttributes) =>
        client<{ data: MessageResource }>('/messages', {
            method: 'POST',
            body: JSON.stringify({
                data: {
                    type: 'message',
                    attributes,
                },
            }),
        }),
};
