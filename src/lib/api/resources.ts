import { client } from './client';

export interface ResourceAttributes {
    title: string;
    description?: string;
    'is-ready'?: boolean;
    'is-hidden'?: boolean;
    'category-id'?: string | null;
}

export const resourceApi = {
    list: () => client(`/resources`),

    get: (id: string) => client(`/resources/${id}`),

    create: (attributes: ResourceAttributes) =>
        client(`/resources`, {
            method: 'POST',
            body: JSON.stringify({ data: { type: 'resources', attributes } })
        }),

    update: (id: string, attributes: Partial<ResourceAttributes>) =>
        client(`/resources/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ data: { type: 'resources', id, attributes } })
        }),

    delete: (id: string) => client(`/resources/${id}`, { method: 'DELETE' })
};
