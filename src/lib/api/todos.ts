import { client } from './client';

export interface TodoAttributes {
    'resource-id': string;
    'created-by'?: string;
    status?: number;
    title: string;
    description?: string;
    'created-at'?: string;
    'updated-at'?: string;
}

export interface Todo {
    id: string;
    type: 'todo';
    attributes: TodoAttributes;
}

export const todoApi = {
    list: (resourceId?: string | number) => {
        let url = '/todos';
        if (resourceId) {
            url += `?resource_id=${resourceId}`;
        }
        return client(url);
    },

    get: (id: string) => client(`/todos/${id}`),

    create: (attributes: Partial<TodoAttributes>) =>
        client(`/todos`, {
            method: 'POST',
            body: JSON.stringify({ data: { type: 'todo', attributes } })
        }),

    update: (id: string, attributes: Partial<TodoAttributes>) =>
        client(`/todos/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ data: { type: 'todo', id, attributes } })
        }),

    delete: (id: string) => client(`/todos/${id}`, { method: 'DELETE' })
};
