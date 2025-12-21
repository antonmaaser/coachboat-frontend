import { client } from './client';

export interface ResourceCategoryAttributes {
    title: string;
    color?: string; // Hex code or CSS color
    icon?: string;  // FontAwesome class name or similar
}

export const resourceCategoryApi = {
    list: () => client(`/resource-categories`),

    create: (attributes: ResourceCategoryAttributes) =>
        client(`/resource-categories`, {
            method: 'POST',
            body: JSON.stringify({ data: { type: 'resource-category', attributes } })
        }),

    update: (id: string, attributes: Partial<ResourceCategoryAttributes>) =>
        client(`/resource-categories/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ data: { type: 'resource-category', id, attributes } })
        }),

    delete: (id: string) => client(`/resource-categories/${id}`, { method: 'DELETE' })
};
