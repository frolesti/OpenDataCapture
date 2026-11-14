import type { Group } from '@opendatacapture/schemas/group';
import { beforeEach, describe, expect, it } from 'vitest';

import { useAppStore } from '../../index';

const group: Group = {
  accessibleInstrumentIds: ['THERA_V0'],
  createdAt: new Date('2024-01-01'),
  hospitals: ['Alta Medical Services'],
  id: 'study-group',
  name: 'THERA-SGM-2026',
  settings: { defaultIdentificationMethod: 'CUSTOM_ID' },
  subjectIds: ['patient-id'],
  type: 'RESEARCH',
  updatedAt: new Date('2024-01-01'),
  userIds: ['investigator-id']
};
const profile = {
  basePermissionLevel: 'STANDARD' as const,
  firstName: 'Test',
  groups: [group],
  id: 'investigator-id',
  lastName: 'Investigator',
  professionalTitle: null,
  studyHospitals: [],
  studyNumbers: [],
  username: 'test'
};
const token = (groups: object[]) =>
  `header.${Buffer.from(
    JSON.stringify({
      ...profile,
      groups,
      permissions: [{ action: 'read', subject: 'InstrumentRecord' }],
      sub: profile.id
    })
  ).toString('base64url')}.signature`;

beforeEach(() => {
  useAppStore.setState({ accessToken: null, currentGroup: null, currentUser: null });
});

describe('compact-token profile hydration', () => {
  it.each([[{ id: group.id }], [group]])(
    'hydrates full groups from the authorized profile, not JWT datasets',
    (claims) => {
      useAppStore.getState().login(token([claims]));
      expect(useAppStore.getState().currentGroup).toBeNull();
      expect(useAppStore.getState().currentUser?.groups).toEqual([]);
      expect(useAppStore.getState().currentUser?.ability.can('read', 'InstrumentRecord')).toBe(true);
      useAppStore.getState().syncCurrentUserFromProfile(profile);
      expect(useAppStore.getState().currentGroup?.accessibleInstrumentIds).toEqual(['THERA_V0']);
      expect(useAppStore.getState().currentUser?.groups).toEqual([group]);
    }
  );
});
