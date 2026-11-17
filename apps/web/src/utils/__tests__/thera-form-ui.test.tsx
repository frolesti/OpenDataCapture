import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

import { Form } from '@douglasneuroinformatics/libui/components';
import type { AnyUnilingualFormInstrument } from '@opendatacapture/runtime-core';
import * as protocol from '@opendatacapture/schemas/thera';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { parse } from 'papaparse';
import ts from 'typescript';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod/v3';

import { FormContent } from '../../../../../packages/react-core/src/components/FormContent';
import { InstrumentSummary } from '../../../../../packages/react-core/src/components/InstrumentSummary/InstrumentSummary';
import { deserializeInstrumentDraft, serializeInstrumentDraft } from '../instrument-draft';

import '../../services/i18n';

const download = vi.hoisted(() => vi.fn<(filename: string, content: () => string) => Promise<void>>());
vi.mock('@douglasneuroinformatics/libui/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@douglasneuroinformatics/libui/hooks')>()),
  useDownload: () => download
}));
vi.mock('@opendatacapture/react-core', async () => ({
  CopyButton: (await import('../../../../../packages/react-core/src/components/CopyButton')).CopyButton
}));

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
  eva_dyspareunia: 1,
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
  download.mockClear();
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
  it('renders the embedded injection diagram instead of its encoded markup', () => {
    const diagram = 'data:image/png;base64,aGVsbG8=';
    const withDiagram = {
      ...instrument,
      content: [
        {
          title: 'Datos sobre la intervención',
          description: `![Localización de las inyecciones](${diagram})`,
          fields: {}
        }
      ]
    };
    render(<FormContent instrument={withDiagram} onSubmit={vi.fn()} />);
    expect(screen.getByRole('img', { name: 'Localización de las inyecciones' }).getAttribute('src')).toBe(diagram);
    expect(screen.queryByText(/base64/)).toBeNull();
  });
  it('allows a manually entered baseline code and preserves it in draft changes', async () => {
    const { changes } = renderBaseline({ patient_code: '' });
    const input = screen.getByLabelText<HTMLInputElement>('Código de paciente *');
    expect(input.disabled).toBe(false);
    fireEvent.change(input, { target: { value: 'centre/patient 7' } });
    fireEvent.blur(input);
    await waitFor(() =>
      expect(changes).toHaveBeenLastCalledWith(expect.objectContaining({ patient_code: 'centre/patient 7' }))
    );
  });
  it('locks the other controls until a valid visit date is entered and locks them again after an invalid change', async () => {
    renderBaseline({ visit_date: '' });
    const date = screen.getByLabelText<HTMLInputElement>('Fecha de visita *');
    const consent = within(document.querySelector('[data-field-group="informed_consent"]') as HTMLElement).getByRole(
      'radio',
      { name: 'Sí' }
    );
    expect(consent.hasAttribute('disabled') || consent.getAttribute('aria-disabled') === 'true').toBe(true);
    fireEvent.focus(date);
    fireEvent.change(date, { target: { value: '31/01/2024' } });
    fireEvent.blur(date);
    await waitFor(() => expect(consent.hasAttribute('disabled')).toBe(false));
    fireEvent.focus(date);
    fireEvent.change(date, { target: { value: '31/02/2024' } });
    fireEvent.blur(date);
    await waitFor(() =>
      expect(consent.hasAttribute('disabled') || consent.getAttribute('aria-disabled') === 'true').toBe(true)
    );
  });

  it('combines a future date and an out-of-window date into one field error and disables the report', async () => {
    const followup = definitions.createTheraInstrument!('V1');
    const future = new Date();
    future.setUTCFullYear(future.getUTCFullYear() + 1);
    render(
      <FormContent
        revalidateOnChange
        initialValues={{ ...initialData, baseline_date: '2024-01-31', visit_date: future.toISOString().slice(0, 10) }}
        instrument={followup}
        onSubmit={vi.fn()}
      />
    );
    fireEvent.submit(document.querySelector('form')!);
    const group = document.querySelector('[data-field-group="visit_date"]')!;
    await waitFor(() => expect(group.textContent).toContain('La fecha no puede ser futura.'));
    const errors = within(group as HTMLElement).getAllByText(/La fecha no puede ser futura/);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.textContent).toContain('22/02/2024');
    expect(screen.getByLabelText<HTMLInputElement>('Sequedad vaginal (0–10) *').disabled).toBe(true);
  });

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

  it('shows stored dates as DD/MM/AAAA and accepts a manual leap-day date', async () => {
    const { changes } = renderBaseline();
    const input = screen.getByLabelText<HTMLInputElement>('Fecha de visita *');
    expect(input.value).toBe('31/01/2024');
    expect(input.placeholder).toBe('DD/MM/AAAA');
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
    await screen.findByText('Introduzca una fecha válida (DD/MM/AAAA)');
    expect(input.value).toBe('31/02/2024');
    expect(changes.mock.lastCall?.[0].visit_date).toBe('31/02/2024');
    expect(submit).not.toHaveBeenCalled();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '29/02/2024' } });
    fireEvent.blur(input);
    await waitFor(() => expect(screen.queryByText('Introduzca una fecha válida (DD/MM/AAAA)')).toBeNull());
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
    await screen.findByText('Introduzca una fecha válida (DD/MM/AAAA)');
  });

  it('keeps the stored reference date in the form without a blank visit-window input', async () => {
    const followup = definitions.createTheraInstrument!('V1');
    render(
      <FormContent
        initialValues={{ ...initialData, baseline_date: '2024-01-31', visit_date: '2024-02-29' }}
        instrument={followup}
        onDataChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.queryByText(/Ventana permitida/)).toBeNull();
    expect(screen.queryByLabelText(/Ventana permitida/)).toBeNull();
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

  it.each(protocol.THERA_VISIT_ORDER)(
    'uses bounded 0-10 numeric inputs without default scores or sliders in %s',
    async (visit) => {
      const changes = vi.fn<(data: { [key: string]: unknown }) => void>();
      const submit = vi.fn();
      const visitDate =
        visit === 'V0'
          ? '2024-01-31'
          : protocol.theraVisitWindow(visit, visit === 'V1' ? '2024-01-31' : '2024-02-29')!.min;
      render(
        <FormContent
          revalidateOnChange
          initialValues={{
            ...initialData,
            baseline_date: '2024-01-31',
            first_visit_date: '2024-02-29',
            visit_date: visitDate,
            eva_dryness: undefined,
            eva_dyspareunia: undefined
          }}
          instrument={definitions.createTheraInstrument!(visit)}
          onDataChange={changes}
          onSubmit={submit}
        />
      );
      expect(screen.queryAllByRole('slider')).toHaveLength(0);
      for (const label of ['Sequedad vaginal', 'Dispareunia (dolor)']) {
        const input = screen.getByLabelText<HTMLInputElement>(`${label} (0–10) *`);
        const key = label === 'Sequedad vaginal' ? 'eva_dryness' : 'eva_dyspareunia';
        expect(input.value).toBe('');
        expect(input.min).toBe('0');
        expect(input.max).toBe('10');
        expect(input.disabled).toBe(false);
        expect(changes.mock.lastCall?.[0][key]).toBeUndefined();
        fireEvent.change(input, { target: { value: '0' } });
        await waitFor(() => expect(changes.mock.lastCall?.[0][key]).toBe(0));
        fireEvent.change(input, { target: { value: '1' } });
        await waitFor(() => expect(changes.mock.lastCall?.[0][key]).toBe(1));
        fireEvent.change(input, { target: { value: '10' } });
        await waitFor(() => expect(changes.mock.lastCall?.[0][key]).toBe(10));
        fireEvent.change(input, { target: { value: '11' } });
        expect(input.value).toBe('10');
        fireEvent.change(input, { target: { value: '1.5' } });
        fireEvent.blur(input);
        const group = input.closest('[data-field-group]')!;
        await waitFor(() => expect(group.textContent).toContain('integer'));
        fireEvent.submit(document.querySelector('form')!);
        expect(submit).not.toHaveBeenCalled();
      }
    }
  );

  it.each(protocol.THERA_VISIT_ORDER)('keeps all radio options vertical and left-aligned in %s', (visit) => {
    render(
      <FormContent
        initialValues={{ ...initialData, inclusion_2: 'si' }}
        instrument={definitions.createTheraInstrument!(visit)}
        onSubmit={vi.fn()}
      />
    );
    const root = screen.getByTestId('form-content').closest('.space-y-6')!;
    expect(root.classList.contains('[&_[data-testid=radio-group]]:!flex-col')).toBe(true);
    expect(root.classList.contains('[&_[data-testid=radio-group]]:!items-start')).toBe(true);
    expect(root.classList.contains('[&_[data-testid=radio-group]]:!justify-start')).toBe(true);
    expect(root.querySelector('[data-testid="radio-group"]')).not.toBeNull();
  });

  it('reveals clinical questions after consent and inclusions without waiting for age, exclusions or scores', async () => {
    const { submit } = renderBaseline({
      consent_date: undefined,
      inclusion_2: undefined,
      age: undefined,
      eva_dryness: undefined,
      eva_dyspareunia: undefined,
      ...Object.fromEntries(
        [...protocol.THERA_EXCLUSIONS, ...protocol.THERA_VAGINAL_ITEMS].map((key) => [key, undefined])
      )
    });
    expect(screen.queryByLabelText('Peso (kg) *')).toBeNull();
    const consentDate = screen.getByLabelText('Fecha de firma del consentimiento *');
    fireEvent.focus(consentDate);
    fireEvent.change(consentDate, { target: { value: '31/01/2024' } });
    fireEvent.blur(consentDate);
    expect(screen.queryByLabelText('Peso (kg) *')).toBeNull();
    const inclusion = document.querySelector('[data-field-group="inclusion_2"]') as HTMLElement;
    fireEvent.click(within(inclusion).getByRole('radio', { name: 'Sí' }));
    await screen.findByLabelText('Peso (kg) *');
    for (const key of ['fsfi_1', 'vulvar_labia', 'serious_adverse_event']) {
      expect(document.querySelector(`[data-field-group="${key}"]`)).not.toBeNull();
    }
    fireEvent.change(screen.getByLabelText('Edad (años) *'), { target: { value: '17' } });
    fireEvent.change(screen.getByLabelText('Sequedad vaginal (0–10) *'), { target: { value: '1' } });
    const exclusion = document.querySelector('[data-field-group="exclusion_1"]') as HTMLElement;
    fireEvent.click(within(exclusion).getByRole('radio', { name: 'Sí' }));
    expect(screen.getByLabelText('Peso (kg) *')).toBeDefined();
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() =>
      expect(within(exclusion).getByText('Este criterio de exclusión debe marcarse como "No".')).toBeDefined()
    );
    expect(submit).not.toHaveBeenCalled();
  });

  describe('instrument summary CSV', () => {
    it('downloads variables as columns and one response row without losing structured or quoted values', () => {
      const data = {
        patient_code: 'TH-01-01',
        eva_dryness: 6,
        notes: 'Dolor, "leve"\nsegunda línea',
        safety_events: [{ event: 'Dolor', resolved: false }],
        _warning_hidden: 'Do not export'
      };
      render(
        <InstrumentSummary
          data={data}
          instrument={{ ...instrument, measures: {} }}
          timeCollected={Date.UTC(2024, 0, 31)}
        />
      );
      fireEvent.click(screen.getByTitle('Descarregar resultats (CSV)'));
      expect(download).toHaveBeenCalledOnce();
      const content = download.mock.lastCall?.[1]();
      if (!content) throw new Error('Missing CSV download');
      expect(content.startsWith('\uFEFF')).toBe(true);
      const rows = parse<string[]>(content.slice(1)).data;
      expect(rows).toEqual([
        ['patient_code', 'eva_dryness', 'notes', 'safety_events'],
        ['TH-01-01', '6', 'Dolor, "leve"\nsegunda línea', JSON.stringify(data.safety_events)]
      ]);
    });
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
