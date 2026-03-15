import { client } from './client';
import type { EventResource, GenericListDocument } from './types';

export const eventApi = {
    list: (params: {
        start?: string;
        end?: string;
        limit?: number;
        offset?: number;
        sort?: string;
        resource?: string;
    } = {}) => {
        const query: any = {};
        if (params.start) query['filter[start]'] = params.start;
        if (params.end) query['filter[end]'] = params.end;
        if (params.resource) query['filter[resource]'] = params.resource;
        if (params.limit) query['page[limit]'] = params.limit.toString();
        if (params.offset) query['page[offset]'] = params.offset.toString();
        if (params.sort) query['sort'] = params.sort;

        return client<GenericListDocument<EventResource>>(`/events`, { params: query });
    },

    get: (id: string) => client<{ data: EventResource }>(`/events/${id}`),

    create: (attributes: EventResource['attributes']) =>
        client<{ data: EventResource }>(`/events`, {
            method: 'POST',
            body: JSON.stringify({ data: { type: 'event', attributes } })
        }),

    update: (id: string, attributes: Partial<EventResource['attributes']>) =>
        client<{ data: EventResource }>(`/events/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ data: { type: 'event', attributes } })
        }),

    delete: (id: string) => client(`/events/${id}`, { method: 'DELETE' })
};
