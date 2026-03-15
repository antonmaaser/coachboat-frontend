import { client } from './client';
import type {
    GenericListDocument,
    NotificationBroadcastResource,
    NotificationResource,
} from './types';

type CreateNotificationAttributes = {
    type?: string;
    title: string;
    message: string;
    url?: string | null;
    broadcast?: boolean;
    'user-id'?: string;
};

export const notificationsApi = {
    list: (filterRead?: boolean) =>
        client<GenericListDocument<NotificationResource>>('/notifications', {
            params: filterRead === undefined ? undefined : { 'filter[read]': filterRead },
        }),

    markRead: (id: string, read: boolean) =>
        client<{ data: NotificationResource }>(`/notifications/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({
                data: {
                    type: 'notification',
                    id,
                    attributes: { read },
                },
            }),
        }),

    create: (attributes: CreateNotificationAttributes) =>
        client<{ data: NotificationResource | NotificationBroadcastResource }>('/notifications', {
            method: 'POST',
            body: JSON.stringify({
                data: {
                    type: 'notification',
                    attributes,
                },
            }),
        }),
};
