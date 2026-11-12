import { describe, expect, it } from 'vitest';

import {
  getTheraVisit,
  isTheraEligible,
  isTheraPatientCode,
  parseTheraDate,
  THERA_EXCLUSIONS,
  THERA_INCLUSIONS,
  THERA_VAGINAL_ITEMS,
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

describe('THERA protocol', () => {
  it('recognizes only declared instruments and assigned TH codes', () => {
    expect(getTheraVisit('THERA_SGM_2026_V4')).toBe('V4');
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
  it('does not cross patient identities and blocks visits after end of study', () => {
    expect(validateTheraVisit('V1', { ...first.data, patient_code: 'TH-01-02' }, [baseline])).toContain('basal apta');
    const end: TheraStoredVisit = { data: { ...first.data, completed_study: 'no' }, id: 'end', visit: 'END' };
    expect(validateTheraVisit('V1', first.data, [baseline, end])).toContain('fin de estudio');
  });
  it('requires V4 for completed study but allows early termination', () => {
    const data = { ...first.data, completed_study: 'si', visit_date: '2024-04-01' };
    expect(validateTheraVisit('END', data, [baseline, first])).toContain('V4');
    expect(validateTheraVisit('END', { ...data, completed_study: 'no' }, [baseline, first])).toBeUndefined();
    expect(
      validateTheraVisit('END', { ...data, completed_study: 'no', visit_date: '2024-02-01' }, [baseline, first])
    ).toContain('preceder');
  });
});
