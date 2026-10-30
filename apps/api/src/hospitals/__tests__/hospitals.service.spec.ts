import { getModelToken, PRISMA_CLIENT_TOKEN } from '@douglasneuroinformatics/libnest';
import type { Model } from '@douglasneuroinformatics/libnest';
import { MockFactory, type MockedInstance } from '@douglasneuroinformatics/libnest/testing';
import { Test } from '@nestjs/testing';
import { normalizeHospitalKey } from '@opendatacapture/schemas/group';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HospitalsService } from '../hospitals.service';

describe('canonical hospital catalogue', () => {
  let service: HospitalsService;
  let model: MockedInstance<Model<'Hospital'>>;
  const transaction = vi.fn();
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        HospitalsService,
        MockFactory.createForModelToken(getModelToken('Hospital')),
        { provide: PRISMA_CLIENT_TOKEN, useValue: { $transaction: transaction } }
      ]
    }).compile();
    service = moduleRef.get(HospitalsService);
    model = moduleRef.get(getModelToken('Hospital'));
  });

  it.each(['CS Aravaca', 'C.S. Aravaca', 'C. S. ARAVACA'])('normalizes %s to the same lookup key', (name) => {
    expect(normalizeHospitalKey(name)).toBe('cs aravaca');
  });

  it('unifies aliases by catalogue ID without creating duplicate centres', async () => {
    model.findMany.mockResolvedValue([{ id: 'aravaca', name: 'CS Aravaca (Madrid)', isInternal: false }]);
    expect(await service.resolveNames(['CS Aravaca', 'C.S. Aravaca'])).toEqual([
      { id: 'aravaca', name: 'CS Aravaca (Madrid)', isInternal: false }
    ]);
    expect(model.create).not.toHaveBeenCalled();
  });

  it('rejects ambiguous names instead of assigning the wrong centre', async () => {
    model.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    await expect(service.resolveNames(['CS Santa Marta'])).rejects.toThrow('ambigu');
    expect(model.create).not.toHaveBeenCalled();
  });

  it('rejects missing catalogue IDs', async () => {
    model.findMany.mockResolvedValue([{ id: 'existing' }]);
    await expect(service.findByIds(['existing', 'missing'])).rejects.toThrow('no existeixen');
  });

  it('renames a shared centre atomically while preserving its ID and both study assignments', async () => {
    const old = { id: 'aravaca', name: 'CS Aravaca', key: 'cs aravaca', aliasKeys: ['cs aravaca'], isInternal: false };
    model.findUniqueOrThrow.mockResolvedValue(old);
    model.findMany.mockResolvedValue([]);
    model.update.mockResolvedValue({ ...old, name: 'CS Aravaca (Madrid)' });
    const groupUpdate = vi.fn();
    const pendingUpdate = vi.fn();
    transaction.mockImplementation(async (operation) =>
      operation({
        hospital: model,
        group: {
          findMany: async () => [
            { id: 'omega', hospitalIds: ['aravaca', 'other'], hospitals: ['CS Aravaca', 'Centre B'] },
            { id: 'orion', hospitalIds: ['aravaca'], hospitals: ['CS Aravaca'] }
          ],
          update: groupUpdate
        },
        pendingInvestigator: { updateMany: pendingUpdate }
      })
    );
    expect(await service.rename('aravaca', 'CS Aravaca (Madrid)')).toEqual({
      id: 'aravaca',
      name: 'CS Aravaca (Madrid)',
      isInternal: false
    });
    expect(groupUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: 'omega' },
      data: { hospitals: { set: ['CS Aravaca (Madrid)', 'Centre B'] } }
    });
    expect(groupUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: 'orion' },
      data: { hospitals: { set: ['CS Aravaca (Madrid)'] } }
    });
    expect(pendingUpdate).toHaveBeenCalledWith({
      where: { hospital: 'CS Aravaca' },
      data: { hospital: 'CS Aravaca (Madrid)' }
    });
    expect(model.update).toHaveBeenCalledWith({
      where: { id: 'aravaca' },
      data: {
        name: 'CS Aravaca (Madrid)',
        key: 'cs aravaca madrid',
        aliasKeys: { set: ['cs aravaca', 'cs aravaca madrid'] }
      }
    });
  });
});
