import { toBasicISOString } from '@douglasneuroinformatics/libjs';
import type { FormInstrument, Language } from '@opendatacapture/runtime-core';
import type { InstrumentRecord } from '@opendatacapture/schemas/instrument-records';
import { getTheraVisit, isTheraPatientCode, THERA_NAMES } from '@opendatacapture/schemas/thera';
import type { TheraStoredVisit, TheraVisit } from '@opendatacapture/schemas/thera';

import { formatClinicalRecordValues } from './clinical-data-values';

export const THERA_UNIFIED_OPTION_ID = '__THERA_SGM_2026__';
export const THERA_VISIT_LABELS: { [key in TheraVisit]: string } = {
  V0: 'Visita basal',
  V1: 'Primera visita',
  V2: 'Segunda visita',
  V3: 'Tercera visita',
  V4: 'Cuarta visita'
};
const visitOrder: TheraVisit[] = ['V0', 'V1', 'V2', 'V3', 'V4'];

export type TheraDatahubVisit = {
  __data__: { [key: string]: unknown };
  __groupId__?: null | string;
  __id__: string;
  __instrumentId__: string;
  __subjectId__: string;
  label: string;
};

function recordData(record: InstrumentRecord): { [key: string]: unknown } {
  return record.data && typeof record.data === 'object' && !Array.isArray(record.data)
    ? Object.fromEntries(Object.entries(record.data))
    : {};
}

export function getTheraStoredVisits(
  records: InstrumentRecord[],
  instruments: readonly { id: string; internal?: null | { name: string } }[]
): TheraStoredVisit[] {
  const instrumentVisits = new Map(
    instruments.flatMap((instrument) => {
      const visit = instrument.internal && getTheraVisit(instrument.internal.name);
      return visit ? [[instrument.id, visit] as const] : [];
    })
  );
  return records.flatMap((record) => {
    const visit = getTheraRecordVisit(record, instrumentVisits);
    return visit ? [{ id: record.id, visit, data: recordData(record) }] : [];
  });
}

export function getTheraRecordVisit(
  record: InstrumentRecord,
  instrumentVisits: ReadonlyMap<string, TheraVisit>
): TheraVisit | undefined {
  const knownVisit = instrumentVisits.get(record.instrumentId);
  if (knownVisit) return knownVisit;
  const data = recordData(record);
  const visit = data.study_visit;
  return isTheraPatientCode(data.patient_code) && typeof visit === 'string' && Object.hasOwn(THERA_NAMES, visit)
    ? (visit as TheraVisit)
    : undefined;
}

export function mergeTheraRecords(
  records: InstrumentRecord[],
  instrumentVisits: ReadonlyMap<string, TheraVisit>,
  content?: FormInstrument.Content<FormInstrument.Data, Language>
) {
  const patients = new Map<string, { record: InstrumentRecord; visit: TheraVisit }[]>();
  for (const record of records) {
    const visit = getTheraRecordVisit(record, instrumentVisits);
    if (!visit) continue;
    const data = recordData(record);
    const code = isTheraPatientCode(data.patient_code) ? data.patient_code : record.id;
    const key = JSON.stringify([record.groupId, record.subjectId, code]);
    const entries = patients.get(key) ?? [];
    entries.push({ record, visit });
    patients.set(key, entries);
  }

  const rows = [...patients.values()].map((entries) => {
    entries.sort(
      (a, b) =>
        visitOrder.indexOf(a.visit) - visitOrder.indexOf(b.visit) ||
        a.record.date.getTime() - b.record.date.getTime() ||
        a.record.id.localeCompare(b.record.id)
    );
    const first = entries[0]!.record;
    const latest = entries.reduce((a, b) => (a.record.date > b.record.date ? a : b)).record;
    const fourth = entries.find(({ visit }) => visit === 'V4');
    const row: {
      [key: string]: unknown;
      __data__: { [key: string]: unknown };
      __date__: Date;
      __id__: string;
      __instrumentId__: string;
      __subjectId__: string;
      __time__: number;
      __visits__: TheraDatahubVisit[];
    } = {
      __data__: recordData(first),
      __date__: latest.date,
      __id__: first.id,
      __instrumentId__: first.instrumentId,
      __subjectId__: first.subjectId,
      __time__: latest.date.getTime(),
      __visits__: [],
      patient_code: recordData(first).patient_code,
      site_hospital: recordData(first).site_hospital,
      study_completed: entries.some(({ visit }) => visit === 'V4'),
      completion_date: fourth ? recordData(fourth.record).visit_date : undefined
    };
    if (entries.some(({ record }) => recordData(record)._thera_test_dates === true)) row.test_record = true;
    const counts = new Map<TheraVisit, number>();
    for (const { record, visit } of entries) {
      const count = (counts.get(visit) ?? 0) + 1;
      counts.set(visit, count);
      const prefix = `${visit.toLowerCase()}${count > 1 ? `_${count}` : ''}`;
      row[`${prefix}_date_collected`] = toBasicISOString(record.date);
      const displayData = formatClinicalRecordValues({ ...record.computedMeasures, ...recordData(record) }, content);
      for (const [field, value] of Object.entries(displayData)) {
        if (field.startsWith('_warning') || field === '_thera_test_dates') continue;
        row[`${prefix}_${field}`] = value;
      }
      row.__visits__.push({
        __data__: recordData(record),
        __groupId__: record.groupId,
        __id__: record.id,
        __instrumentId__: record.instrumentId,
        __subjectId__: record.subjectId,
        label: `${THERA_VISIT_LABELS[visit]}${count > 1 ? ` (${count})` : ''}`
      });
    }
    return row;
  });
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row).filter((key) => !key.startsWith('__'))))];
  return rows.map((row) => ({
    ...Object.fromEntries(columns.map((key) => [key, undefined])),
    ...row
  }));
}

export function formatTheraFieldLabel(field: string) {
  return field;
}
