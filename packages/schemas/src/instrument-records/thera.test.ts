import { describe, expect, it } from 'vitest';

import {
  canStartTheraVisit,
  formatTheraDate,
  getTheraVisit,
  isTheraEligible,
  isTheraPatientCode,
  parseTheraDate,
  THERA_EXCLUSIONS,
  THERA_INCLUSIONS,
  THERA_VAGINAL_ITEMS,
  THERA_VISIT_ORDER,
  theraDateToISO,
  theraVisitWindow,
  validateTheraVisit
} from './thera';

import type { TheraStoredVisit } from './thera';

const eligible = {
  age: 18,
  eva_dryness: 5,
  eva_dyspareunia: 0,
  informed_consent: 'si',
  patient_code: 'TH-01-01',
  site_hospital: 'Hospital',
  visit_date: '2024-01-31',
  ...Object.fromEntries(THERA_INCLUSIONS.map((key) => [key, 'si'])),
  ...Object.fromEntries(THERA_EXCLUSIONS.map((key) => [key, 'no'])),
  ...Object.fromEntries(THERA_VAGINAL_ITEMS.map((key) => [key, 3]))
};
const baseline: TheraStoredVisit = { data: eligible, id: 'baseline', visit: 'V0' };
const first: TheraStoredVisit = {
  data: { baseline_date: '2024-01-31', patient_code: 'TH-01-01', site_hospital: 'Hospital', visit_date: '2024-02-29' },
  id: 'first',
  visit: 'V1'
};
const second: TheraStoredVisit = {
  data: { ...first.data, first_visit_date: '2024-02-29', visit_date: '2024-05-29' },
  id: 'second',
  visit: 'V2'
};
const third: TheraStoredVisit = {
  data: { ...second.data, visit_date: '2024-08-29' },
  id: 'third',
  visit: 'V3'
};
const fourth: TheraStoredVisit = {
  data: { ...second.data, visit_date: '2025-02-28' },
  id: 'fourth',
  visit: 'V4'
};
const timeline = [baseline, first, second, third, fourth];

