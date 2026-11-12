import { describe, expect, it } from 'vitest';

import { $CreateGroupData, $UpdateGroupData, inferGroupStudyCode } from './group';

describe('group creation schema', () => {
  it('preserves selected instruments and the study code', () => {
    expect(
      $CreateGroupData.parse({
        accessibleInstrumentIds: ['baseline'],
        name: 'THERA',
        studyCode: 'TH',
        type: 'CLINICAL'
      })
    ).toEqual({
      accessibleInstrumentIds: ['baseline'],
      hospitals: [],
      name: 'THERA',
      studyCode: 'TH',
      type: 'CLINICAL'
    });
  });

  describe('group study configuration', () => {
    const instruments = [
      { id: 'thera-v0', internal: { name: 'THERA_SGM_2026_V0' } },
      { id: 'orion', internal: { name: 'ORION_PR_2026_SELECTION' } }
    ];

    it('retains the study code when updating a group and permits clearing it', () => {
      expect($UpdateGroupData.parse({ studyCode: 'TH' })).toEqual({ studyCode: 'TH' });
      expect($UpdateGroupData.parse({ studyCode: null })).toEqual({ studyCode: null });
      expect($UpdateGroupData.safeParse({ studyCode: 'OTHER' }).success).toBe(false);
    });

    it.each(['THERA', 'THERA-SGM-2026', 'thera_sgm_2026'])('recognizes the exact protocol group %s', (name) => {
      expect(inferGroupStudyCode({ name, accessibleInstrumentIds: ['thera-v0', 'orion'] }, instruments)).toBe('TH');
    });

    it('recognizes ORION using its canonical instrument, not its display title', () => {
      expect(inferGroupStudyCode({ name: 'ORION-PR-2026', accessibleInstrumentIds: ['orion'] }, instruments)).toBe(
        'OR'
      );
    });

    it.each(['General', 'Not THERA', 'OMEGA', 'THERA-OTHER'])('does not guess the study for %s', (name) => {
      expect(
        inferGroupStudyCode({ name, accessibleInstrumentIds: ['thera-v0', 'orion'] }, instruments)
      ).toBeUndefined();
    });

    it('requires an assigned canonical instrument even if the group name matches', () => {
      expect(inferGroupStudyCode({ name: 'THERA', accessibleInstrumentIds: ['orion'] }, instruments)).toBeUndefined();
      expect(inferGroupStudyCode({ name: 'THERA', accessibleInstrumentIds: [] }, instruments)).toBeUndefined();
    });
  });

  it('keeps an omitted selection distinct from an explicitly empty selection', () => {
    const legacy = { name: 'Study', type: 'CLINICAL' };
    expect($CreateGroupData.parse(legacy).accessibleInstrumentIds).toBeUndefined();
    expect($CreateGroupData.parse({ ...legacy, accessibleInstrumentIds: [] }).accessibleInstrumentIds).toEqual([]);
  });

  it('rejects unknown study codes', () => {
    expect($CreateGroupData.safeParse({ name: 'Study', type: 'CLINICAL', studyCode: 'INVALID' }).success).toBe(false);
  });
});
