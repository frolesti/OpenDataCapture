import { describe, expect, it } from 'vitest';

import { $LoginCredentials } from './auth';

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
