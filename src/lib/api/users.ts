import { client } from './client';
import type { UserResource, GenericListDocument, GenericDataDocument } from './types';

export type UserAttributes = UserResource['attributes'];

export const userApi = {
    list: () => client<GenericListDocument<UserResource>>(`/users`),

    get: (id: string) => client<{ data: UserResource }>(`/users/${id}`),

    create: (attributes: UserResource['attributes']) =>
        client<{ data: UserResource }>(`/users`, {
            method: 'POST',
            body: JSON.stringify({ data: { type: 'user', attributes } })
        }),

    update: (id: string, attributes: Partial<UserResource['attributes']>) =>
        client<{ data: UserResource }>(`/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ data: { type: 'user', id, attributes } })
        }),

    delete: (id: string) => client(`/users/${id}`, { method: 'DELETE' })
};
