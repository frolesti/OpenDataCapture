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
  aliasKeys: z.array(z.string().min(1)).optional(),
  id: z.string().min(1),
  isInternal: z.boolean(),
  name: z.string().min(1)
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

export function hospitalMatchesName(hospital: Pick<HospitalOption, 'aliasKeys' | 'name'>, value: string) {
  const key = normalizeHospitalKey(value);
  return key.length > 0 && (normalizeHospitalKey(hospital.name) === key || hospital.aliasKeys?.includes(key) === true);
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
export const DEFAULT_GROUP_HOSPITAL = 'Alta Medical Services';
export const $StudyCode = z.enum(['OR', 'TH']);
export type StudyCode = z.infer<typeof $StudyCode>;

export function getInstrumentStudyCode(name: string): StudyCode | undefined {
  if (/^THERA_SGM_2026_V[0-4]$/.test(name)) return 'TH';
  if (name === 'ORION_PR_2026_SELECTION' || name === 'ORION_PR_2026_FOLLOWUP') return 'OR';
  return undefined;
}

export function inferGroupStudyCode(
  group: { name: string; accessibleInstrumentIds: readonly string[] },
  instruments: readonly { id: string; internal?: null | { name: string } }[]
): StudyCode | undefined {
  const name = group.name
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, '');
  const namedCode = ['THERA', 'THERASGM2026'].includes(name)
    ? 'TH'
    : ['ORION', 'ORIONPR2026'].includes(name)
      ? 'OR'
      : undefined;
  return namedCode &&
    instruments.some(
      ({ id, internal }) =>
        internal && group.accessibleInstrumentIds.includes(id) && getInstrumentStudyCode(internal.name) === namedCode
    )
    ? namedCode
    : undefined;
}

export const $CreateGroupData = z.object({
  accessibleInstrumentIds: z.array(z.string().min(1)).optional(),
  hospitals: z.array(z.string().min(1)).default([]),
  name: z.string().min(1),
  studyCode: $StudyCode.nullish(),
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
    settings: $GroupSettings.partial(),
    studyCode: $StudyCode.nullable()
  })
  .partial();
