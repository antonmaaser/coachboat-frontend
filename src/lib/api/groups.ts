import { client } from './client';

export interface GroupAttributes {
    title: string;
    description?: string;
    visibility?: 'all' | 'admin' | 'none';
}

export interface GroupMemberAttributes {
    userId: string;
    role: 'moderator' | 'listener' | 'none' | null;
}

export const groupApi = {
    list: () => client(`/groups`),

    get: (id: string) => client(`/groups/${id}`),

    create: (attributes: GroupAttributes) =>
        client(`/groups`, {
            method: 'POST',
            body: JSON.stringify({ data: { type: 'groups', attributes } })
        }),

    update: (id: string, attributes: Partial<GroupAttributes>) =>
        client(`/groups/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ data: { type: 'groups', id, attributes } })
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

    createPost: (groupId: string, attributes: { body: string; is_pinned?: boolean }) =>
        client(`/groups/${groupId}/posts`, {
            method: 'POST',
            body: JSON.stringify({ data: { type: 'posts', attributes } })
        }),

    updatePost: (groupId: string, postId: string, attributes: { body?: string; is_pinned?: boolean }) =>
        client(`/groups/${groupId}/posts/${postId}`, {
            method: 'PATCH',
            body: JSON.stringify({ data: { type: 'posts', id: postId, attributes } })
        }),

    deletePost: (groupId: string, postId: string) =>
        client(`/groups/${groupId}/posts/${postId}`, { method: 'DELETE' })
};
