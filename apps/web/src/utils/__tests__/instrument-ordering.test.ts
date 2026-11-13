import type { TranslatedInstrumentInfo } from '@opendatacapture/schemas/instrument';
import { THERA_NAMES, THERA_VISIT_ORDER } from '@opendatacapture/schemas/thera';
import { describe, expect, it } from 'vitest';

import { compareInstruments } from '../../components/InstrumentShowcase/InstrumentShowcase';

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
