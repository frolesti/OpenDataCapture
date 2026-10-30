import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';
import { z } from 'zod/v3';

export function loadSchema(filename: string): z.ZodTypeAny {
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

export function selectionData(): Record<string, unknown> {
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
