import { z } from 'zod/v4';

import { $BaseModel, $RegexString } from '../core/core.js';
import { $SubjectIdentificationMethod } from '../subject/subject.js';

export type GroupSettings = z.infer<typeof $GroupSettings>;
export const $GroupSettings = z.object({
  defaultIdentificationMethod: $SubjectIdentificationMethod,
  idValidationRegex: $RegexString.nullish(),
  idValidationRegexErrorMessage: z
    .object({
      ca: z.string().nullish(),
      en: z.string().nullish(),
      es: z.string().nullish(),
      fr: z.string().nullish()
    })
    .nullish(),
  subjectIdDisplayLength: z.number().nullish()
});

export type GroupType = z.infer<typeof $GroupType>;
export const $GroupType = z.enum(['CLINICAL', 'RESEARCH']);

export const $HospitalOption = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  isInternal: z.boolean()
});
export type HospitalOption = z.infer<typeof $HospitalOption>;

export function normalizeHospitalKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bc\s*\.\s*s\b\.?|\bcs\b\.?/g, 'cs')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export type Group = z.infer<typeof $Group>;
export const $Group = $BaseModel.extend({
  accessibleInstrumentIds: z.array(z.string()),
  hospitals: z.array(z.string().min(1)),
  hospitalCatalog: z.array($HospitalOption).optional(),
  hospitalIds: z.array(z.string()).optional(),
  studyCode: z.string().nullish(),
  dataResetAt: z.coerce.date().nullish(),
  name: z.string().min(1),
  settings: $GroupSettings,
  subjectIds: z.array(z.string()),
  type: $GroupType,
  userIds: z.array(z.string())
});

export type CreateGroupData = z.infer<typeof $CreateGroupData>;
export const $CreateGroupData = z.object({
  hospitals: z.array(z.string().min(1)).default([]),
  name: z.string().min(1),
  settings: $GroupSettings.optional(),
  type: $GroupType
});

export type UpdateGroupData = z.infer<typeof $UpdateGroupData>;
export const $UpdateGroupData = $Group
  .omit({
    hospitalCatalog: true,
    hospitalIds: true,
    studyCode: true,
    dataResetAt: true,
    subjectIds: true,
    userIds: true
  })
  .extend({
    settings: $GroupSettings.partial()
  })
  .partial();
