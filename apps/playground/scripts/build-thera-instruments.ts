import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { replacer, reviver } from '@douglasneuroinformatics/libjs';
import { format } from 'prettier';
import { z } from 'zod/v4';

import { bundle } from '@opendatacapture/instrument-bundler';
import type { AnyUnilingualFormInstrument, FormInstrument } from '@opendatacapture/runtime-core';
import { $AnyInstrument } from '@opendatacapture/schemas/instrument';
import {
  THERA_EXCLUSIONS,
  THERA_INCLUSIONS,
  THERA_VAGINAL_ITEMS,
  theraVisitWindow
} from '@opendatacapture/schemas/thera';

import { evaluateInstrument } from '../../../packages/runtime-internal/src/index.js';

const root = path.resolve(import.meta.dirname, '../../..');
const directory = path.join(root, 'apps/playground/src/instruments/production-documents/thera-sgm-2026');
const outputDirectory = path.join(directory, 'bundles');
const checkOnly = process.argv.includes('--check');
const $PlaygroundLanguage = z.object({ language: z.enum(['en', 'fr']) });
const source = await readFile(path.join(directory, 'thera-sgm-2026-template.ts'), 'utf8');
const protocol = await readFile(path.join(root, 'packages/schemas/src/instrument-records/thera.ts'), 'utf8');
const factoryDeclaration = 'export function createTheraInstrument(visit: TheraVisit) {';
const protocolImports =
  /import \{[^;]*\} from '@opendatacapture\/schemas\/thera';\nimport type \{ TheraVisit \} from '@opendatacapture\/schemas\/thera';/;
assert(source.includes(factoryDeclaration), 'Expected the THERA factory declaration');
assert(source.trimEnd().endsWith('}'), 'Expected the THERA factory closing brace');
assert(protocolImports.test(source), 'Expected the shared THERA protocol imports');

async function standaloneSource(visit: string): Promise<string> {
  const content = source
    .trimEnd()
    .slice(0, -1)
    .replace(protocolImports, protocol)
    .replace(factoryDeclaration, `const visit = '${visit.toUpperCase()}' as TheraVisit;`)
    .replace('return defineInstrument({', 'export default defineInstrument({');
  assert(!content.includes('@opendatacapture/schemas/thera'), 'Standalone forms cannot import workspace packages');
  assert(!content.includes('createTheraInstrument'), 'Standalone forms cannot depend on the factory');
  return await format(content, { parser: 'typescript', singleQuote: true, printWidth: 120, trailingComma: 'none' });
}

Object.assign(globalThis, {
  __resolveImport(specifier: string) {
    if (!specifier.startsWith('/runtime/v1/')) throw new Error(`Unexpected runtime import: ${specifier}`);
    return pathToFileURL(path.join(root, 'runtime/v1/dist', specifier.slice('/runtime/v1/'.length))).href;
  }
});

function fixture(instrument: AnyUnilingualFormInstrument, visit: string): Record<string, unknown> {
  const data: Record<string, unknown> = {
    patient_code: 'TH-01-01',
    site_hospital: 'Hospital de prueba',
    baseline_date: '2024-01-31',
    first_visit_date: '2024-02-29',
    visit_date:
      visit === 'v0'
        ? '2024-01-31'
        : theraVisitWindow(
            visit.toUpperCase() as 'V1' | 'V2' | 'V3' | 'V4',
            visit === 'v1' ? '2024-01-31' : '2024-02-29'
          )!.min,
    informed_consent: 'si',
    consent_date: '2024-01-31',
    age: 18,
    eva_dryness: 5,
    eva_dyspareunia: 0,
    weight: 65,
    height: 165,
    ...Object.fromEntries(THERA_INCLUSIONS.map((key) => [key, 'si'])),
    ...Object.fromEntries(THERA_EXCLUSIONS.map((key) => [key, 'no'])),
    ...Object.fromEntries(THERA_VAGINAL_ITEMS.map((key) => [key, 3]))
  };
  const groups = Array.isArray(instrument.content) ? instrument.content : [{ fields: instrument.content }];
  for (let pass = 0; pass < 3; pass++) {
    for (const group of groups) {
      for (const [key, candidate] of Object.entries(group.fields)) {
        if (!candidate || data[key] !== undefined) continue;
        const field = candidate.kind === 'dynamic' ? candidate.render(data as FormInstrument.PartialData) : candidate;
        if (!field || field.disabled) continue;
        if (field.kind === 'string') {
          data[key] =
            'options' in field ? ('no' in field.options ? 'no' : Object.keys(field.options)[0]) : '2024-01-31';
        } else if (field.kind === 'number') {
          data[key] = 'options' in field ? Number(Object.keys(field.options)[0]) : 1;
        } else if (field.kind === 'set') {
          data[key] = new Set([Object.keys(field.options)[0]]);
        }
      }
    }
  }
  return data;
}

