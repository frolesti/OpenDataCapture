import { describe, expect, it } from 'vitest';

import { $CreateGroupData } from './group';

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

  it('keeps an omitted selection distinct from an explicitly empty selection', () => {
    const legacy = { name: 'Study', type: 'CLINICAL' };
    expect($CreateGroupData.parse(legacy).accessibleInstrumentIds).toBeUndefined();
    expect($CreateGroupData.parse({ ...legacy, accessibleInstrumentIds: [] }).accessibleInstrumentIds).toEqual([]);
  });

  it('rejects unknown study codes', () => {
    expect($CreateGroupData.safeParse({ name: 'Study', type: 'CLINICAL', studyCode: 'INVALID' }).success).toBe(false);
  });
});
