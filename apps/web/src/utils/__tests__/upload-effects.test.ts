import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { constants, runInNewContext } from 'node:vm';

import type { AnyUnilingualFormInstrument } from '@opendatacapture/runtime-core';
import { $FormInstrument } from '@opendatacapture/schemas/instrument';
import { describe, expect, it } from 'vitest';
import { z } from 'zod/v3';

import { createUploadTemplateCSV, Zod3 } from '../upload';

const schema = z
  .preprocess(
    (value) => value,
    z
      .object({
        visit_date: z.string().refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), 'Invalid date'),
        sexual_activity: z.enum(['si', 'no']),
        sexual_score: z.number().optional()
      })
      .superRefine((data, ctx) => {
        if (data.sexual_activity === 'si' && data.sexual_score === undefined) {
          ctx.addIssue({ code: 'custom', path: ['sexual_score'], message: 'Score required' });
        }
      })
  )
  .transform((data) => ({
    ...data,
    sexual_score: data.sexual_activity === 'si' ? data.sexual_score : undefined
  }));

const instrument: AnyUnilingualFormInstrument = {
  __runtimeVersion: 1,
  kind: 'FORM',
  language: 'es',
  internal: { name: 'THERA_UPLOAD_TEST', edition: 1 },
  tags: [],
  content: {},
  details: { title: 'Test', description: 'Test', license: 'FREE-NOS' },
  measures: null,
  validationSchema: schema
};

describe('CSV schemas with nested clinical effects', () => {
  it.each(['v0', 'v1', 'v2', 'v3', 'v4'])('generates a CSV template for the actual THERA %s bundle', async (visit) => {
    const root = path.resolve(import.meta.dirname, '../../../../..');
    const filename = `thera-sgm-2026-${visit}`;
    const payload: { bundle: string } = JSON.parse(
      await readFile(
        path.join(root, `apps/playground/src/instruments/production-documents/thera-sgm-2026/bundles/${filename}.json`),
        'utf8'
      )
    );
    const form = await $FormInstrument.parseAsync(
      await runInNewContext(
        payload.bundle,
        {
          __resolveImport: (specifier: string) => {
            if (!specifier.startsWith('/runtime/v1/')) throw new Error(`Unexpected import: ${specifier}`);
            return pathToFileURL(path.join(root, 'runtime/v1/dist', specifier.slice('/runtime/v1/'.length))).href;
          }
        },
        { importModuleDynamically: constants.USE_MAIN_CONTEXT_DEFAULT_LOADER }
      )
    );
    expect(form.language).toBe('en');
    const template = createUploadTemplateCSV({ ...form, language: 'en' });
    expect(template.content).toContain('visit_date');
    expect(template.content).toContain('patient_code');
  });
  it('generates a template without dropping preprocess/refinement/transform wrappers', () => {
    const result = createUploadTemplateCSV(instrument);
    expect(result.filename).toBe('THERA_UPLOAD_TEST_1_template.csv');
    expect(result.content.split('\r\n')[0]).toBe('subjectID,date,visit_date,sexual_activity,sexual_score');
  });
  it('identifies refined optional fields by their underlying scalar type', () => {
    expect(Zod3.getZodTypeName(z.string().refine(Boolean).optional())).toEqual({
      isOptional: true,
      typeName: 'ZodString'
    });
  });
  it('preserves transformations and internal upload fields', async () => {
    const file = new File(
      ['subjectID,date,visit_date,sexual_activity,sexual_score\nsubject1,2024-01-31,2024-01-31,no,3'],
      'data.csv',
      { type: 'text/csv' }
    );
    const result = await Zod3.processInstrumentCSV(file, instrument);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ subjectID: 'subject1', visit_date: '2024-01-31' });
    expect(result[0]?.date).toBeInstanceOf(Date);
    expect(result[0]?.sexual_score).toBeUndefined();
  });
  it('runs conditional clinical refinements instead of validating only the unwrapped object', async () => {
    const file = new File(
      ['subjectID,date,visit_date,sexual_activity,sexual_score\nsubject1,2024-01-31,2024-01-31,si,'],
      'data.csv',
      { type: 'text/csv' }
    );
    await expect(Zod3.processInstrumentCSV(file, instrument)).rejects.toThrow();
  });
});
