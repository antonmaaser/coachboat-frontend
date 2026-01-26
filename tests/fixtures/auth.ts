export const AUTH_USERS = {
    admin: {
        id: 'user-admin-uuid',
        firstName: 'System',
        name: 'Admin',
        email: 'admin@coachboat.com',
        password: 'password',
        status: 4,
        role: { slug: 'admin', name: 'Administrator' },
        permissions: ['users:read', 'users:create', 'users:edit', 'users:delete', 'events:read', 'events:create', 'events:edit:any', 'events:delete:any']
    },
    moderator: {
        id: 'user-mod-uuid',
        firstName: 'Site',
        name: 'Moderator',
        email: 'moderator@coachboat.com',
        password: 'password',
        status: 3,
        role: { slug: 'moderator', name: 'Moderator' },
        permissions: ['events:create', 'events:edit:any', 'users:read']
    },
    user: {
        id: 'user-regular-uuid',
        firstName: 'John',
        name: 'Doe',
        email: 'user@coachboat.com',
        password: 'password',
        status: 2,
        role: { slug: 'user', name: 'Benutzer' },
        permissions: ['events:read', 'events:create:own', 'users:read']
    },
    group_only: {
        id: 'user-group-uuid',
        firstName: 'Group',
        name: 'Member',
        email: 'group@coachboat.com',
        password: 'password',
        status: 1,
        role: { slug: 'group_only', name: 'Nur Gruppen' },
        permissions: ['events:read']
    }
};

export const STORAGE_STATE = {
    admin: 'tests/.auth/admin.json',
    moderator: 'tests/.auth/moderator.json',
    user: 'tests/.auth/user.json',
    group_only: 'tests/.auth/group_only.json'
};
