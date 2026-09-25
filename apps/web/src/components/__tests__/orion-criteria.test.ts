import { createElement } from 'react';

import { Form } from '@douglasneuroinformatics/libui/components';
import { i18n } from '@douglasneuroinformatics/libui/i18n';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import ts from 'typescript';
import { afterEach, expect, it } from 'vitest';
import { z } from 'zod';

import source from '../../../../playground/src/instruments/production-documents/orion-pr-2026/orion-pr-2026.ts?raw';

const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
}).outputText;
const instrument = (() => {
  const exports: Record<string, any> = {};
  const runtimeImport = (name: string) => {
    if (name === '/runtime/v1/zod@3.x') return { z };
    if (name === '/runtime/v1/@opendatacapture/runtime-core') {
      return { defineInstrument: (definition: unknown) => definition };
    }
    throw new Error(`Unexpected runtime import: ${name}`);
  };
  new Function('require', 'exports', compiled)(runtimeImport, exports);
  return exports.default;
})();

afterEach(cleanup);

it('shows and clears each criteria error on radio change without blur or submit', async () => {
  if (!i18n.isInitialized) i18n.init({ translations: {} as any });
  const initialValues: Record<string, unknown> = { patient_code: 'TEST', informed_consent: 'si' };
  for (let index = 1; index <= 6; index++) {
    initialValues[`inclusion_${index}`] = 'si';
    initialValues[`exclusion_${index}`] = 'no';
  }
  const { container } = render(
    createElement(Form, {
      content: instrument.content.filter((group: any) => /CRITERIOS DE (INCLUSIÓN|EXCLUSIÓN)/.test(group.title)),
      initialValues,
      revalidateOnBlur: true,
      validationSchema: instrument.validationSchema,
      onSubmit: () => {
        throw new Error('Must not submit during live validation');
      }
    })
  );

  for (const prefix of ['inclusion', 'exclusion']) {
    for (let index = 1; index <= 6; index++) {
      const field = `${prefix}_${index}`;
      const group = container.querySelector(`[data-field-group="${field}"]`)!;
      const wrong = prefix === 'inclusion' ? 'no' : 'si';
      const correct = prefix === 'inclusion' ? 'si' : 'no';
      const message =
        prefix === 'inclusion'
          ? 'Este criterio de inclusión debe marcarse como "Sí".'
          : 'Este criterio de exclusión debe marcarse como "No".';
      fireEvent.click(group.querySelector(`[role="radio"][value="${wrong}"]`)!);
      await waitFor(() => expect(group.textContent).toContain(message));
      fireEvent.click(group.querySelector(`[role="radio"][value="${correct}"]`)!);
      await waitFor(() => expect(group.textContent).not.toContain(message));
    }
  }
});
