import { client } from './client';

export interface EventAttributes {
    title: string;
    date: string; // YYYY-MM-DD
    'start-date': string; // ISO
    'end-date': string; // ISO
    resource?: string;
    description?: string;
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
            body: JSON.stringify({ data: { attributes } })
        }),

    update: (id: string, attributes: Partial<EventAttributes>) =>
        client(`/events/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ data: { attributes } })
        }),

    delete: (id: string) => client(`/events/${id}`, { method: 'DELETE' })
};
