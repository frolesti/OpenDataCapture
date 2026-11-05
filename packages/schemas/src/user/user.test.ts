import { describe, expect, it } from 'vitest';

import {
  $CreatePendingInvestigatorData,
  $CreateUserData,
  $UpdatePendingInvestigatorData,
  $UpdateUserData
} from './user.js';

describe('account identifier normalization', () => {
  const identity = {
    email: ' investigator@example.test \n',
    firstName: ' Maria Jesús ',
    lastName: ' Fernández Silva '
  };
  const normalizedIdentity = {
    email: 'investigator@example.test',
    firstName: 'Maria Jesús',
    lastName: 'Fernández Silva'
  };

  it('trims account identity fields on creation without changing passwords or internal spaces', () => {
    const data = $CreateUserData.parse({
      ...identity,
      basePermissionLevel: 'STANDARD',
      groupIds: ['study'],
      password: ' password with spaces ',
      username: ' mfernandez \n'
    });
    expect(data).toMatchObject({
      ...normalizedIdentity,
      password: ' password with spaces ',
      username: 'mfernandez'
    });
  });

  it('normalizes partial account updates and preserves optional empty email values', () => {
    expect($UpdateUserData.parse({ ...identity, username: ' mfernandez ' })).toEqual({
      ...normalizedIdentity,
      username: 'mfernandez'
    });
    expect($UpdateUserData.parse({ email: null })).toEqual({ email: null });
    expect($UpdateUserData.parse({})).toEqual({});
  });

  it('normalizes pending investigator creation and updates', () => {
    expect(
      $CreatePendingInvestigatorData.parse({
        ...identity,
        basePermissionLevel: 'STANDARD',
        groupIds: ['study'],
        hospital: 'Centre',
        signed: true
      })
    ).toMatchObject(normalizedIdentity);
    expect($UpdatePendingInvestigatorData.parse(identity)).toEqual(normalizedIdentity);
  });

  it('rejects whitespace-only usernames and names instead of storing empty identifiers', () => {
    for (const field of ['username', 'firstName', 'lastName']) {
      expect($UpdateUserData.safeParse({ [field]: ' \t ' }).success).toBe(false);
    }
    expect($UpdateUserData.safeParse({ email: ' ' }).success).toBe(false);
  });
});
