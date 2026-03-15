import type { FormDefinitionV1 } from '$lib/forms/schema';

export type JsonObject = Record<string, unknown>;
export type JsonObjectOrArray = JsonObject | JsonObject[];
export type FormType = 'general' | 'membership' | 'waiver' | 'event_signup';
export type FormVisibility = 'all' | 'admin_moderator';

export interface JSONAPIResponse<T> {
    data: T;
    meta?: Record<string, any>;
    included?: any[];
    links?: {
        self?: string;
        first?: string;
        prev?: string;
        next?: string;
        last?: string;
    };
    errors?: Array<{
        status?: string;
        code?: string;
        title?: string;
        detail?: string;
        message?: string;
    }>;
}

export interface GenericListDocument<T> extends JSONAPIResponse<T[]> { }
export interface GenericDataDocument<T> extends JSONAPIResponse<T> { }

export interface UserResource {
    id: string;
    type: 'user';
    attributes: {
        email?: string;
        password?: string; // Write-only
        name?: string;
        'first-name'?: string;
        'is-active'?: boolean;
        role?: any; // To be refined, can be object or string depending on context
        'created-at'?: string;

        // Legacy/Frontend props that might still be used
        status?: number;
        effective_permissions?: {
            global: { role: string; roleName: string; permissions: string[] } | null;
            contexts: { id: string; name: string; role: string; roleName: string; permissions: string[] }[];
        };
    };
}

export interface RoleResource {
    id: string;
    type: 'roles';
    attributes: {
        name: string;
        slug: string;
        type: 'global' | 'group';
        description?: string;
        permissions: string[];
    };
}

export interface EventResource {
    id: string;
    type: 'event';
    attributes: {
        title: string;
        'created-by'?: string;
        resource?: string;
        'start-date'?: string | number;
        'end-date'?: string | number;
        date?: string;
        'created-at'?: string;
        'is-recurring'?: boolean;
        'recurrence-rule'?: Record<string, any>;
    };
}

export interface ResourceResource {
    id: string;
    type: 'resource';
    attributes: {
        title: string;
        description?: string;
        'is-bookable'?: boolean;
        'created-at'?: string;
        'category-id'?: string;
    };
}

export interface ResourceCategoryResource {
    id: string;
    type: 'resource-category';
    attributes: {
        title: string;
        color?: string;
        icon?: string;
    };
}

export interface TodoResource {
    id: string;
    type: 'todo';
    attributes: {
        'resource-id'?: string;
        'created-by'?: string;
        status?: number;
        title: string;
        description?: string;
        'created-at'?: string;
        'updated-at'?: string;
    };
}

export interface GroupResource {
    id: string;
    type: 'group';
    attributes: {
        title: string;
        description?: string;
        visibility: 'all' | 'hidden';
        'is-member'?: boolean;
        'member-role'?: 'owner' | 'admin' | 'moderator' | 'member' | 'viewer' | null;
        'created-at'?: string;
        'archived-at'?: string | null;
        members?: Array<{
            id: string;
            role: 'owner' | 'admin' | 'moderator' | 'member' | 'viewer';
        }>;
    };
}

export interface GroupPostResource {
    id: string;
    type: 'group-post';
    attributes: {
        body: string;
        'is-pinned'?: boolean;
        'created-by'?: string;
        'created-at'?: string;
        'updated-at'?: string;
        'object-id'?: string; // Add this as it is used in actions
    };
}

export interface GroupActivityResource {
    id: string;
    type: 'group-activity';
    relationships?: {
        actor?: {
            data: { id: string; type: string };
            meta?: Record<string, any>;
        };
        target?: {
            data: { id: string; type: string };
            meta?: Record<string, any>;
        };
    };
    attributes: {
        action: string;
        summary: string;
        visibility: string;
        'created-at': string;
        'object-type': string;
        'object-id': string; // This is the ID of the underlying object (post, etc)
        payload: Record<string, any>;
    };
}

export interface FormResource {
    id: string;
    type: 'form';
    attributes: {
        name: string;
        description?: string;
        fields?: FormDefinitionV1 | JsonObject[];
        'form-type'?: FormType;
        'requires-signature'?: boolean;
        published?: boolean;
        visibility?: FormVisibility;
        'created-by'?: string;
        'created-at'?: string;
    };
}

export interface FormSubmissionResource {
    id: string;
    type: 'form-submission';
    attributes: {
        'form-id': string;
        'submitted-by'?: string | null;
        data: JsonObjectOrArray;
        signature?: string | null;
        status: 'submitted' | 'reviewed' | 'approved' | 'rejected';
        'created-at'?: string;
    };
}

export interface NotificationResource {
    id: string;
    type: 'notification';
    attributes: {
        'user-id'?: string;
        type?: string;
        title: string;
        message: string;
        url?: string | null;
        'created-at'?: string;
        'read-at'?: string | null;
        read?: boolean;
    };
}

export interface NotificationBroadcastResource {
    id: string;
    type: 'notification-broadcast';
    attributes: {
        broadcast: true;
        recipients: number;
        title: string;
        message: string;
        url?: string | null;
    };
}

export interface MessageResource {
    id: string;
    type: 'message';
    attributes: {
        'organization-id'?: string;
        'sender-id'?: string;
        'recipient-id'?: string | null;
        'group-id'?: string | null;
        subject?: string | null;
        body: string;
        'created-at'?: string;
        'read-at'?: string | null;
        [key: string]: unknown;
    };
}

export interface ConversationLastMessage {
    id?: string;
    'sender-id'?: string;
    'recipient-id'?: string | null;
    'group-id'?: string | null;
    subject?: string | null;
    body?: string;
    'created-at'?: string;
    [key: string]: unknown;
}

export interface ConversationResource {
    id: string;
    type: 'conversation';
    attributes: {
        kind: 'direct' | 'group';
        'counterpart-user-id'?: string | null;
        counterpart?: Record<string, unknown> | null;
        'group-id'?: string | null;
        group?: Record<string, unknown> | null;
        'last-message'?: ConversationLastMessage | null;
        'message-count'?: number;
        'updated-at'?: string | null;
        [key: string]: unknown;
    };
}
