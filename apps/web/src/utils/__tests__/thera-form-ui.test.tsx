import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

import { Form } from '@douglasneuroinformatics/libui/components';
import type { AnyUnilingualFormInstrument } from '@opendatacapture/runtime-core';
import * as protocol from '@opendatacapture/schemas/thera';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ts from 'typescript';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod/v3';

import { FormContent } from '../../../../../packages/react-core/src/components/FormContent';
import { deserializeInstrumentDraft, serializeInstrumentDraft } from '../instrument-draft';

import '../../services/i18n';

const source = readFileSync(
  resolve(
    import.meta.dirname,
    '../../../../playground/src/instruments/production-documents/thera-sgm-2026/thera-sgm-2026-template.ts'
  ),
  'utf8'
);
const definitions: { createTheraInstrument?: (visit: protocol.TheraVisit) => AnyUnilingualFormInstrument } = {};
runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText,
  {
    Date,
    exports: definitions,
    require(name: string) {
      if (name === '/runtime/v1/zod@3.x') return { z };
      if (name === '/runtime/v1/@opendatacapture/runtime-core') return { defineInstrument: (value: unknown) => value };
      if (name === '@opendatacapture/schemas/thera') return protocol;
      throw new Error(`Unexpected THERA import: ${name}`);
    },
    Set
  }
);
const instrument = definitions.createTheraInstrument!('V0');
const initialData = {
  age: 18,
  consent_date: '2024-01-31',
  eva_dryness: 5,
  eva_dyspareunia: 0,
  informed_consent: 'si',
  patient_code: 'TH-01-01',
  site_hospital: 'Alta Medical Services',
  visit_date: '2024-01-31',
  ...Object.fromEntries(protocol.THERA_INCLUSIONS.map((key) => [key, 'si'])),
  ...Object.fromEntries(protocol.THERA_EXCLUSIONS.map((key) => [key, 'no'])),
  ...Object.fromEntries(protocol.THERA_VAGINAL_ITEMS.map((key) => [key, 3])),
  inclusion_2: 'no'
};
const timezone = process.env.TZ;

beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (timezone === undefined) delete process.env.TZ;
  else process.env.TZ = timezone;
});

function renderBaseline(overrides: { [key: string]: unknown } = {}) {
  const changes = vi.fn<(data: { [key: string]: unknown }) => void>();
  const submit = vi.fn();
  render(
    <FormContent
      revalidateOnChange
      initialValues={{ ...initialData, ...overrides }}
      instrument={instrument}
      onDataChange={changes}
      onSubmit={submit}
    />
  );
  return { changes, submit };
}

