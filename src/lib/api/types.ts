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
