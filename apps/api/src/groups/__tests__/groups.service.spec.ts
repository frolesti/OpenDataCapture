import type { Model } from '@douglasneuroinformatics/libnest';
import { getModelToken } from '@douglasneuroinformatics/libnest';
import { MockFactory } from '@douglasneuroinformatics/libnest/testing';
import type { MockedInstance } from '@douglasneuroinformatics/libnest/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { InstrumentsService } from '../../instruments/instruments.service';
import { HospitalsService } from '../../hospitals/hospitals.service';
import { GroupsService } from '../groups.service';

describe('GroupsService', () => {
  let groupsService: GroupsService;
  let groupModel: MockedInstance<Model<'Group'>>;
  let instrumentsService: MockedInstance<InstrumentsService>;
  let hospitalsService: MockedInstance<HospitalsService>;
  let userModel: MockedInstance<Model<'User'>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        GroupsService,
        MockFactory.createForModelToken(getModelToken('Group')),
        MockFactory.createForModelToken(getModelToken('User')),
        MockFactory.createForModelToken(getModelToken('PendingInvestigator')),
        MockFactory.createForService(HospitalsService),
        MockFactory.createForService(InstrumentsService)
      ]
    }).compile();
    groupModel = moduleRef.get(getModelToken('Group'));
    groupsService = moduleRef.get(GroupsService);
    instrumentsService = moduleRef.get(InstrumentsService);
    instrumentsService.find.mockResolvedValue([]);
    hospitalsService = moduleRef.get(HospitalsService);
    userModel = moduleRef.get(getModelToken('User'));
    hospitalsService.resolveNames.mockResolvedValue([]);
    groupModel.create.mockResolvedValue({ hospitals: [], hospitalIds: [] });
  });

  describe('create', () => {
    it('should call the group model', async () => {
      await groupsService.create({ name: 'Test Group', type: 'CLINICAL', hospitals: [] });
      expect(groupModel.create.mock.lastCall?.[0]).toMatchObject({ data: { name: 'Test Group' } });
    });

    it('should throw a ConflictException if a group with the same name already exists in the db', async () => {
      groupModel.exists.mockResolvedValueOnce(true);
      await expect(
        groupsService.create({ name: 'Test Group', type: 'CLINICAL', hospitals: [] })
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return the array returned by the group model', async () => {
      groupModel.findMany.mockResolvedValueOnce([{ name: 'Test Group' }]);
      await expect(groupsService.findAll()).resolves.toMatchObject([{ name: 'Test Group' }]);
    });
  });

  describe('findById', () => {
    it('should throw a `NotFoundException` if there is no group with the provided id', async () => {
      groupModel.findFirst.mockResolvedValueOnce(null);
      await expect(groupsService.findById('123')).rejects.toBeInstanceOf(NotFoundException);
    });
    it('should return the group with the provided id if it exists', async () => {
      groupModel.findFirst.mockResolvedValueOnce({ name: 'Test Group' });
      await expect(groupsService.findById('123')).resolves.toMatchObject({ name: 'Test Group' });
    });

    it('prevents retiring a study centre while an investigator is assigned there', async () => {
      groupModel.findFirst.mockResolvedValueOnce({ id: 'orion', name: 'ORION', hospitalIds: ['aravaca'] });
      userModel.count.mockResolvedValueOnce(1);
      await expect(groupsService.updateById('orion', { hospitals: [] })).rejects.toThrow('investigadors assignats');
      expect(groupModel.update).not.toHaveBeenCalled();
    });
  });
});
