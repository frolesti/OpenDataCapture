import { z } from 'zod/v4';

import type { Permissions } from '../core/core.js';
import type { Group } from '../group/group.js';
import type { BasePermissionLevel } from '../user/user.js';

export type AuthPayload = {
  accessToken: string;
};

export type LoginCredentials = z.infer<typeof $LoginCredentials>;
export const $LoginCredentials = z.object({
  password: z.string(),
  username: z.string().trim().min(1)
});

export type TokenPayload = {
  basePermissionLevel: BasePermissionLevel | null;
  firstName: null | string;
  groups: Pick<Group, 'id'>[];
  id?: string;
  lastName: null | string;
  permissions: Permissions;
  username: string;
};

export function createTokenPayload(
  user: Pick<TokenPayload, 'basePermissionLevel' | 'firstName' | 'groups' | 'lastName' | 'username'> & { id: string }
): Omit<TokenPayload, 'permissions'> {
  return {
    basePermissionLevel: user.basePermissionLevel,
    firstName: user.firstName,
    groups: user.groups.map(({ id }) => ({ id })),
    id: user.id,
    lastName: user.lastName,
    username: user.username
  };
}
