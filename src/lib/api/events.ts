import { client } from './client';

export interface EventAttributes {
    title: string;
    date: string; // YYYY-MM-DD
    'start-date': string | number; // Can be ISO string or seconds from midnight
    'end-date': string | number; // Can be ISO string or seconds from midnight
    resource?: string; // Resource ID (UUID string)
    'created-by'?: string; // User ID (UUID string)
    'created-at'?: string;
    'is-recurring'?: boolean;
    'recurrence-freq'?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    'recurrence-interval'?: number;
    'recurrence-end-date'?: string;
    // Returned for recurring event instances
    'original-id'?: string;
    'recurrence-rule'?: {
        freq: string;
        interval: number;
        end: string | null;
    };
}

export interface Event {
    id: string;
    type: 'event';
    attributes: EventAttributes;
}

export const eventApi = {
    list: (params: {
        start?: string;
        end?: string;
        limit?: number;
        offset?: number;
        sort?: string;
    } = {}) => {
        const query: any = {};
        if (params.start) query['filter[start]'] = params.start;
        if (params.end) query['filter[end]'] = params.end;
        if (params.limit) query['page[limit]'] = params.limit.toString();
        if (params.offset) query['page[offset]'] = params.offset.toString();
        if (params.sort) query['sort'] = params.sort;

        return client(`/events`, { params: query });
    },

    get: (id: string) => client(`/events/${id}`),

    create: (attributes: EventAttributes) =>
        client(`/events`, {
            method: 'POST',
            body: JSON.stringify({ data: { type: 'event', attributes } })
        }),

    update: (id: string, attributes: Partial<EventAttributes>) =>
        client(`/events/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ data: { type: 'event', attributes } })
        }),

    delete: (id: string) => client(`/events/${id}`, { method: 'DELETE' })
};
