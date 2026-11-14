import { createHmac } from 'node:crypto';
import { once } from 'node:events';
import { createServer, get } from 'node:http';

import { describe, expect, it } from 'vitest';

import { $LoginCredentials, createTokenPayload } from './auth';
import { getAccountPermissionLevel } from '../user/user';
import { $CreateAdminData } from '../setup/setup';

describe('sole administrator identity', () => {
  it.each(['amunyoz', 'ctorres', 'aramirez', 'Admin'])('keeps %s at researcher permission level', (username) => {
    expect(getAccountPermissionLevel(username)).toBe('STANDARD');
  });

  it('reserves administrator privileges and initial setup for the exact admin username', () => {
    expect(getAccountPermissionLevel('admin')).toBe('ADMIN');
    expect($CreateAdminData.shape.username.safeParse('admin').success).toBe(true);
    expect($CreateAdminData.shape.username.safeParse('amunyoz').success).toBe(false);
  });
});

describe('login credentials', () => {
  it('removes surrounding username whitespace without modifying the password', () => {
    expect($LoginCredentials.parse({ password: ' password ', username: ' mfernandez \n' })).toEqual({
      password: ' password ',
      username: 'mfernandez'
    });
  });

  it('rejects a username containing only whitespace', () => {
    expect($LoginCredentials.safeParse({ password: 'password', username: '  ' }).success).toBe(false);
  });
});

describe('compact authentication claims', () => {
  const group = {
    id: 'study-group',
    name: 'THERA-SGM-2026',
    subjectIds: Array.from({ length: 10000 }, (_, index) => `patient-${index}`),
    userIds: Array.from({ length: 1000 }, (_, index) => `investigator-${index}`),
    accessibleInstrumentIds: Array.from({ length: 1000 }, (_, index) => `instrument-${index}`)
  };
  const user = {
    basePermissionLevel: 'STANDARD' as const,
    firstName: 'Test',
    groups: [group],
    id: 'test-investigator',
    lastName: 'Investigator',
    username: 'test-investigator'
  };

  it('includes identity and group references, never group datasets or unrelated user fields', () => {
    expect(createTokenPayload({ ...user })).toEqual({
      accountPolicyVersion: 1,
      basePermissionLevel: 'STANDARD',
      firstName: 'Test',
      groups: [{ id: group.id }],
      id: user.id,
      lastName: 'Investigator',
      username: user.username
    });
  });

  it('keeps claims independent of the number of patients, instruments and investigators', () => {
    const smallUser = {
      ...user,
      groups: [{ ...group, subjectIds: [], userIds: [], accessibleInstrumentIds: [] }]
    };
    expect(createTokenPayload(user)).toEqual(createTokenPayload(smallUser));
  });

  it('reproduces HTTP 431 for the old token and accepts the compact token under an 8 KiB header limit', async () => {
    const permissions = [
      { action: 'read', subject: 'Group', conditions: { id: { in: [group.id] } } },
      {
        action: 'read',
        subject: 'InstrumentRecord',
        conditions: { groupId: { in: [group.id] }, session: { userId: user.id } }
      }
    ];
    const sign = (payload: object) => {
      const encoded = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
      return `${encoded}.${createHmac('sha256', 'test-only-secret').update(encoded).digest('base64url')}`;
    };
    const oldToken = sign({ ...user, permissions });
    const compactToken = sign({ ...createTokenPayload(user), permissions });
    expect(Buffer.byteLength(`Authorization: Bearer ${oldToken}`)).toBeGreaterThan(8192);
    expect(Buffer.byteLength(`Authorization: Bearer ${compactToken}`)).toBeLessThan(4096);

    const server = createServer({ maxHeaderSize: 8192 }, (_request, response) => response.end('OK'));
    server.listen(0, '127.0.0.1');
    try {
      await once(server, 'listening');
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Missing test server address');
      const requestStatus = (token: string) =>
        new Promise<number | undefined>((resolve, reject) => {
          const request = get(
            {
              hostname: '127.0.0.1',
              port: address.port,
              headers: { Authorization: `Bearer ${token}` }
            },
            (response) => {
              response.resume();
              response.on('end', () => resolve(response.statusCode));
            }
          );
          request.on('error', reject);
        });
      expect(await requestStatus(oldToken)).toBe(431);
      expect(await requestStatus(compactToken)).toBe(200);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });
});
