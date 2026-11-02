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
  let users: MockedInstance<Model<'User'>>;
  let hospitals: MockedInstance<Model<'Hospital'>>;
  const transaction = vi.fn();

  beforeEach(async () => {
    transaction.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrionCodesService,
        MockFactory.createForModelToken(getModelToken('OrionInvestigator')),
        MockFactory.createForModelToken(getModelToken('OrionPatientCode')),
        MockFactory.createForModelToken(getModelToken('User')),
        MockFactory.createForModelToken(getModelToken('Hospital')),
        { provide: PRISMA_CLIENT_TOKEN, useValue: { $transaction: transaction } }
      ]
    }).compile();
    service = moduleRef.get(OrionCodesService);
    investigators = moduleRef.get(getModelToken('OrionInvestigator'));
    patients = moduleRef.get(getModelToken('OrionPatientCode'));
    users = moduleRef.get(getModelToken('User'));
    hospitals = moduleRef.get(getModelToken('Hospital'));
    users.findUniqueOrThrow.mockResolvedValue({ studyHospitals: [{ groupId: 'orion', hospitalId: 'centre' }] });
    hospitals.findUniqueOrThrow.mockResolvedValue({ isInternal: false });
  });

  it('previews OR-01-01 without reserving or consuming a patient code', async () => {
    investigators.findFirst.mockResolvedValue({ number: 1 });
    expect(await service.preview('orion', 'first')).toBe('OR-01-01');
    expect(await service.preview('orion', 'first')).toBe('OR-01-01');
    expect(patients.create).not.toHaveBeenCalled();
  });

  it('keeps the assigned investigator number when the hospital changes', async () => {
    investigators.findFirst.mockResolvedValue({ number: 2 });
    patients.findFirst.mockResolvedValueOnce({ sequence: 0 }).mockResolvedValueOnce({ sequence: 1 });
    expect(await service.create('orion', 'second', 'Centre A')).toBe('OR-02-01');
    expect(await service.create('orion', 'second', 'Centre B')).toBe('OR-02-02');
    expect(patients.findFirst).toHaveBeenLastCalledWith({
      where: { groupId: 'orion', investigatorId: 'second' },
      orderBy: { sequence: 'desc' }
    });
    expect(investigators.create).not.toHaveBeenCalled();
  });

  it('uses the ordinary sequence without including internal allocations', async () => {
    investigators.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ number: 3 });
    investigators.create.mockResolvedValueOnce({ number: 4 });
    expect(await service.preview('orion', 'next')).toBe('OR-04-01');
    expect(investigators.findFirst).toHaveBeenNthCalledWith(2, {
      where: { groupId: 'orion', isInternal: false },
      orderBy: { number: 'desc' }
    });
  });

  it('starts the internal sequence at XX for a newly assigned Alta account', async () => {
    hospitals.findUniqueOrThrow.mockResolvedValue({ isInternal: true });
    investigators.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    investigators.create.mockImplementation(async ({ data }) => data);
    expect(await service.preview('orion', 'internal')).toBe('OR-XX-01');
    expect(investigators.findFirst).toHaveBeenNthCalledWith(2, {
      where: { groupId: 'orion', isInternal: true },
      orderBy: { number: 'desc' }
    });
    expect(investigators.create).toHaveBeenCalledWith({
      data: { groupId: 'orion', investigatorId: 'internal', isInternal: true, number: 1 }
    });
  });

  it('automatically assigns the fifth Alta account YB without advancing ordinary numbering', async () => {
    hospitals.findUniqueOrThrow.mockResolvedValue({ isInternal: true });
    investigators.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ number: 4, isInternal: true });
    investigators.create.mockImplementation(async ({ data }) => data);
    expect(await service.create('orion', 'fifth', 'Alta Medical Services')).toBe('OR-YB-01');
    expect(patients.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ code: 'OR-YB-01', investigatorNumber: 5, sequence: 1 })
    });
  });

  it('uses the hospital assigned to this study rather than another study', async () => {
    users.findUniqueOrThrow.mockResolvedValue({
      studyHospitals: [
        { groupId: 'other-study', hospitalId: 'alta' },
        { groupId: 'orion', hospitalId: 'external' }
      ]
    });
    investigators.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ number: 3 });
    investigators.create.mockImplementation(async ({ data }) => data);
    expect(await service.preview('orion', 'mixed')).toBe('OR-04-01');
    expect(hospitals.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'external' },
      select: { isInternal: true }
    });
  });

  it('reads new accounts inside the same transaction that created them', async () => {
    investigators.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    investigators.create.mockImplementation(async ({ data }) => data);
    const tx = {
      orionInvestigator: investigators,
      user: users,
      hospital: hospitals
    };
    hospitals.findUniqueOrThrow.mockResolvedValue({ isInternal: true });
    transaction.mockImplementation(async (operation) => operation(tx));
    const assigned = await service.transaction((client) => service.assignInvestigator('orion', 'new', client));
    expect(assigned).toEqual(expect.objectContaining({ number: 1, isInternal: true }));
  });

  it('keeps internal identifiers permanent after a later hospital change', async () => {
    investigators.findFirst.mockResolvedValue({ number: 4, isInternal: true });
    expect(await service.create('orion', 'internal', 'Other centre')).toBe('OR-YA-01');
    expect(users.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('reuses the winner of a concurrent investigator assignment', async () => {
    investigators.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ groupId: 'orion', investigatorId: 'first', number: 1 });
    investigators.create.mockRejectedValueOnce({ code: 'P2002' });
    expect((await service.assignInvestigator('orion', 'first')).number).toBe(1);
    expect(investigators.create).toHaveBeenCalledTimes(1);
  });

  it('allocates distinct consecutive patient codes for concurrent saves', async () => {
    investigators.findFirst.mockResolvedValue({ number: 1 });
    const saved: { code: string; sequence: number }[] = [];
    patients.findFirst.mockImplementation(async () => saved.at(-1) ?? null);
    patients.create.mockImplementation(async ({ data }) => {
      if (saved.some((entry) => entry.code === data.code)) throw { code: 'P2002' };
      const row = { code: data.code, sequence: data.sequence };
      saved.push(row);
      return row;
    });
    const codes = await Promise.all([
      service.create('orion', 'first', 'Centre A'),
      service.create('orion', 'first', 'Centre A')
    ]);
    expect(codes.sort()).toEqual(['OR-01-01', 'OR-01-02']);
  });

  it('keeps existing ordinary numbers permanent', async () => {
    investigators.findFirst.mockResolvedValue({ number: 1 });
    expect((await service.assignInvestigator('orion', 'first')).number).toBe(1);
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
