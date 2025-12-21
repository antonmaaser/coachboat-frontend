import { client } from './client';

export interface EventAttributes {
    title: string;
    date: string; // YYYY-MM-DD
    'start-date': number; // Seconds from midnight
    'end-date': number; // Seconds from midnight
    resource?: string;
    description?: string;
    'is-recurring'?: boolean;
    'recurrence-freq'?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    'recurrence-interval'?: number;
    'recurrence-end-date'?: string;
    'recurrence-rule'?: {
        freq: string;
        interval: number;
        end: string;
    };
}

export const eventApi = {
    list: (year: number, month: number) =>
        client(`/events`, {
            params: {
                'filter[year]': year.toString(),
                'filter[month]': month.toString()
            }
        }),

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
