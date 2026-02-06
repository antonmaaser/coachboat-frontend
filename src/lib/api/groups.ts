import { API_BASE } from '../config';
import { client } from './client';
import type {
    GroupResource,
    GroupPostResource,
    GroupActivityResource,
    GenericListDocument,
    UserResource
} from './types';

export interface GroupAttributes {
    title: string;
    description: string;
    visibility: 'all' | 'hidden';
}

export type GroupMemberRole = 'owner' | 'admin' | 'moderator' | 'member' | 'viewer';

export interface GroupMemberAttributes {
    userId: string;
    role: GroupMemberRole;
}

export interface GroupMemberResource extends UserResource {
    attributes: UserResource['attributes'] & {
        role?: GroupMemberRole;
    };
    meta?: {
        role?: GroupMemberRole;
    };
}

interface GroupListParams {
    'page[limit]'?: number;
    'page[cursor]'?: string;
}

function buildListQuery(params?: GroupListParams): string {
    const searchParams = new URLSearchParams();
    if (params?.['page[limit]']) searchParams.append('page[limit]', params['page[limit]'].toString());
    if (params?.['page[cursor]']) searchParams.append('page[cursor]', params['page[cursor]']);
    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
}

export const groupApi = {
    list: () => client<GenericListDocument<GroupResource>>('/groups'),

    get: (id: string) => client<{ data: GroupResource }>(`/groups/${id}`),

    getMembers: (id: string) =>
        client<GenericListDocument<GroupMemberResource>>(`/groups/${id}/users`),

    create: (attributes: GroupAttributes) =>
        client<{ data: GroupResource }>('/groups', {
            method: 'POST',
            body: JSON.stringify({ data: { type: 'group', attributes } })
        }),

    update: (id: string, attributes: Partial<GroupAttributes>) =>
        client<{ data: GroupResource }>(`/groups/${id}`, {
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

    updateMember: (groupId: string, userId: string, role: GroupMemberRole) =>
        client(`/groups/${groupId}/users/${userId}`, {
            method: 'PATCH',
            body: JSON.stringify({ data: { type: 'group-members', attributes: { role } } })
        }),

    getFeed: (groupId: string, params?: GroupListParams) =>
        client<GenericListDocument<GroupActivityResource>>(
            `/groups/${groupId}/feed${buildListQuery(params)}`
        ),

    listPosts: (groupId: string, params?: GroupListParams) =>
        client<GenericListDocument<GroupPostResource>>(
            `/groups/${groupId}/posts${buildListQuery(params)}`
        ),

    getPost: (groupId: string, postId: string) =>
        client<{ data: GroupPostResource }>(`/groups/${groupId}/posts/${postId}`),

    createPost: (groupId: string, attributes: { body: string; is_pinned?: boolean }) =>
        client<{ data: GroupPostResource }>(`/groups/${groupId}/posts`, {
            method: 'POST',
            body: JSON.stringify({ data: { type: 'group-post', attributes } })
        }),

    updatePost: (groupId: string, postId: string, attributes: { body?: string; is_pinned?: boolean }) =>
        client<{ data: GroupPostResource }>(`/groups/${groupId}/posts/${postId}`, {
            method: 'PATCH',
            body: JSON.stringify({ data: { type: 'group-post', id: postId, attributes } })
        }),

    deletePost: (groupId: string, postId: string) =>
        client(`/groups/${groupId}/posts/${postId}`, { method: 'DELETE' }),

    streamUrl: (groupId: string, token?: string) => {
        const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
        const url = `${base}/groups/${groupId}/stream`;
        if (!token) return url;
        return `${url}?token=${encodeURIComponent(token)}`;
    }
};
