import { describe, expect, it } from 'vitest';

import {
  canStartTheraVisit,
  canOpenTheraVisit,
  theraVisitDateError,
  theraVisitDateWarning,
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
  validateTheraVisit,
  usesFlexibleTheraVisits
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
  describe('independent visits from edition 10', () => {
    it('does not apply the new rules to historical instruments or other studies', () => {
      expect(usesFlexibleTheraVisits({ name: 'THERA_SGM_2026_V1', edition: 9 })).toBe(false);
      expect(usesFlexibleTheraVisits({ name: 'THERA_SGM_2026_V1', edition: 10 })).toBe(true);
      expect(usesFlexibleTheraVisits({ name: 'ORION_PR_2026_FOLLOWUP', edition: 20 })).toBe(false);
    });

    it.each(THERA_VISIT_ORDER)('accepts %s without any other saved visits, including future dates', (visit) => {
      const data = { patient_code: 'manual / patient', site_hospital: 'Hospital', visit_date: '2099-01-01' };
      expect(canStartTheraVisit(visit, [], data.patient_code, true)).toBe(true);
      expect(validateTheraVisit(visit, data, [], undefined, false, true)).toBeUndefined();
      expect(theraVisitDateError(visit, data, true)).toBeUndefined();
    });

    it('keeps duplicates, valid dates, stored references and known chronological order enforced', () => {
      const data = { ...second.data, site_hospital: 'Another group hospital', visit_date: '2099-01-01' };
      expect(validateTheraVisit('V2', data, [baseline, first], undefined, false, true)).toBeUndefined();
      expect(validateTheraVisit('V2', data, [baseline, first, second], undefined, false, true)).toContain('Ya existe');
      expect(validateTheraVisit('V2', data, [baseline, first, second], second.id, false, true)).toBeUndefined();
      expect(validateTheraVisit('V2', { ...data, visit_date: '2099-02-30' }, [], undefined, false, true)).toBeDefined();
      expect(
        validateTheraVisit('V2', { ...data, baseline_date: '2024-01-30' }, [baseline], undefined, false, true)
      ).toContain('referencia');
      expect(
        validateTheraVisit('V2', { ...data, patient_code: 'someone else' }, [baseline, first], undefined, false, true)
      ).toContain('referencia');
      expect(
        validateTheraVisit('V2', { ...data, visit_date: '2024-01-01' }, [baseline, first], undefined, false, true)
      ).toContain('cronológico');
      expect(
        validateTheraVisit('V0', { ...eligible, visit_date: '2024-06-01' }, [second], undefined, false, true)
      ).toContain('cronológico');
    });

    it('permits filling a missing earlier visit after V4 and never invents an advisory window', () => {
      expect(validateTheraVisit('V1', first.data, [baseline, fourth], undefined, false, true)).toBeUndefined();
      expect(theraVisitDateWarning('V2', {})).toContain('no consta');
      expect(theraVisitDateWarning('V1', { baseline_date: '2024-01-31', visit_date: '2099-01-01' })).toContain(
        '22/02/2024'
      );
      expect(theraVisitDateWarning('V1', { baseline_date: '2024-01-31', visit_date: '2099-01-01' })).toContain(
        'fuera de este periodo'
      );
      expect(theraVisitDateWarning('V0', {})).toBeUndefined();
    });
  });
  it('only exempts authorized test dates, preserving identity, prerequisites and chronology', () => {
    const future = '2099-01-01';
    const data = { ...first.data, visit_date: future, _thera_test_dates: true };
    expect(validateTheraVisit('V1', data, [baseline])).toContain('futura');
    expect(validateTheraVisit('V1', data, [baseline], undefined, true)).toBeUndefined();
    expect(validateTheraVisit('V1', { ...data, visit_date: '2024-01-01' }, [baseline], undefined, true)).toContain(
      'basal'
    );
    expect(validateTheraVisit('V2', data, [baseline], undefined, true)).toContain('V1');
    expect(validateTheraVisit('V1', { ...data, site_hospital: 'Other' }, [baseline], undefined, true)).toContain(
      'hospital'
    );
    expect(validateTheraVisit('V1', data, [baseline, first], undefined, true)).toContain('Ya existe');
    expect(theraVisitDateError('V1', data)).toBeUndefined();
    expect(theraVisitDateError('V1', { ...data, visit_date: '31/02/2099' })).toContain('válida');
    expect(
      validateTheraVisit(
        'V3',
        { ...third.data, _thera_test_dates: true },
        [baseline, first, { ...second, data: { ...second.data, visit_date: future } }],
        undefined,
        true
      )
    ).toContain('precedente');
  });
  it('recognizes only declared instruments and accepts nonempty free-text patient codes', () => {
    expect(getTheraVisit('THERA_SGM_2026_V4')).toBe('V4');
    expect(getTheraVisit('THERA_SGM_2026_END')).toBeUndefined();
    expect(getTheraVisit('ORION_PR_2026_SELECTION')).toBeUndefined();
    expect(isTheraPatientCode('TH-XX-01')).toBe(true);
    for (const code of ['OR-01-01', 'centre/patient 7', '123', 'a', 'TH-01-01 ']) {
      expect(isTheraPatientCode(code)).toBe(true);
    }
    for (const code of ['', '   ', undefined, 123, null]) expect(isTheraPatientCode(code)).toBe(false);
  });
  it('preserves free-text identities through follow-up and duplicate validation', () => {
    const patient_code = 'centre/patient 7';
    const saved = { ...baseline, data: { ...baseline.data, patient_code } };
    const data = { ...first.data, patient_code };
    expect(validateTheraVisit('V0', saved.data, [])).toBeUndefined();
    expect(validateTheraVisit('V0', saved.data, [saved])).toContain('Ya existe');
    expect(canStartTheraVisit('V1', [saved], patient_code)).toBe(true);
    expect(validateTheraVisit('V1', data, [saved])).toBeUndefined();
    expect(validateTheraVisit('V1', { ...data, patient_code: 'other' }, [saved])).toContain('basal apta');
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

  it.each([
    ['2024-02-21', false],
    ['2024-02-22', true],
    ['2024-03-07', true],
    ['2024-03-08', false]
  ] as const)('opens V1 only inside the inclusive real-time window on %s', (today, expected) => {
    expect(canOpenTheraVisit('V1', [baseline], 'TH-01-01', today)).toBe(expected);
    expect(canOpenTheraVisit('V1', [baseline, first], 'TH-01-01', today)).toBe(false);
  });

  it('combines all date constraints into one message without changing the saved visit', () => {
    const error = theraVisitDateError('V1', { visit_date: '2024-01-01', baseline_date: '2024-01-31' });
    expect(error).toContain('22/02/2024');
    expect(error).toContain('no puede preceder');
    expect(baseline.data.visit_date).toBe('2024-01-31');
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
