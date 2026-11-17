import { describe, expect, it } from 'vitest';
import {
  formatOrionInvestigatorNumber,
  isOrionPatientCode,
  normalizeOrionAdverseEventRecords
} from '@opendatacapture/schemas/instrument-records';

import { deserializeInstrumentDraft, serializeInstrumentDraft } from '../instrument-draft';
import { loadInstrument, loadSchema, selectionData } from './orion-test-utils';

const selectionSchema = loadSchema('orion-pr-2026.ts');
const followupSchema = loadSchema('orion-pr-2026-followup.ts');

const adherenceCombinations = Array.from({ length: 16 }, (_, combination) =>
  Object.fromEntries(
    ['forget', 'remember', 'better', 'worse'].map((field, index) => [
      `mmas_${field}`,
      combination & (1 << index) ? 'si' : 'no'
    ])
  )
);

describe('ORION adherence wording compatibility', () => {
  it.each([
    ['orion-pr-2026.ts', 'retro_', 'ORION_PR_2026_SELECTION', 37],
    ['orion-pr-2026-followup.ts', '', 'ORION_PR_2026_FOLLOWUP', 19]
  ] as const)(
    'uses the supplied Spanish wording with unchanged answer keys in %s',
    (filename, prefix, name, edition) => {
      const instrument = loadInstrument(filename);
      const data = { ...selectionData(), continues_study: 'si' };
      const fields = Object.fromEntries(instrument.content.flatMap((group) => Object.entries(group.fields)));
      const expectedLabels = {
        mmas_forget: '¿Olvida alguna vez tomar sus medicamentos? *',
        mmas_remember: '¿Alguna vez tiene problemas para recordar tomar su medicamento? *',
        mmas_better: 'Cuando se siente mejor, ¿deja de tomar sus medicamentos en algunas ocasiones? *',
        mmas_worse: 'Si alguna vez le sienta mal la medicación, ¿la deja de tomar? *'
      };
      expect(instrument.internal).toEqual({ edition, name });
      expect(instrument.measures).toEqual({});
      expect(Object.keys(fields).filter((key) => key.startsWith(`${prefix}mmas_`))).toEqual(
        Object.keys(expectedLabels).map((key) => `${prefix}${key}`)
      );
      for (const [key, label] of Object.entries(expectedLabels)) {
        const field = fields[`${prefix}${key}`];
        const rendered = field?.kind === 'dynamic' ? field.render?.(data) : field;
        expect(rendered).toMatchObject({ kind: 'string', label, options: { no: 'No', si: 'Sí' } });
      }
    }
  );

  it.each(adherenceCombinations)('preserves stored selection responses and draft answers: %j', (answers) => {
    const storedAnswers = Object.fromEntries(Object.entries(answers).map(([key, value]) => [`retro_${key}`, value]));
    const data = { ...selectionData(), patient_code: 'OR-01-01', ...storedAnswers };
    const restored = deserializeInstrumentDraft(serializeInstrumentDraft(data)).data;
    expect(selectionSchema.parse(restored)).toMatchObject(storedAnswers);
    expect(restored).toEqual(data);
  });
});

describe('ORION hidden adverse-event rows', () => {
  it('reproduces the empty-set error and removes the hidden row before selection validation', () => {
    const data = {
      ...selectionData(),
      baseline_adverse_events: 'no',
      adverse_event_records: [{ seriousness: new Set() }]
    };
    const before = selectionSchema.safeParse(data);
    expect(before.success).toBe(false);
    if (!before.success)
      expect(before.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'too_small', path: ['adverse_event_records', 0, 'seriousness'] })
        ])
      );
    const normalized = normalizeOrionAdverseEventRecords(data, 'ORION_PR_2026_SELECTION');
    expect(selectionSchema.safeParse(normalized).success).toBe(true);
    expect(normalized).not.toHaveProperty('adverse_event_records');
    expect(data.adverse_event_records).toHaveLength(1);
  });

  it('still rejects an empty seriousness selection when adverse events are reported', () => {
    const data = { ...selectionData(), adverse_event_records: [{ seriousness: new Set() }] };
    const normalized = normalizeOrionAdverseEventRecords(data, 'ORION_PR_2026_SELECTION');
    expect(normalized).toBe(data);
    const result = selectionSchema.safeParse(normalized);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ['adverse_event_records', 0, 'seriousness'] })])
      );
  });

  it.each([{ adverse_events: 'no' }, { continues_study: 'no' }])('discards hidden follow-up rows for %j', (answers) => {
    const data = { ...answers, adverse_event_records: [{ seriousness: new Set() }] };
    expect(normalizeOrionAdverseEventRecords(data, 'ORION_PR_2026_FOLLOWUP')).not.toHaveProperty(
      'adverse_event_records'
    );
  });

  it.each(['OTHER_FORM', 'ORION_PR_2026_FOLLOWUP'])('does not use the selection answer for %s', (name) => {
    const data = { baseline_adverse_events: 'no', adverse_event_records: [{ seriousness: new Set() }] };
    expect(normalizeOrionAdverseEventRecords(data, name)).toBe(data);
  });
});

