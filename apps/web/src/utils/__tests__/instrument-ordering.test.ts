import { createElement } from 'react';

import type { TranslatedInstrumentInfo } from '@opendatacapture/schemas/instrument';
import { THERA_NAMES, THERA_VISIT_ORDER } from '@opendatacapture/schemas/thera';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorPage } from '../../../../../packages/react-core/src/components/ErrorPage/ErrorPage';
import { InstrumentCard } from '../../components/InstrumentCard/InstrumentCard';
import { StudyVisitActions } from '../../components/StudyVisitActions';
import { compareInstruments } from '../../components/InstrumentShowcase/InstrumentShowcase';

import i18n from '../../services/i18n';

beforeEach(() => {
  i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function info(name: string, title: string): TranslatedInstrumentInfo {
  return {
    __runtimeVersion: 1,
    details: { description: 'Clinical study', license: 'FREE-NOS', title },
    id: name,
    internal: { edition: 3, name },
    kind: 'FORM',
    language: 'en',
    supportedLanguages: ['en'],
    tags: []
  };
}

describe('Clinical instrument ordering', () => {
  const visits = [
    {
      __data__: { eva_dryness: 2 },
      __id__: 'basal',
      __instrumentId__: 'historical-v0',
      __subjectId__: 'investigator',
      label: 'Visita basal'
    },
    {
      __data__: { eva_dryness: 7 },
      __id__: 'first',
      __instrumentId__: 'historical-v1',
      __subjectId__: 'investigator',
      label: 'Primera visita'
    }
  ];

  it('keeps icon buttons and edits only the chosen original visit with its own answers', () => {
    const onEdit = vi.fn();
    render(createElement(StudyVisitActions, { canEdit: true, canDelete: true, visits, onEdit, onDelete: vi.fn() }));
    fireEvent.click(screen.getByRole('button', { name: 'Edita visita' }));
    expect(screen.queryByRole('button', { name: 'Elimina totes les visites' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Primera visita' }));
    expect(onEdit).toHaveBeenCalledExactlyOnceWith(visits[1]);
  });

  it.each([false, true])('selects one visit or all visits for a separate deletion confirmation (%s)', (allVisits) => {
    const onDelete = vi.fn();
    render(createElement(StudyVisitActions, { canEdit: true, canDelete: true, visits, onEdit: vi.fn(), onDelete }));
    fireEvent.click(screen.getByRole('button', { name: 'Elimina visita' }));
    fireEvent.click(screen.getByRole('button', { name: allVisits ? 'Elimina totes les visites' : 'Primera visita' }));
    expect(onDelete).toHaveBeenCalledExactlyOnceWith(allVisits ? 'basal' : 'first', allVisits);
  });

  it.each([
    ['V0', 'Evaluación inicial, antes de la primera visita de tratamiento.'],
    ['V1', '1 mes desde la fecha real de la visita basal (±7 días).'],
    ['V2', '3 meses desde la fecha real de la primera visita (±14 días).'],
    ['V3', '6 meses desde la fecha real de la primera visita (±28 días).'],
    ['V4', '12 meses desde la fecha real de la primera visita (±45 días).']
  ] as const)(
    'shows protocol timing as ordinary details for %s without changing published metadata',
    (visit, timing) => {
      const instrument = info(THERA_NAMES[visit], `THERA ${visit}`);
      render(createElement(InstrumentCard, { instrument, onClick: vi.fn() }));
      const details = screen.getByText('Detalls:').parentElement!;
      expect(details.textContent).toContain(timing);
      expect(details.parentElement?.previousElementSibling?.textContent).toContain('Descripció:');
      expect(details.parentElement?.className).not.toContain('bg-');
      expect(screen.queryByText('Temporalitat:')).toBeNull();
      expect(instrument.details.description).toBe('Clinical study');
      expect(instrument.internal?.edition).toBe(3);
      if (visit === 'V4') expect(screen.getByText(/Esta visita completa el estudio/)).toBeDefined();
    }
  );

  it('only shows the five permitted metadata labels to researchers for every study', () => {
    const instrument = info('OMEGA_LUTS', 'OMEGA');
    instrument.details.authors = ['Coordinator'];
    instrument.clientDetails = { instructions: ['Complete this assessment.'] };
    instrument.tags = ['Internal tag'];
    instrument.details.sourceUrl = 'https://example.org/source';
    const { container } = render(createElement(InstrumentCard, { instrument, onClick: vi.fn() }));
    expect([...container.querySelectorAll('p > span.font-medium')].map((node) => node.textContent)).toEqual([
      'Investigadors coordinadors: ',
      'Descripció: ',
      'Detalls: ',
      'Llicència: '
    ]);
    expect(screen.queryByText('Edició:')).toBeNull();
    expect(screen.queryByText('Idiomes:')).toBeNull();
    expect(screen.queryByText('Etiquetes:')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('omits empty optional metadata and retains technical metadata for admin only', () => {
    const instrument = info('OTHER', 'Other');
    const { rerender } = render(createElement(InstrumentCard, { instrument, onClick: vi.fn() }));
    expect(screen.queryByText('Detalls:')).toBeNull();
    expect(screen.queryByText('Promotor:')).toBeNull();
    rerender(createElement(InstrumentCard, { instrument, isAdmin: true, onClick: vi.fn() }));
    expect(screen.getByText('Edició:')).toBeDefined();
    expect(screen.getByText('Idiomes:')).toBeDefined();
  });

  it('explains HTTP 431 and offers reauthentication instead of calling it not found', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const navigate = vi.spyOn(window.location, 'assign').mockImplementation(() => undefined);
    render(createElement(ErrorPage, { error: { isAxiosError: true, response: { status: 431 } } }));
    expect(screen.getByRole('heading', { name: '431 - Capçaleres HTTP massa grans' })).toBeDefined();
    expect(screen.queryByText(/No trobat/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tornar a iniciar sessió' }));
    expect(navigate).toHaveBeenCalledWith('/auth/login');
  });

  it('orders THERA visits clinically instead of alphabetically by translated title', () => {
    const titles = ['Visita basal', 'Primera visita', 'Segunda visita', 'Tercera visita', 'Cuarta visita'];
    const forms = THERA_VISIT_ORDER.map((visit, index) =>
      info(THERA_NAMES[visit], `THERA-SGM-2026 · ${titles[index]}`)
    );
    expect(
      [forms[4]!, forms[1]!, forms[3]!, forms[0]!, forms[2]!].sort(compareInstruments).map((form) => form.id)
    ).toEqual(THERA_VISIT_ORDER.map((visit) => THERA_NAMES[visit]));
  });

  it('preserves ORION selection-before-followup and unrelated alphabetical ordering', () => {
    const selection = info('ORION_PR_2026_SELECTION', 'Selección');
    const followup = info('ORION_PR_2026_FOLLOWUP', 'Seguimiento');
    const first = info('OTHER_A', 'Alpha');
    const last = info('OTHER_Z', 'Zulu');
    expect([followup, last, first, selection].sort(compareInstruments).map((form) => form.id)).toEqual([
      selection.id,
      first.id,
      last.id,
      followup.id
    ]);
  });

  it('keeps a transitive order when other questionnaires share the THERA title prefix', () => {
    const forms = [
      info(THERA_NAMES.V0, 'THERA-SGM-2026 · Visita basal'),
      info(THERA_NAMES.V1, 'THERA-SGM-2026 · Primera visita'),
      info(THERA_NAMES.V4, 'THERA-SGM-2026 · Cuarta visita'),
      info('OTHER', 'THERA-SGM-2026 · Otra encuesta')
    ];
    for (const first of forms) {
      for (const second of forms) {
        for (const third of forms) {
          if (compareInstruments(first, second) <= 0 && compareInstruments(second, third) <= 0) {
            expect(compareInstruments(first, third)).toBeLessThanOrEqual(0);
          }
        }
      }
    }
  });
});
