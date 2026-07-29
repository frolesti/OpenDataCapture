import { z } from 'zod/v4';

import { $BaseModel, $Permissions } from '../core/core.js';
import { $Sex } from '../subject/subject.js';

export const $BasePermissionLevel = z.enum(['ADMIN', 'GROUP_MANAGER', 'STANDARD']);

export type BasePermissionLevel = z.infer<typeof $BasePermissionLevel>;

export type User = z.infer<typeof $User>;
export const $User = $BaseModel.extend({
  additionalPermissions: $Permissions,
  basePermissionLevel: $BasePermissionLevel.nullable(),
  dateOfBirth: z.coerce.date().nullish(),
  email: z.string().email().nullish(),
  firstName: z.string().min(1),
  groupIds: z.array(z.string()),
  lastName: z.string().min(1),
  sex: $Sex.nullish(),
  username: z.string().min(1)
});

export type CreateUserData = z.infer<typeof $CreateUserData>;
export const $CreateUserData = $User
  .pick({
    basePermissionLevel: true,
    firstName: true,
    groupIds: true,
    lastName: true,
    username: true
  })
  .extend({
    dateOfBirth: z.coerce.date().optional(),
    password: z.string().min(1),
    sex: $Sex.optional()
  });

export type UpdateUserData = z.infer<typeof $UpdateUserData>;
export const $UpdateUserData = $CreateUserData.partial().extend({
  additionalPermissions: $Permissions.optional()
});

export const $PendingInvestigatorStatus = z.enum(['PENDING', 'IN_PROGRESS', 'READY_FOR_ACCOUNT', 'COMPLETED']);
export type PendingInvestigatorStatus = z.infer<typeof $PendingInvestigatorStatus>;

export const $PendingInvestigatorUserType = z.enum(['INVESTIGATOR', 'TEST_USER']);
export type PendingInvestigatorUserType = z.infer<typeof $PendingInvestigatorUserType>;

export type PendingInvestigator = z.infer<typeof $PendingInvestigator>;
export const $PendingInvestigator = $BaseModel.extend({
  basePermissionLevel: $BasePermissionLevel,
  dateOfBirth: z.coerce.date().nullish(),
  email: z.string().email(),
  firstName: z.string().min(1),
  groupIds: z.array(z.string()),
  hospital: z.string().min(1),
  lastName: z.string().min(1),
  mailError: z.string().nullish(),
  mailSentAt: z.coerce.date().nullish(),
  notes: z.string().nullish(),
  promotedAt: z.coerce.date().nullish(),
  promotedUserId: z.string().nullish(),
  sex: $Sex.nullish(),
  signed: z.boolean(),
  status: $PendingInvestigatorStatus,
  userType: $PendingInvestigatorUserType
});

export type CreatePendingInvestigatorData = z.infer<typeof $CreatePendingInvestigatorData>;
export const $CreatePendingInvestigatorData = $PendingInvestigator.pick({
  basePermissionLevel: true,
  email: true,
  firstName: true,
  groupIds: true,
  hospital: true,
  lastName: true,
  notes: true,
  signed: true
});

export type UpdatePendingInvestigatorData = z.infer<typeof $UpdatePendingInvestigatorData>;
export const $UpdatePendingInvestigatorData = $CreatePendingInvestigatorData.partial();