describe('ORION client date and draft regressions', () => {
  it.each([
    [1, 'XX'],
    [2, 'XY'],
    [3, 'XZ'],
    [4, 'YA'],
    [5, 'YB'],
    [55, 'ZZ'],
    [56, 'AAA']
  ] as const)('formats internal investigator %i as %s', (number, code) =>
    expect(formatOrionInvestigatorNumber(number, true)).toBe(code)
  );
  it.each(['', '   ', null, undefined, 12])('rejects empty or non-text codes: %s', (code) => {
    expect(isOrionPatientCode(code)).toBe(false);
  });
  it.each([
    'centre/patient 7',
    'a',
    '123',
    'OR-01-01',
    'OR-02-01',
    'OR-TEST-01-01',
    'OR-1000-101',
    'OR-XX-01',
    'OR-XY-01',
    'OR-YB-02',
    'OR-AAA-01'
  ])('accepts investigator and internal patient codes: %s', (code) => {
    expect(isOrionPatientCode(code)).toBe(true);
    expect(selectionSchema.safeParse({ ...selectionData(), patient_code: code }).success).toBe(true);
  });
  it.each(['01-11-2026', '30-11-2026', '15-12-2026', '31-12-2027'])(
    'accepts selection and consent dates within the expanded study window: %s',
    (date) => {
      expect(
        selectionSchema.safeParse({ ...selectionData(), selection_visit_date: date, consent_signed_date: date }).success
      ).toBe(true);
    }
  );

  it.each([
    ['selection_visit_date', '31-10-2026'],
    ['consent_signed_date', '31-10-2026'],
    ['selection_visit_date', '01-01-2028'],
    ['consent_signed_date', '01-01-2028']
  ])('rejects %s outside the study window: %s', (field, date) => {
    const result = selectionSchema.safeParse({ ...selectionData(), [field]: date });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: [field],
            message: expect.stringContaining('entre noviembre de 2026 y diciembre de 2027')
          })
        ])
      );
    }
  });

  it('still rejects consent signed after a November selection visit', () => {
    const result = selectionSchema.safeParse({
      ...selectionData(),
      selection_visit_date: '01-11-2026',
      consent_signed_date: '02-11-2026'
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['consent_signed_date'],
            message: 'La fecha de firma del consentimiento no puede ser posterior a la visita de selección.'
          })
        ])
      );
    }
  });

  it('accepts an adverse event before December and resolution after selection', () => {
    expect(selectionSchema.safeParse(selectionData()).success).toBe(true);
  });

  it.each(['15-12-2026', '14-12-2026'])('accepts onset on or before selection: %s', (onsetDate) => {
    const data = selectionData();
    (data.adverse_event_records as Record<string, unknown>[])[0]!.onset_date = onsetDate;
    expect(selectionSchema.safeParse(data).success).toBe(true);
  });

  it('rejects onset after selection with a visible field error', () => {
    const data = selectionData();
    (data.adverse_event_records as Record<string, unknown>[])[0]!.onset_date = '16-12-2026';
    const result = selectionSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ['adverse_event_records', 0, 'onset_date'] })])
      );
  });

  it.each(['31-12-2025', '31-08-2026'])('rejects PR before IR completion: %s', (startDate) => {
    const result = selectionSchema.safeParse({ ...selectionData(), current_treatment_start_1: startDate });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['current_treatment_start_1'],
            message: expect.stringContaining('finalización de pregabalina IR')
          })
        ])
      );
  });

  it.each(['01-09-2026', '02-09-2026'])('accepts PR on or after IR completion: %s', (startDate) => {
    expect(selectionSchema.safeParse({ ...selectionData(), current_treatment_start_1: startDate }).success).toBe(true);
  });

  it('submits selection data restored from a draft', () => {
    expect(
      selectionSchema.safeParse(deserializeInstrumentDraft(serializeInstrumentDraft(selectionData())).data).success
    ).toBe(true);
  });

  it.each(['OR-01-01', 'OR-TEST-01-01', 'OR-XX-01', 'OR-YB-01'])(
    'preserves adverse-event selections in Followup for %s',
    (patientCode) => {
      const event = (selectionData().adverse_event_records as Record<string, unknown>[])[0];
      const data: Record<string, unknown> = {
        patient_code: patientCode,
        continues_study: 'si',
        followup_date: '15-03-2027',
        eq5d_vas: 80,
        cgi_improvement: '2',
        objective_achieved: 'si',
        dose_change: 'no',
        concomitant_treatment_changes: 'no',
        adverse_events: 'si',
        adverse_event_records: [event],
        professional_attestation: true
      };
      for (const dimension of ['mobility', 'selfcare', 'activities', 'pain', 'anxiety'])
        data[`eq5d_${dimension}`] = '1';
      for (const dimension of ['onset', 'maintenance', 'quality', 'daytime']) data[`sleep_${dimension}`] = '1';
      for (const answers of adherenceCombinations) {
        const stored = { ...data, ...answers };
        const restored = deserializeInstrumentDraft(serializeInstrumentDraft(stored)).data;
        expect(followupSchema.parse(restored)).toMatchObject(answers);
        expect(restored).toEqual(stored);
      }
    }
  );
});
