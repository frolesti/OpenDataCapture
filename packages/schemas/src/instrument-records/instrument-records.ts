import type { InstrumentKind, InstrumentMeasureValue } from '@opendatacapture/runtime-core';
import { z } from 'zod/v4';

import { $BaseModel, $Json } from '../core/core.js';
import { $InstrumentMeasureValue } from '../instrument/instrument.js';

import type { SessionType } from '../session/session.js';

export function isOrionPatientCode(value: unknown): value is string {
  return typeof value === 'string' && /^OR-(?:TEST-)?\d{2,}-\d+$/.test(value.trim());
}

export function normalizeOrionAdverseEventRecords(data: unknown, instrumentName: string): unknown {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  const values = data as Record<string, unknown>;
  const discard =
    (instrumentName === 'ORION_PR_2026_SELECTION' && values.baseline_adverse_events === 'no') ||
    (instrumentName === 'ORION_PR_2026_FOLLOWUP' &&
      (values.adverse_events === 'no' || values.continues_study === 'no'));
  if (!discard) return data;
  const normalized = { ...values };
  delete normalized.adverse_event_records;
  return normalized;
}

export const $CreateInstrumentRecordData = z.object({
  assignmentId: z.string().optional(),
  data: $Json,
  date: z.coerce.date(),
  groupId: z.string().optional(),
  instrumentId: z.string(),
  sessionId: z.string(),
  subjectId: z.string()
});

export const $UploadInstrumentRecordsData = z.object({
  groupId: z.string().optional(),
  instrumentId: z.string(),
  records: z.array(
    z.object({
      data: $Json,
      date: z.coerce.date(),
      subjectId: z.string()
    })
  )
});

export type CreateInstrumentRecordData = z.infer<typeof $CreateInstrumentRecordData>;

export type UploadInstrumentRecordsData = z.infer<typeof $UploadInstrumentRecordsData>;

export const $InstrumentRecord = $BaseModel.extend({
  assignmentId: z.string().nullish(),
  computedMeasures: z.record(z.string(), $InstrumentMeasureValue).nullish(),
  data: z.unknown(),
  date: z.coerce.date(),
  groupId: z.string().nullish(),
  instrumentId: z.string(),
  subjectId: z.string()
});

export type InstrumentRecord = z.infer<typeof $InstrumentRecord>;

export type InstrumentRecordsExport = {
  groupId: string;
  instrumentEdition: number;
  instrumentName: string;
  measure: string;
  sessionDate: string;
  sessionId: string;
  sessionType: SessionType;
  subjectAge: null | number;
  subjectId: string;
  subjectSex: null | string;
  timestamp: string;
  value: InstrumentMeasureValue;
}[];

export const $LinearRegressionResults = z.record(
  z.string(),
  z.object({
    intercept: z.number(),
    slope: z.number(),
    stdErr: z.number()
  })
);

export type LinearRegressionResults = z.infer<typeof $LinearRegressionResults>;

export type InstrumentRecordQueryParams = {
  groupId?: string;
  instrumentId?: string;
  instrumentName?: string;
  kind?: InstrumentKind;
  minDate?: Date;
  subjectId?: string;
};
