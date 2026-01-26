import { client } from './client';

export interface ResourceAttributes {
    title: string;
    description?: string;
    'is-ready'?: boolean;
    'is-hidden'?: boolean;
    'category-id'?: string | null;
    'created-at'?: string;
}

export interface Resource {
    id: string;
    type: 'resource';
    attributes: ResourceAttributes;
}

export const resourceApi = {
    list: () => client(`/resources`),

    get: (id: string) => client(`/resources/${id}`),

    create: (attributes: ResourceAttributes) =>
        client(`/resources`, {
            method: 'POST',
            body: JSON.stringify({ data: { type: 'resource', attributes } })
        }),

    update: (id: string, attributes: Partial<ResourceAttributes>) =>
        client(`/resources/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ data: { type: 'resource', id, attributes } })
        }),

    delete: (id: string) => client(`/resources/${id}`, { method: 'DELETE' })
};
