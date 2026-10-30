import { describe, expect, it } from 'vitest';

import { deserializeInstrumentDraft, serializeInstrumentDraft } from '../instrument-draft';
import { loadSchema, selectionData } from './orion-test-utils';

const selectionSchema = loadSchema('orion-pr-2026.ts');
const followupSchema = loadSchema('orion-pr-2026-followup.ts');

describe('ORION client date and draft regressions', () => {
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

  it('preserves adverse-event selections accepted by the Followup schema', () => {
    const event = (selectionData().adverse_event_records as Record<string, unknown>[])[0];
    const data: Record<string, unknown> = {
      patient_code: '01-001',
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
    for (const dimension of ['mobility', 'selfcare', 'activities', 'pain', 'anxiety']) data[`eq5d_${dimension}`] = '1';
    for (const dimension of ['onset', 'maintenance', 'quality', 'daytime']) data[`sleep_${dimension}`] = '1';
    for (const dimension of ['forget', 'remember', 'better', 'worse']) data[`mmas_${dimension}`] = 'no';
    expect(followupSchema.safeParse(deserializeInstrumentDraft(serializeInstrumentDraft(data)).data).success).toBe(
      true
    );
  });
});
