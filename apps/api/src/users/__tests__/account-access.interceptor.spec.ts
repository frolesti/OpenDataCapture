import { getModelToken } from '@douglasneuroinformatics/libnest';
import type { Model } from '@douglasneuroinformatics/libnest';
import { MockFactory } from '@douglasneuroinformatics/libnest/testing';
import type { MockedInstance } from '@douglasneuroinformatics/libnest/testing';
import type { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountAccessInterceptor } from '../account-access.interceptor';

describe('current account access after study and role changes', () => {
  let interceptor: AccountAccessInterceptor;
  let users: MockedInstance<Model<'User'>>;
  const next = { handle: vi.fn(() => of(true)) };

  beforeEach(async () => {
    next.handle.mockClear();
    const moduleRef = await Test.createTestingModule({
      providers: [AccountAccessInterceptor, MockFactory.createForModelToken(getModelToken('User'))]
    }).compile();
    interceptor = moduleRef.get(AccountAccessInterceptor);
    users = moduleRef.get(getModelToken('User'));
    users.findUnique.mockResolvedValue({
      basePermissionLevel: 'STANDARD',
      groupIds: ['orion'],
      professionalTitle: 'Dra'
    });
  });

  function context(user?: object) {
    return { switchToHttp: () => ({ getRequest: () => ({ user }) }) } as ExecutionContext;
  }

  it('allows an unchanged account without a special classification field', async () => {
    const user = { id: 'tester', basePermissionLevel: 'STANDARD', groups: [{ id: 'orion' }] };
    await interceptor.intercept(context(user), next);
    expect(user).not.toHaveProperty('userType');
    expect(next.handle).toHaveBeenCalledOnce();
  });

  it('rejects old administrator permissions immediately after demotion', async () => {
    await expect(
      interceptor.intercept(context({ id: 'tester', basePermissionLevel: 'ADMIN', groups: [{ id: 'orion' }] }), next)
    ).rejects.toThrow('permisos');
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('rejects stale memberships instead of retaining access to a removed study', async () => {
    await expect(
      interceptor.intercept(context({ id: 'tester', basePermissionLevel: 'STANDARD', groups: [{ id: 'omega' }] }), next)
    ).rejects.toThrow('permisos');
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('does not require authentication on public routes', async () => {
    await interceptor.intercept(context(), next);
    expect(users.findUnique).not.toHaveBeenCalled();
    expect(next.handle).toHaveBeenCalledOnce();
  });

  it('rejects a token belonging to a deleted account', async () => {
    users.findUnique.mockResolvedValueOnce(null);
    await expect(
      interceptor.intercept(
        context({ id: 'deleted', basePermissionLevel: 'STANDARD', groups: [{ id: 'orion' }] }),
        next
      )
    ).rejects.toThrow('permisos');
    expect(next.handle).not.toHaveBeenCalled();
  });
});
