import { client } from './client';

export interface GroupAttributes {
    title: string;
    description?: string;
    visibility?: 'all' | 'admin' | 'none';
    'created-at'?: string;
    members?: { id: string; role: string | null }[];
}

export interface Group {
    id: string;
    type: 'group';
    attributes: GroupAttributes;
}

export interface GroupMemberAttributes {
    userId: string;
    role: 'moderator' | 'listener' | null;
}

export interface GroupPostAttributes {
    body: string;
    'is-pinned'?: boolean;
    'created-at'?: string;
    'updated-at'?: string;
}

export interface GroupPost {
    id: string;
    type: 'group-post';
    attributes: GroupPostAttributes;
    relationships?: {
        author: {
            data: { type: 'user'; id: string };
            meta?: { name: string; 'first-name': string };
        };
        group: {
            data: { type: 'group'; id: string };
        };
    };
}

export interface GroupActivityAttributes {
    action: string;
    summary: string;
    visibility: string;
    'created-at': string;
    'object-type': string;
    'object-id': string;
    payload?: Record<string, unknown>;
}

export interface GroupActivity {
    id: string;
    type: 'group-activity';
    attributes: GroupActivityAttributes;
    relationships: {
        actor: {
            data: { type: 'user'; id: string };
            meta?: { name: string; 'first-name': string };
        };
    };
}

export const groupApi = {
    list: () => client(`/groups`),

    get: (id: string) => client(`/groups/${id}`),

    getUsers: (id: string) => client(`/groups/${id}/users`),

    create: (attributes: GroupAttributes) =>
        client(`/groups`, {
            method: 'POST',
            body: JSON.stringify({ data: { type: 'group', attributes } })
        }),

    update: (id: string, attributes: Partial<GroupAttributes>) =>
        client(`/groups/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ data: { type: 'group', id, attributes } })
        }),

    delete: (id: string) => client(`/groups/${id}`, { method: 'DELETE' }),

    addMember: (id: string, attributes: GroupMemberAttributes) =>
        client(`/groups/${id}/users`, {
            method: 'POST',
            body: JSON.stringify({ data: { type: 'group-members', attributes } })
        }),

    removeMember: (groupId: string, userId: string) =>
        client(`/groups/${groupId}/users/${userId}`, { method: 'DELETE' }),

    updateMember: (groupId: string, userId: string, role: string | null) =>
        client(`/groups/${groupId}/users/${userId}`, {
            method: 'PATCH',
            body: JSON.stringify({ data: { type: 'group-members', attributes: { role } } })
        }),

    getFeed: (groupId: string, params?: { 'page[limit]'?: number; 'page[cursor]'?: string }, init?: RequestInit) => {
        const searchParams = new URLSearchParams();
        if (params?.['page[limit]']) searchParams.append('page[limit]', params['page[limit]'].toString());
        if (params?.['page[cursor]']) searchParams.append('page[cursor]', params['page[cursor]']);
        const queryString = searchParams.toString();
        // @ts-ignore
        return client(`/groups/${groupId}/feed${queryString ? `?${queryString}` : ''}`, init);
    },

    getPost: (groupId: string, postId: string) =>
        client(`/groups/${groupId}/posts/${postId}`),

    createPost: (groupId: string, attributes: { body: string; is_pinned?: boolean }) =>
        client(`/groups/${groupId}/posts`, {
            method: 'POST',
            body: JSON.stringify({ data: { type: 'group-post', attributes } })
        }),

    updatePost: (groupId: string, postId: string, attributes: { body?: string; is_pinned?: boolean }) =>
        client(`/groups/${groupId}/posts/${postId}`, {
            method: 'PATCH',
            body: JSON.stringify({ data: { type: 'group-post', id: postId, attributes } })
        }),

    deletePost: (groupId: string, postId: string) =>
        client(`/groups/${groupId}/posts/${postId}`, { method: 'DELETE' })
};
