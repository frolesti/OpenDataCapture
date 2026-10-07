import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { z } from 'zod/v3';

import { deserializeInstrumentDraft, serializeInstrumentDraft } from '../instrument-draft';

function loadSchema(filename: string): z.ZodTypeAny {
  const source = readFileSync(
    resolve(import.meta.dirname, '../../../../playground/src/instruments/production-documents/orion-pr-2026', filename),
    'utf8'
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  });
  const exports: { default?: { validationSchema: z.ZodTypeAny } } = {};
  runInNewContext(compiled.outputText, {
    Date,
    Set,
    exports,
    require(name: string) {
      if (name === '/runtime/v1/zod@3.x') return { z };
      if (name === '/runtime/v1/@opendatacapture/runtime-core') {
        return { defineInstrument: (instrument: unknown) => instrument };
      }
      throw new Error(`Unexpected instrument import: ${name}`);
    }
  });
  return exports.default!.validationSchema;
}

const selectionSchema = loadSchema('orion-pr-2026.ts');
const followupSchema = loadSchema('orion-pr-2026-followup.ts');

function selectionData(): Record<string, unknown> {
  const data: Record<string, unknown> = {
    patient_code: '01-001',
    site_hospital: 'Hospital',
    informed_consent: 'si',
    selection_visit_date: '15-12-2026',
    consent_signed_date: '15-12-2026',
    age: 50,
    sex: 'femenino',
    weight: 70,
    height: 170,
    neuropathy_etiology: 'diabetes',
    neuropathy_location: 'peripheral',
    diagnosis_date: '01-01-2025',
    prev_treatment_dose_mg_1: 150,
    prev_treatment_start_1: '01-01-2026',
    prev_treatment_end_1: '01-09-2026',
    current_treatment_dose_mg_1: 165,
    current_treatment_start_1: '01-09-2026',
    change_reason_adherence: true,
    cgi_improvement: '2',
    baseline_adverse_events: 'si',
    professional_attestation: true,
    adverse_event_records: [
      {
        reaction: 'Dolor',
        onset_date: '01-08-2026',
        resolution_date: '20-12-2026',
        intensity: 'leve',
        outcome: 'recuperado',
        actions_taken: 'Ninguna',
        seriousness: new Set(['no_grave'])
      }
    ]
  };
  for (let criterion = 1; criterion <= 6; criterion++) {
    data[`inclusion_${criterion}`] = 'si';
    data[`exclusion_${criterion}`] = 'no';
  }
  for (const prefix of ['retro', 'prosp']) {
    for (const dimension of ['mobility', 'selfcare', 'activities', 'pain', 'anxiety'])
      data[`${prefix}_eq5d_${dimension}`] = '1';
    data[`${prefix}_eq5d_vas`] = 80;
    for (const dimension of ['onset', 'maintenance', 'quality', 'daytime']) data[`${prefix}_sleep_${dimension}`] = '1';
  }
  for (const dimension of ['forget', 'remember', 'better', 'worse']) data[`retro_mmas_${dimension}`] = 'no';
  return data;
}

describe('ORION client date and draft regressions', () => {
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
