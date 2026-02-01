import { client } from './client';

export interface RoleAttributes {
    name: string;
    slug: string;
    type: 'global' | 'group';
    description?: string;
    permissions: string[];
}

export interface Role {
    id: string;
    type: 'roles';
    attributes: RoleAttributes;
}

export const rolesApi = {
    getAll: () => client('/roles')
};