describe('THERA real libui controls', () => {
  it.each(protocol.THERA_VISIT_ORDER)('blocks an actual incomplete submission for %s', async (visit) => {
    const submit = vi.fn();
    render(<FormContent instrument={definitions.createTheraInstrument!(visit)} onSubmit={submit} />);
    const form = document.querySelector('form');
    if (!form) throw new Error('Missing form element');
    fireEvent.submit(form);
    const group = document.querySelector('[data-field-group="visit_date"]');
    if (!(group instanceof HTMLElement)) throw new Error('Missing visit date field');
    await waitFor(() => expect(within(group).getByText('Este campo es obligatorio')).toBeDefined());
    expect(submit).not.toHaveBeenCalled();
  });

  it('shows stored dates as dd/mm/aaaa and accepts a manual leap-day date', async () => {
    const { changes } = renderBaseline();
    const input = screen.getByLabelText<HTMLInputElement>('Fecha de visita *');
    expect(input.value).toBe('31/01/2024');
    expect(input.placeholder).toBe('dd/mm/aaaa');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '29/02/2024' } });
    fireEvent.blur(input);
    await waitFor(() => expect(changes.mock.lastCall?.[0].visit_date).toEqual(new Date('2024-02-29T12:00:00.000Z')));
    expect(input.value).toBe('29/02/2024');
    expect(screen.queryByText('Resultado del cribado')).toBeNull();
  });

  it('keeps an invalid date visible, reports its error and clears it after correction', async () => {
    const { changes, submit } = renderBaseline();
    const input = screen.getByLabelText<HTMLInputElement>('Fecha de visita *');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '31/02/2024' } });
    fireEvent.blur(input);
    await screen.findByText('Introduzca una fecha válida (dd/mm/aaaa)');
    expect(input.value).toBe('31/02/2024');
    expect(changes.mock.lastCall?.[0].visit_date).toBe('31/02/2024');
    expect(submit).not.toHaveBeenCalled();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '29/02/2024' } });
    fireEvent.blur(input);
    await waitFor(() => expect(screen.queryByText('Introduzca una fecha válida (dd/mm/aaaa)')).toBeNull());
  });

  it('restores a saved calendar-date draft without changing its date or display format', async () => {
    const { changes } = renderBaseline();
    const input = screen.getByLabelText<HTMLInputElement>('Fecha de visita *');
    fireEvent.change(input, { target: { value: '29/02/2024' } });
    fireEvent.blur(input);
    const expected = new Date('2024-02-29T12:00:00.000Z');
    await waitFor(() => expect(changes.mock.lastCall?.[0].visit_date).toEqual(expected));
    const data = changes.mock.lastCall?.[0];
    if (!data) throw new Error('Missing changed form data');
    const restored = deserializeInstrumentDraft(serializeInstrumentDraft(data));
    expect(restored.data.visit_date).toEqual(expected);
    cleanup();
    renderBaseline(restored.data);
    expect(screen.getByLabelText<HTMLInputElement>('Fecha de visita *').value).toBe('29/02/2024');
  });

  it('does not silently roll an invalid legacy ISO date into the following month', async () => {
    renderBaseline({ visit_date: '2024-02-30' });
    const input = screen.getByLabelText<HTMLInputElement>('Fecha de visita *');
    expect(input.value).toBe('2024-02-30');
    fireEvent.focus(input);
    fireEvent.blur(input);
    await screen.findByText('Introduzca una fecha válida (dd/mm/aaaa)');
  });

  it('keeps the follow-up window visible after stored reference dates become calendar values', async () => {
    const followup = definitions.createTheraInstrument!('V1');
    render(
      <FormContent
        initialValues={{ ...initialData, baseline_date: '2024-01-31', visit_date: '2024-02-29' }}
        instrument={followup}
        onDataChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    await screen.findByText('Ventana permitida: 22/02/2024 a 07/03/2024 (ambos incluidos)');
    expect(screen.getByLabelText<HTMLInputElement>('Fecha basal guardada').value).toBe('31/01/2024');
  });

  it.each(['UTC', 'Pacific/Honolulu', 'Pacific/Auckland'])(
    'selects a calendar day without timezone drift in %s',
    async (zone) => {
      process.env.TZ = zone;
      const today = new Date();
      const { changes } = renderBaseline();
      const input = screen.getByLabelText<HTMLInputElement>('Fecha de visita *');
      fireEvent.click(input);
      const calendar = await screen.findByTestId('datepicker');
      fireEvent.click(within(calendar).getByRole('button', { name: '15' }));
      const expected = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 15, 12));
      await waitFor(() => expect(changes.mock.lastCall?.[0].visit_date).toEqual(expected));
      expect(input.value).toBe(protocol.formatTheraDate(expected));
    }
  );

  it('offers real 0-10 sliders, requires an explicit score and permits zero directly', async () => {
    const { changes } = renderBaseline({ eva_dryness: undefined, eva_dyspareunia: undefined });
    const sliders = screen.getAllByRole('slider');
    expect(sliders).toHaveLength(2);
    for (const slider of sliders) {
      expect(slider.getAttribute('aria-valuemin')).toBe('0');
      expect(slider.getAttribute('aria-valuemax')).toBe('10');
    }
    expect(changes.mock.lastCall?.[0].eva_dryness).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Sequedad vaginal (0–10) *: 0' }));
    await waitFor(() => expect(changes.mock.lastCall?.[0].eva_dryness).toBe(0));
    fireEvent.keyDown(screen.getAllByRole('slider')[0]!, { key: 'End' });
    await waitFor(() => expect(changes.mock.lastCall?.[0].eva_dryness).toBe(10));
  });

  it.each([
    ['inclusion_2', 'no', 'No', 'Este criterio de inclusión debe marcarse como "Sí".'],
    ['exclusion_1', 'si', 'Sí', 'Este criterio de exclusión debe marcarse como "No".']
  ])('reports the criterion error on %s when leaving the field', async (key, value, option, message) => {
    const { submit } = renderBaseline({ [key]: value });
    const group = document.querySelector(`[data-field-group="${key}"]`);
    if (!(group instanceof HTMLElement)) throw new Error(`Missing criterion field ${key}`);
    fireEvent.blur(within(group).getByRole('radio', { name: option }));
    await waitFor(() => expect(within(group).getByText(message)).toBeDefined());
    expect(submit).not.toHaveBeenCalled();
  });

  it('shows the failed inclusion criterion even before the visit date is entered', async () => {
    renderBaseline({ visit_date: undefined });
    const group = document.querySelector('[data-field-group="inclusion_2"]');
    if (!(group instanceof HTMLElement)) throw new Error('Missing inclusion criterion');
    fireEvent.blur(within(group).getByRole('radio', { name: 'No' }));
    await waitFor(() =>
      expect(within(group).getByText('Este criterio de inclusión debe marcarse como "Sí".')).toBeDefined()
    );
  });

  it('does not change the date format of instruments without the new option', () => {
    render(
      <Form
        content={{ date: { kind: 'date', label: 'Existing date' } }}
        initialValues={{ date: new Date('2024-01-31T12:00:00.000Z') }}
        validationSchema={z.object({ date: z.date() })}
        onSubmit={vi.fn()}
      />
    );
    const input = screen.getByTestId<HTMLInputElement>('date-input');
    expect(input.placeholder).toBe('YYYY-MM-DD');
    expect(input.value).toBe('2024-01-31');
  });
});