let assertions = 0;
const verify = (condition: boolean, message: string) => {
  assert(condition, message);
  assertions++;
};
if (!checkOnly) await mkdir(outputDirectory, { recursive: true });

for (const visit of ['v0', 'v1', 'v2', 'v3', 'v4']) {
  const filename = `thera-sgm-2026-${visit}`;
  const entry = await standaloneSource(visit);
  const code = await bundle({
    inputs: [{ name: 'index.ts', content: entry }]
  });
  const evaluated: unknown = await evaluateInstrument(code);
  $PlaygroundLanguage.parse(evaluated);
  const instrument = await $AnyInstrument.parseAsync(evaluated);
  assert(instrument.kind === 'FORM' && typeof instrument.language === 'string');
  const form = instrument as AnyUnilingualFormInstrument;
  verify(form.language === 'en', `${visit}: language metadata follows ORION and the public Playground contract`);
  const instructions = form.clientDetails?.instructions ?? [];
  const overview = instructions.join(', ');
  verify(instructions.length === 1, `${visit}: instructions render without array separator commas`);
  const expectedTitle = {
    v0: 'Visita basal',
    v1: 'Primera visita',
    v2: 'Segunda visita',
    v3: 'Tercera visita',
    v4: 'Cuarta visita'
  }[visit];
  verify(form.details.title === `THERA-SGM-2026 · ${expectedTitle}`, `${visit}: title uses a descriptive visit name`);
  verify(
    Array.isArray(form.content) && form.content[0]?.title === 'Datos de la visita',
    `${visit}: first section does not repeat the instrument title`
  );
  verify(
    overview.includes('AAA-MM-DD. Si no puede'),
    `${visit}: instruction sentences are separated by a period and space`
  );
  verify(form.clientDetails?.estimatedDuration === 30, `${visit}: overview includes the estimated duration`);
  verify(!overview.includes('THERA-SGM-2026'), `${visit}: overview does not repeat the heading`);
  verify(!overview.includes('.,'), `${visit}: rendered overview has no period-comma punctuation`);
  verify(overview.split(/\s+/).length <= 80, `${visit}: overview stays concise`);
  verify(
    !overview.includes('Promotora:') && !overview.includes('Eficacia de'),
    `${visit}: instructions exclude study metadata`
  );
  verify(
    overview.includes('borrador') && overview.includes('AAA'),
    `${visit}: instructions explain drafts and date format`
  );
  verify(
    form.details.description.includes('Eficacia de las infiltraciones vaginales'),
    `${visit}: details describe the study`
  );
  verify(
    form.details.authors?.includes('Laura Baquedano Mainar (promotora)') === true,
    `${visit}: details identify the sponsor by role`
  );
  verify(form.details.description.includes('24/07/2026'), `${visit}: metadata retains the source CRF version`);
  verify(form.internal.edition === 2, `${visit}: edition follows the latest published edition`);
  const data = fixture(form, visit);
  const valid = await form.validationSchema.safeParseAsync(data);
  assert(valid.success, `${visit}: ${valid.success ? '' : JSON.stringify(valid.error.issues)}`);
  assertions++;
  verify(valid.data.study_visit === visit.toUpperCase(), `${visit}: canonical stored visit metadata`);
  verify(
    visit === 'v4' ? valid.data.completed_study === true : !('completed_study' in valid.data),
    `${visit}: only the fourth visit automatically completes the study`
  );
  const forgedCompletion = await form.validationSchema.parseAsync({ ...data, completed_study: visit !== 'v4' });
  verify(
    visit === 'v4' ? forgedCompletion.completed_study === true : !('completed_study' in forgedCompletion),
    `${visit}: submitted completion flags cannot override visit-based completion`
  );
  verify(!entry.includes('end_reason'), `${visit}: no independent finalization or early withdrawal fields`);
  verify(
    !(await form.validationSchema.safeParseAsync({ ...data, study_visit: 'wrong' })).success,
    `${visit}: reject forged visit metadata`
  );
  verify(
    (await form.validationSchema.safeParseAsync(JSON.parse(JSON.stringify(valid.data, replacer), reviver))).success,
    `${visit}: JSON round trip`
  );
  verify(
    !(await form.validationSchema.safeParseAsync({ ...data, visit_date: '2024-02-30' })).success,
    `${visit}: invalid calendar date`
  );
  {
    verify(
      !(await form.validationSchema.safeParseAsync({ ...data, eva_dryness: 11 })).success,
      `${visit}: EVA upper bound`
    );
    const withEvent = {
      ...data,
      serious_adverse_event: 'si',
      adverse_event_records: [
        {
          onset_date: data.visit_date,
          event_type: 'grave',
          description: 'Evento sintético',
          device_problem: 'No aplica',
          clinical_signs: 'Registro sintético',
          action_evolution: 'Seguimiento',
          causality: 'Pendiente de evaluación',
          serious_unexpected_device_effect: 'no',
          status: 'resuelto',
          status_detail: 'Resuelto',
          resolution_date: data.visit_date
        }
      ]
    };
    verify((await form.validationSchema.safeParseAsync(withEvent)).success, `${visit}: resolved safety event`);
    verify(
      !(
        await form.validationSchema.safeParseAsync({
          ...withEvent,
          adverse_event_records: [{ ...withEvent.adverse_event_records[0], resolution_date: undefined }]
        })
      ).success,
      `${visit}: missing resolution date`
    );
    verify(
      !(await form.validationSchema.safeParseAsync({ ...data, serious_adverse_event: 'si', adverse_event_records: [] }))
        .success,
      `${visit}: declared event requires details`
    );
  }
  if (visit === 'v0') {
    verify(
      (
        await form.validationSchema.safeParseAsync({
          patient_code: data.patient_code,
          site_hospital: data.site_hospital,
          visit_date: data.visit_date,
          informed_consent: 'no'
        })
      ).success,
      'V0: retain non-consenting screening'
    );
    verify(!(await form.validationSchema.safeParseAsync({ ...data, age: 17 })).success, 'V0: contradictory age');
    verify(
      !(await form.validationSchema.safeParseAsync({ ...data, eva_dryness: 4, eva_dyspareunia: 4 })).success,
      'V0: VHI 15 and both EVA <5 do not satisfy inclusion 3'
    );
    verify(
      !(await form.validationSchema.safeParseAsync({ ...data, consent_date: '2024-02-01' })).success,
      'V0: consent after visit'
    );
    const failedScreen = await form.validationSchema.safeParseAsync({
      ...data,
      inclusion_1: 'no',
      weight: -10,
      fsfi_1: 'stale-invalid'
    });
    verify(failedScreen.success && !('weight' in failedScreen.data), 'V0: inactive stale clinical fields are removed');
  } else {
    const window = theraVisitWindow(
      visit.toUpperCase() as 'V1' | 'V2' | 'V3' | 'V4',
      visit === 'v1' ? String(data.baseline_date) : String(data.first_visit_date)
    )!;
    verify(
      (await form.validationSchema.safeParseAsync({ ...data, visit_date: window.max })).success,
      `${visit}: inclusive maximum`
    );
    const before = new Date(`${window.min}T12:00:00Z`);
    before.setUTCDate(before.getUTCDate() - 1);
    verify(
      !(await form.validationSchema.safeParseAsync({ ...data, visit_date: before.toISOString().slice(0, 10) })).success,
      `${visit}: before window`
    );
    const after = new Date(`${window.max}T12:00:00Z`);
    after.setUTCDate(after.getUTCDate() + 1);
    verify(
      !(await form.validationSchema.safeParseAsync({ ...data, visit_date: after.toISOString().slice(0, 10) })).success,
      `${visit}: after window`
    );
  }
  if (visit === 'v0' || visit === 'v2' || visit === 'v4') {
    const withoutSex = await form.validationSchema.safeParseAsync({
      ...data,
      sexual_activity_4_weeks: 'no',
      cervantes_12: undefined,
      cervantes_13: undefined,
      cervantes_14: undefined,
      cervantes_15: undefined
    });
    verify(withoutSex.success, `${visit}: Cervantes non-sexual branch`);
    verify(
      !(await form.validationSchema.safeParseAsync({ ...data, sexual_activity_4_weeks: 'si', cervantes_12: undefined }))
        .success,
      `${visit}: Cervantes sexual branch requires item 12`
    );
    const stale = await form.validationSchema.safeParseAsync({
      ...data,
      sexual_activity_4_weeks: 'no',
      cervantes_12: 999
    });
    verify(
      stale.success && !('cervantes_12' in stale.data),
      `${visit}: stale inactive Cervantes item removed before validation`
    );
  }
  const sourcePath = path.join(directory, `${filename}.ts`);
  const payloadPath = path.join(outputDirectory, `${filename}.json`);
  const payload = await format(JSON.stringify({ bundle: code }), { parser: 'json' });
  if (checkOnly) {
    verify((await readFile(sourcePath, 'utf8')) === entry, `${visit}: standalone source is up to date`);
    verify((await readFile(payloadPath, 'utf8')) === payload, `${visit}: upload payload is up to date`);
  } else {
    await writeFile(sourcePath, entry);
    await writeFile(payloadPath, payload);
  }
  process.stdout.write(`${visit.toUpperCase()}: bundle and API schema validated\n`);
}
process.stdout.write(
  `${assertions} instrument assertions passed. ${checkOnly ? 'No files written.' : `Upload payloads written to ${outputDirectory}`}\n`
);
