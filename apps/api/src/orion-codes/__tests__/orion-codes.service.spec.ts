import { getModelToken, PRISMA_CLIENT_TOKEN } from '@douglasneuroinformatics/libnest';
import type { Model } from '@douglasneuroinformatics/libnest';
import { MockFactory, type MockedInstance } from '@douglasneuroinformatics/libnest/testing';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrionCodesService } from '../orion-codes.service';

describe('permanent ORION numbering', () => {
  let service: OrionCodesService;
  let investigators: MockedInstance<Model<'OrionInvestigator'>>;
  let patients: MockedInstance<Model<'OrionPatientCode'>>;
  const transaction = vi.fn();

  beforeEach(async () => {
    transaction.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrionCodesService,
        MockFactory.createForModelToken(getModelToken('OrionInvestigator')),
        MockFactory.createForModelToken(getModelToken('OrionPatientCode')),
        { provide: PRISMA_CLIENT_TOKEN, useValue: { $transaction: transaction } }
      ]
    }).compile();
    service = moduleRef.get(OrionCodesService);
    investigators = moduleRef.get(getModelToken('OrionInvestigator'));
    patients = moduleRef.get(getModelToken('OrionPatientCode'));
  });

  it('previews OR-01-01 without reserving or consuming a patient code', async () => {
    investigators.findFirst.mockResolvedValue({ number: 1, isTest: false });
    expect(await service.preview('orion', 'first', false)).toBe('OR-01-01');
    expect(await service.preview('orion', 'first', false)).toBe('OR-01-01');
    expect(patients.create).not.toHaveBeenCalled();
  });

  it('keeps the assigned investigator number when the hospital changes', async () => {
    investigators.findFirst.mockResolvedValue({ number: 2, isTest: false });
    patients.findFirst.mockResolvedValueOnce({ sequence: 0 }).mockResolvedValueOnce({ sequence: 1 });
    expect(await service.create('orion', 'second', false, 'Centre A')).toBe('OR-02-01');
    expect(await service.create('orion', 'second', false, 'Centre B')).toBe('OR-02-02');
    expect(patients.findFirst).toHaveBeenLastCalledWith({
      where: { groupId: 'orion', investigatorId: 'second' },
      orderBy: { sequence: 'desc' }
    });
    expect(investigators.create).not.toHaveBeenCalled();
  });

  it('uses a distinct TEST namespace without consuming real investigator numbers', async () => {
    investigators.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ number: 3 });
    investigators.create.mockResolvedValueOnce({ number: 4, isTest: true });
    expect(await service.preview('orion', 'tester', true)).toBe('OR-TEST-04-01');
    expect(investigators.findFirst).toHaveBeenNthCalledWith(2, {
      where: { groupId: 'orion', isTest: true },
      orderBy: { number: 'desc' }
    });
  });

  it('reuses the winner of a concurrent investigator assignment', async () => {
    investigators.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ groupId: 'orion', investigatorId: 'first', number: 1, isTest: false });
    investigators.create.mockRejectedValueOnce({ code: 'P2002' });
    expect((await service.assignInvestigator('orion', 'first', false)).number).toBe(1);
    expect(investigators.create).toHaveBeenCalledTimes(1);
  });

  it('allocates distinct consecutive patient codes for concurrent saves', async () => {
    investigators.findFirst.mockResolvedValue({ number: 1, isTest: false });
    const saved: { code: string; sequence: number }[] = [];
    patients.findFirst.mockImplementation(async () => saved.at(-1) ?? null);
    patients.create.mockImplementation(async ({ data }) => {
      if (saved.some((entry) => entry.code === data.code)) throw { code: 'P2002' };
      const row = { code: data.code, sequence: data.sequence };
      saved.push(row);
      return row;
    });
    const codes = await Promise.all([
      service.create('orion', 'first', false, 'Centre A'),
      service.create('orion', 'first', false, 'Centre A')
    ]);
    expect(codes.sort()).toEqual(['OR-01-01', 'OR-01-02']);
  });

  it('rejects reclassifying an investigator with an existing permanent number', async () => {
    investigators.findFirst.mockResolvedValue({ number: 1, isTest: true });
    await expect(service.assignInvestigator('orion', 'first', false)).rejects.toThrow('tipus de proves');
    expect(investigators.create).not.toHaveBeenCalled();
  });

  it('retries the entire transaction after a concurrent database conflict', async () => {
    transaction.mockRejectedValueOnce({ code: 'P2034' }).mockResolvedValueOnce('OR-01-01');
    await expect(service.transaction(async () => 'OR-01-01')).resolves.toBe('OR-01-01');
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it('propagates a failed record save rather than reporting a successful allocation', async () => {
    const error = new Error('record insert failed');
    transaction.mockRejectedValueOnce(error);
    await expect(service.transaction(async () => 'unexpected')).rejects.toBe(error);
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
