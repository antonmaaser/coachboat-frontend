// Simple ID generator
const id = () => Math.random().toString(36).substring(2, 15);

// Type definitions
export interface User {
    id: string;
    firstName: string;
    name: string;
    email: string;
    status: number;
    permissions: string[];
    role?: { slug: string; name: string };
}

export interface Group {
    id: string;
    title: string;
    description: string;
    visibility: string;
    createdAt: string;
}

export interface Resource {
    _id: string;
    title: string;
    description: string;
    isReady: boolean;
    isHidden: boolean;
    createdAt: string;
}

export interface Event {
    _id: string;
    title: string;
    createdBy: string;
    resource: string;
    startDate: string;
    endDate: string;
    date: string;
    isRecurring: boolean;
}

// Factory functions
export const createUser = (overrides: Partial<User> = {}): User => ({
    id: id(),
    firstName: 'Test',
    name: 'User',
    email: 'test@example.com',
    status: 1,
    permissions: [],
    role: { slug: 'user', name: 'Benutzer' },
    ...overrides
});

export const createGroup = (overrides: Partial<Group> = {}): Group => ({
    id: id(),
    title: 'Test Group',
    description: 'A test group',
    visibility: 'all',
    createdAt: new Date().toISOString(),
    ...overrides
});

export const createResource = (overrides: Partial<Resource> = {}): Resource => ({
    _id: id(),
    title: 'Test Resource',
    description: 'A test resource',
    isReady: true,
    isHidden: false,
    createdAt: new Date().toISOString(),
    ...overrides
});

export const createEvent = (overrides: Partial<Event> = {}): Event => ({
    _id: id(),
    title: 'Test Event',
    createdBy: id(),
    resource: id(),
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 3600000).toISOString(),
    date: new Date().toISOString().split('T')[0],
    isRecurring: false,
    ...overrides
});

// Resource Category
export interface ResourceCategory {
    id: string;
    title: string;
    color: string;
    icon?: string;
}

export const createResourceCategory = (overrides: Partial<ResourceCategory> = {}): ResourceCategory => ({
    id: id(),
    title: 'Test Category',
    color: '#3b82f6',
    icon: 'Anchor',
    ...overrides
});

// Role
export interface Role {
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

export const createRole = (overrides: Partial<Role['attributes']> & { id?: string } = {}): Role => ({
    id: overrides.id || id(),
    type: 'roles',
    attributes: {
        name: 'Test Role',
        slug: 'test_role',
        type: 'global',
        permissions: [],
        ...overrides
    }
});