describe('THERA protocol', () => {
  it('recognizes only declared instruments and assigned TH codes', () => {
    expect(getTheraVisit('THERA_SGM_2026_V4')).toBe('V4');
    expect(getTheraVisit('THERA_SGM_2026_END')).toBeUndefined();
    expect(getTheraVisit('ORION_PR_2026_SELECTION')).toBeUndefined();
    expect(isTheraPatientCode('TH-XX-01')).toBe(true);
    expect(isTheraPatientCode('OR-01-01')).toBe(false);
    expect(isTheraPatientCode('TH-01-01 ')).toBe(false);
  });
  it.each(['2024-02-30', '2023-02-29', '2024-13-01', '31-01-2024', '2024-01-31T12:00:00Z'])(
    'rejects invalid or noncanonical date %s',
    (value) => {
      expect(parseTheraDate(value)).toBeUndefined();
    }
  );
  it('accepts leap day and clamps calendar months without DST drift', () => {
    expect(parseTheraDate('2024-02-29')?.toISOString()).toBe('2024-02-29T12:00:00.000Z');
    expect(theraVisitWindow('V1', '2024-01-31')).toEqual({ max: '2024-03-07', min: '2024-02-22' });
    expect(theraVisitWindow('V1', '2023-01-31')).toEqual({ max: '2023-03-07', min: '2023-02-21' });
    expect(theraVisitWindow('V4', '2024-02-29')).toEqual({ max: '2025-04-14', min: '2025-01-14' });
  });
  it.each([
    ['29/02/2024', '2024-02-29'],
    ['31/01/2024', '2024-01-31'],
    ['2024-02-29', '2024-02-29'],
    [new Date('2024-02-29T12:00:00Z'), '2024-02-29']
  ])('normalizes calendar input without changing historical storage: %s', (input, expected) => {
    expect(theraDateToISO(input)).toBe(expected);
    expect(formatTheraDate(input)).toBe(expected === '2024-01-31' ? '31/01/2024' : '29/02/2024');
  });
  it.each(['31/02/2024', '29/02/2023', '1/2/2024', '02/13/2024', '', new Date(Number.NaN)])(
    'rejects invalid date presentation %s',
    (input) => {
      expect(theraDateToISO(input)).toBeUndefined();
      expect(formatTheraDate(input)).toBeUndefined();
    }
  );
  it('enforces exact age, inclusion and symptom thresholds', () => {
    expect(isTheraEligible(eligible)).toBe(true);
    expect(isTheraEligible({ ...eligible, age: 17 })).toBe(false);
    expect(isTheraEligible({ ...eligible, eva_dryness: 4 })).toBe(false);
    expect(isTheraEligible({ ...eligible, eva_dryness: 4, eva_dyspareunia: 5 })).toBe(true);
    expect(isTheraEligible({ ...eligible, eva_dryness: 4, vhi_elasticity: 2 })).toBe(true);
    for (const key of THERA_INCLUSIONS) expect(isTheraEligible({ ...eligible, [key]: 'no' })).toBe(false);
    for (const key of THERA_EXCLUSIONS) expect(isTheraEligible({ ...eligible, [key]: 'si' })).toBe(false);
    expect(isTheraEligible({ ...eligible, informed_consent: 'no' })).toBe(false);
  });
  it('requires an eligible saved baseline and actual V1 as anchor', () => {
    const data = { ...first.data, first_visit_date: '2024-02-29', visit_date: '2024-05-29' };
    expect(validateTheraVisit('V2', data, [baseline, first])).toBeUndefined();
    expect(validateTheraVisit('V2', data, [baseline])).toContain('V1');
    expect(validateTheraVisit('V2', data, [first])).toContain('basal apta');
    expect(validateTheraVisit('V2', { ...data, first_visit_date: '2024-02-28' }, [baseline, first])).toContain(
      'V1 guardada'
    );
    expect(validateTheraVisit('V2', { ...data, baseline_date: '2024-01-30' }, [baseline, first])).toContain('basal');
    expect(validateTheraVisit('V2', { ...data, site_hospital: 'Other' }, [baseline, first])).toContain('hospital');
  });
  it('rejects visits outside either inclusive boundary and allows editing the same record', () => {
    for (const date of ['2024-02-22', '2024-03-07']) {
      expect(validateTheraVisit('V1', { ...first.data, visit_date: date }, [baseline])).toBeUndefined();
    }
    for (const date of ['2024-02-21', '2024-03-08']) {
      expect(validateTheraVisit('V1', { ...first.data, visit_date: date }, [baseline])).toContain('entre');
    }
    expect(validateTheraVisit('V1', first.data, [baseline, first])).toContain('Ya existe');
    expect(validateTheraVisit('V1', first.data, [baseline, first], first.id)).toBeUndefined();
  });
  it('does not cross patient identities and blocks new visits after the fourth visit', () => {
    expect(validateTheraVisit('V1', { ...first.data, patient_code: 'TH-01-02' }, [baseline])).toContain('basal apta');
    expect(validateTheraVisit('V1', first.data, [baseline, fourth])).toContain('completado');
    expect(validateTheraVisit('V4', fourth.data, timeline, fourth.id)).toBeUndefined();
    expect(validateTheraVisit('V1', first.data, timeline, first.id)).toBeUndefined();
  });
  it('requires all preceding visits, not just the baseline and first visit, before the fourth', () => {
    const data = { ...first.data, first_visit_date: '2024-02-29', visit_date: '2025-02-28' };
    expect(validateTheraVisit('V4', data, [baseline, first])).toContain('V2');
    expect(validateTheraVisit('V4', data, [baseline, first, second])).toContain('V3');
    expect(validateTheraVisit('V4', data, [baseline, first, second, third])).toBeUndefined();
    expect(validateTheraVisit('V4', data, [baseline])).toContain('V1');
    expect(validateTheraVisit('V4', data, [first])).toContain('basal apta');
  });

  it('unlocks only the next unfinished visit for each patient, including after the first visit', () => {
    for (let saved = 0; saved <= timeline.length; saved++) {
      for (const [index, visit] of THERA_VISIT_ORDER.entries()) {
        expect(canStartTheraVisit(visit, timeline.slice(0, saved), 'TH-01-01')).toBe(visit === 'V0' || index === saved);
      }
    }
  });

  it('rejects every missing predecessor even if later records have already been saved', () => {
    for (let index = 1; index < timeline.length; index++) {
      const current = timeline[index]!;
      const previous = timeline.slice(0, index);
      expect(validateTheraVisit(current.visit, current.data, previous)).toBeUndefined();
      for (const missing of previous) {
        const remaining = previous.filter((record) => record.id !== missing.id);
        expect(validateTheraVisit(current.visit, current.data, remaining)).toBeDefined();
        expect(canStartTheraVisit(current.visit, remaining, 'TH-01-01')).toBe(false);
      }
    }
  });

  it('never uses another patient’s previous visits to unlock a follow-up', () => {
    const anotherPatient = timeline.map((record) => ({
      ...record,
      id: `other-${record.id}`,
      data: { ...record.data, patient_code: 'TH-01-02' }
    }));
    expect(canStartTheraVisit('V3', [baseline, first, ...anotherPatient], 'TH-01-01')).toBe(false);
    expect(canStartTheraVisit('V1', [{ ...baseline, data: { ...eligible, exclusion_1: 'si' } }], 'TH-01-01')).toBe(
      false
    );
  });
});
