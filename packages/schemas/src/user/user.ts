import { z } from 'zod/v4';

import { $BaseModel, $Permissions } from '../core/core.js';
import { $Sex } from '../subject/subject.js';

export const $BasePermissionLevel = z.enum(['ADMIN', 'GROUP_MANAGER', 'STANDARD']);

export type BasePermissionLevel = z.infer<typeof $BasePermissionLevel>;

export type User = z.infer<typeof $User>;
export const $StudyHospital = z.object({
  groupId: z.string().min(1),
  hospitalId: z.string().min(1)
});
export type StudyHospital = z.infer<typeof $StudyHospital>;

export const $User = $BaseModel.extend({
  additionalPermissions: $Permissions,
  basePermissionLevel: $BasePermissionLevel.nullable(),
  dateOfBirth: z.coerce.date().nullish(),
  email: z.string().email().nullish(),
  firstName: z.string().min(1),
  groupIds: z.array(z.string()),
  hospital: z.string().nullish(),
  studyHospitals: z.array($StudyHospital).optional(),
  studyNumbers: z
    .array(z.object({ groupId: z.string(), number: z.number().int().positive(), isTest: z.boolean() }))
    .optional(),
  userType: z.enum(['INVESTIGATOR', 'TEST_USER']).optional(),
  lastName: z.string().min(1),
  sex: $Sex.nullish(),
  username: z.string().min(1)
});

export type CreateUserData = z.infer<typeof $CreateUserData>;
export const $CreateUserData = $User
  .pick({
    basePermissionLevel: true,
    email: true,
    firstName: true,
    groupIds: true,
    lastName: true,
    username: true
  })
  .extend({
    studyHospitals: z.array($StudyHospital).optional(),
    userType: z.enum(['INVESTIGATOR', 'TEST_USER']).optional(),
    dateOfBirth: z.coerce.date().optional(),
    password: z.string().min(1),
    sex: $Sex.optional()
  });

export type UpdateUserData = z.infer<typeof $UpdateUserData>;
export const $UpdateUserData = $CreateUserData.partial().extend({
  additionalPermissions: $Permissions.optional(),
  hospital: z.string().optional()
});

export const $PendingInvestigatorStatus = z.enum(['PENDING', 'IN_PROGRESS', 'READY_FOR_ACCOUNT', 'COMPLETED']);
export type PendingInvestigatorStatus = z.infer<typeof $PendingInvestigatorStatus>;

export const $PendingInvestigatorUserType = z.enum(['INVESTIGATOR', 'TEST_USER']);
export type PendingInvestigatorUserType = z.infer<typeof $PendingInvestigatorUserType>;

export const $ProfessionalTitle = z.enum(['Dr', 'Dra']);
export type ProfessionalTitle = z.infer<typeof $ProfessionalTitle>;

export type PendingInvestigator = z.infer<typeof $PendingInvestigator>;
export const $PendingInvestigator = $BaseModel.extend({
  basePermissionLevel: $BasePermissionLevel,
  dateOfBirth: z.coerce.date().nullish(),
  email: z.string().email(),
  firstName: z.string().min(1),
  groupIds: z.array(z.string()),
  hospital: z.string().min(1),
  studyHospitals: z.array($StudyHospital).optional(),
  lastName: z.string().min(1),
  mailError: z.string().nullish(),
  mailSentAt: z.coerce.date().nullish(),
  notes: z.string().nullish(),
  professionalTitle: $ProfessionalTitle.nullish(),
  promotedAt: z.coerce.date().nullish(),
  promotedUserId: z.string().nullish(),
  sex: $Sex.nullish(),
  signed: z.boolean(),
  status: $PendingInvestigatorStatus,
  userType: $PendingInvestigatorUserType
});

export type CreatePendingInvestigatorData = z.infer<typeof $CreatePendingInvestigatorData>;
export const $CreatePendingInvestigatorData = $PendingInvestigator
  .pick({
    basePermissionLevel: true,
    email: true,
    firstName: true,
    groupIds: true,
    hospital: true,
    studyHospitals: true,
    userType: true,
    lastName: true,
    notes: true,
    professionalTitle: true,
    signed: true
  })
  .extend({ userType: $PendingInvestigatorUserType.optional() });

export type UpdatePendingInvestigatorData = z.infer<typeof $UpdatePendingInvestigatorData>;
export const $UpdatePendingInvestigatorData = $CreatePendingInvestigatorData.partial();
