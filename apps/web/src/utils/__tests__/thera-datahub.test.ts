import type { FormInstrument } from '@opendatacapture/runtime-core';
import type { InstrumentRecord } from '@opendatacapture/schemas/instrument-records';
import type { TheraVisit } from '@opendatacapture/schemas/thera';
import { describe, expect, it, vi } from 'vitest';

import { formatClinicalDataValue, formatClinicalRecordValues } from '../clinical-data-values';
import { formatTheraFieldLabel, getTheraRecordVisit, mergeTheraRecords } from '../thera-datahub';

const visits = new Map<string, TheraVisit>(['V0', 'V1', 'V2', 'V3', 'V4'].map((visit) => [visit, visit as TheraVisit]));
function record(
  visit: TheraVisit,
  data: { [key: string]: unknown } = {},
  overrides: Partial<InstrumentRecord> = {}
): InstrumentRecord {
  const date = new Date('2025-01-01T12:00:00Z');
  return {
    createdAt: date,
    updatedAt: date,
    date,
    id: visit,
    instrumentId: visit,
    subjectId: 'investigator',
    groupId: 'thera',
    data: { patient_code: 'TH-01-01', site_hospital: 'Hospital', study_visit: visit, ...data },
    ...overrides
  };
}

describe('THERA unified patient data', () => {
  it('identifies test patients without exposing the private date-override flag as a clinical column', () => {
    const marked = record('V1', { _thera_test_dates: true });
    const [row] = mergeTheraRecords([record('V0'), marked], visits);
    expect(row?.test_record).toBe(true);
    expect(row).not.toHaveProperty('v1__thera_test_dates');
    expect(row?.__visits__[1]?.__data__._thera_test_dates).toBe(true);
  });

  it('combines the baseline and four follow-ups without overwriting repeated responses', () => {
    const records = [...visits.values()].map((visit, index) =>
      record(visit, { eva_dryness: index, visit_date: `2025-01-0${index + 1}` })
    );
    const rows = mergeTheraRecords(records, visits);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      patient_code: 'TH-01-01',
      v0_eva_dryness: 0,
      v1_eva_dryness: 1,
      v2_eva_dryness: 2,
      v3_eva_dryness: 3,
      v4_eva_dryness: 4,
      study_completed: true,
      completion_date: '2025-01-05'
    });
    expect(rows[0]?.__visits__).toHaveLength(5);
    expect(rows[0]).not.toHaveProperty('group_id');
    expect(rows[0]?.__visits__[1]).toMatchObject({ __id__: 'V1', __instrumentId__: 'V1', label: 'Primera visita' });
    expect(rows[0]?.__visits__[1]?.__data__).toEqual(records[1]?.data);
  });

  it('never merges the same patient code across investigators or groups', () => {
    expect(
      mergeTheraRecords(
        [
          record('V0'),
          record('V1', {}, { subjectId: 'other', id: 'other-investigator' }),
          record('V2', {}, { groupId: 'other', id: 'other-group' })
        ],
        visits
      )
    ).toHaveLength(3);
  });

  it('keeps incomplete patients and provides the same columns for every export row', () => {
    const rows = mergeTheraRecords(
      [
        record('V0'),
        record('V0', { patient_code: 'TH-01-02' }, { id: 'second-baseline' }),
        record('V4', { patient_code: 'TH-01-02', extra_measure: 9 }, { id: 'fourth' })
      ],
      visits
    );
    expect(rows[0]).toMatchObject({ study_completed: false });
    expect(rows[0]).toHaveProperty('v4_extra_measure', undefined);
    expect(rows[1]).toMatchObject({ study_completed: true, v4_extra_measure: 9 });
    expect(new Set(Object.keys(rows[0]!))).toEqual(new Set(Object.keys(rows[1]!)));
  });

  it('preserves computed measures, multiselects and all repeating safety records', () => {
    const events = [
      { description: 'First', causality: 'Unrelated' },
      { description: 'Second', causality: 'Possible' }
    ];
    const rows = mergeTheraRecords(
      [
        record(
          'V2',
          {
            treatments: new Set(['one', 'two']),
            adverse_event_records: events
          },
          { computedMeasures: { vaginal_health_total: 12 } }
        )
      ],
      visits
    );
    expect(rows[0]?.v2_vaginal_health_total).toBe(12);
    expect(rows[0]?.v2_adverse_event_records).toBe(
      '1. Description: First; Causality: Unrelated | 2. Description: Second; Causality: Possible'
    );
    expect(rows[0]?.v2_treatments).toBe('one, two');
    expect(rows[0]?.__visits__[0]?.__data__).toMatchObject({
      treatments: new Set(['one', 'two']),
      adverse_event_records: events
    });
    expect(rows[0]?.__visits__[0]?.__data__.adverse_event_records).toBe(events);
  });

  it('uses the instrument labels for native and serialized multiselect answers without changing source answers', () => {
    const content: FormInstrument.Content<FormInstrument.Data, 'en'> = [
      {
        fields: {
          childbirth_types: {
            kind: 'dynamic',
            deps: ['childbirth'],
            render: (data) =>
              data.childbirth === 'si'
                ? {
                    kind: 'set',
                    variant: 'select',
                    label: 'Tipos de parto',
                    options: { instrumental: 'Vaginal con fórceps/ventosa', vaginal_con: 'Vaginal con episiotomía' }
                  }
                : null
          }
        }
      }
    ];
    const encoded = {
      __deserializedType: 'Set',
      __isSerializedType: true,
      value: ['instrumental', 'vaginal_con']
    };
    for (const answer of [new Set(encoded.value), encoded, JSON.stringify(encoded)]) {
      const source = record('V0', { childbirth: 'si', childbirth_types: answer });
      const [row] = mergeTheraRecords([source], visits, content);
      expect(row?.v0_childbirth_types).toBe('Vaginal con fórceps/ventosa, Vaginal con episiotomía');
      expect(row?.__visits__[0]?.__data__.childbirth_types).toBe(answer);
    }
  });

  it('keeps every nested answer readable, including conditional record fields, zero and false', () => {
    const content: FormInstrument.Content<FormInstrument.Data, 'en'> = {
      events: {
        kind: 'record-array',
        label: 'Eventos',
        fieldset: {
          description: { kind: 'string', variant: 'input', label: 'Descripción' },
          resolved: { kind: 'boolean', variant: 'checkbox', label: 'Resuelto' },
          resolution_date: {
            kind: 'dynamic',
            render: (data) => (data.resolved ? { kind: 'date', label: 'Fecha de resolución' } : null)
          }
        }
      }
    };
    const data = {
      events: [
        {
          description: 'Dolor, "leve"\nSegundo día',
          resolved: true,
          resolution_date: '2026-01-02',
          extra: { score: 0 }
        },
        { description: 'Otro', resolved: false }
      ]
    };
    const formatted = formatClinicalRecordValues(data, content);
    expect(formatted.events).toBe(
      '1. Descripción: Dolor, "leve"\nSegundo día; Resuelto: Sí; Fecha de resolución: 2026-01-02; Extra: Score: 0 | 2. Descripción: Otro; Resuelto: No'
    );
    expect(data.events[1]?.resolved).toBe(false);
    expect(formatClinicalDataValue(new Set())).toBe('');
    expect(formatClinicalDataValue(undefined)).toBeUndefined();
    expect(formatClinicalDataValue(null)).toBeNull();
  });

  it('recognizes historical editions by persisted visit metadata, but not another study', () => {
    const historical = record('V1', {}, { instrumentId: 'old-edition' });
    expect(getTheraRecordVisit(historical, visits)).toBe('V1');
    expect(
      getTheraRecordVisit(
        record('V1', { patient_code: 'OR-01-01', study_visit: undefined }, { instrumentId: 'orion' }),
        visits
      )
    ).toBeUndefined();
    expect(
      getTheraRecordVisit(record('V1', { study_visit: 'END' }, { instrumentId: 'retired' }), visits)
    ).toBeUndefined();
  });

  it('decodes historical repeating answers and reports invalid serialization without leaking JSON', () => {
    expect(formatClinicalDataValue('[{"reaction":"Dolor","extra":{"score":0}}]', { parseJson: true })).toBe(
      '1. Reaction: Dolor; Extra: Score: 0'
    );
    expect(formatClinicalDataValue('["literal free text"]')).toBe('["literal free text"]');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(formatClinicalDataValue('[invalid', { parseJson: true })).toBe('Error: respuesta no legible');
      expect(error).toHaveBeenCalledOnce();
    } finally {
      error.mockRestore();
    }
  });

  it('retains unexpected duplicate visits in distinct columns and record actions', () => {
    const rows = mergeTheraRecords(
      [record('V1', { eva_dryness: 2 }), record('V1', { eva_dryness: 8 }, { id: 'duplicate' })],
      visits
    );
    expect(rows[0]?.v1_eva_dryness).not.toBe(rows[0]?.v1_2_eva_dryness);
    expect(rows[0]?.__visits__.map((visit) => visit.__id__).sort()).toEqual(['V1', 'duplicate'].sort());
    expect(rows[0]?.__visits__[1]?.label).toBe('Primera visita (2)');
  });

  it('labels visit-specific columns without confusing the clinical field number with a duplicate visit', () => {
    expect(formatTheraFieldLabel('v4_eva_dryness')).toBe('v4_eva_dryness');
    expect(formatTheraFieldLabel('v2_cervantes_12')).toBe('v2_cervantes_12');
    expect(formatTheraFieldLabel('v1_2_eva_dryness')).toBe('v1_2_eva_dryness');
  });
});
