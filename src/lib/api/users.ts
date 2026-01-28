import { client } from './client';

export interface UserAttributes {
    name?: string;
    'first-name'?: string;
    email?: string;
    password?: string;
    status?: number;
    'is-active'?: boolean;
    role?: { slug: string; name: string } | string;
    'created-at'?: string;
    effective_permissions?: {
        global: { role: string; roleName: string; permissions: string[] } | null;
        contexts: { id: string; name: string; role: string; roleName: string; permissions: string[] }[];
    };
}

export interface User {
    id: string;
    type: 'user';
    attributes: UserAttributes;
}

export const userApi = {
    list: () => client(`/users`),

    get: (id: string) => client(`/users/${id}`),

    create: (attributes: UserAttributes) =>
        client(`/users`, {
            method: 'POST',
            body: JSON.stringify({ data: { type: 'user', attributes } })
        }),

    update: (id: string, attributes: Partial<UserAttributes>) =>
        client(`/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ data: { type: 'user', id, attributes } })
        }),

    delete: (id: string) => client(`/users/${id}`, { method: 'DELETE' })
};
