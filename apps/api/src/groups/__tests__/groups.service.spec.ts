import type { Model } from '@douglasneuroinformatics/libnest';
import { getModelToken } from '@douglasneuroinformatics/libnest';
import { MockFactory } from '@douglasneuroinformatics/libnest/testing';
import type { MockedInstance } from '@douglasneuroinformatics/libnest/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { InstrumentsService } from '../../instruments/instruments.service';
import { HospitalsService } from '../../hospitals/hospitals.service';
import { GroupsService } from '../groups.service';
import { AdministratorStudyAccessService } from '../administrator-study-access.service';

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
        MockFactory.createForService(AdministratorStudyAccessService),
        MockFactory.createForService(InstrumentsService)
      ]
    }).compile();
    groupModel = moduleRef.get(getModelToken('Group'));
    groupsService = moduleRef.get(GroupsService);
    instrumentsService = moduleRef.get(InstrumentsService);
    instrumentsService.find.mockResolvedValue([]);
    hospitalsService = moduleRef.get(HospitalsService);
    userModel = moduleRef.get(getModelToken('User'));
    userModel.findMany.mockResolvedValue([]);
    hospitalsService.resolveNames.mockResolvedValue([]);
    groupModel.create.mockResolvedValue({ hospitals: [], hospitalIds: [] });
    moduleRef
      .get<MockedInstance<AdministratorStudyAccessService>>(AdministratorStudyAccessService)
      .createGroup.mockImplementation((data) => groupModel.create({ data }));
  });

  describe('create', () => {
    it('should call the group model', async () => {
      await groupsService.create({ name: 'Test Group', type: 'CLINICAL', hospitals: [] });
      expect(groupModel.create.mock.lastCall?.[0]).toMatchObject({ data: { name: 'Test Group' } });
    });

    it('creates only the selected instruments through the atomic administrator assignment workflow', async () => {
      instrumentsService.find.mockResolvedValueOnce([{ id: 'baseline' }, { id: 'followup' }]);
      userModel.findMany.mockResolvedValueOnce([{ id: 'admin-one' }, { id: 'admin-two' }]);
      await groupsService.create({
        accessibleInstrumentIds: ['baseline', 'baseline'],
        hospitals: ['Hospital Clínic'],
        name: 'THERA',
        studyCode: 'TH',
        type: 'CLINICAL'
      });
      expect(hospitalsService.resolveNames).toHaveBeenCalledWith(['Alta Medical Services', 'Hospital Clínic']);
      expect(groupModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accessibleInstruments: { connect: [{ id: 'baseline' }] },
          studyCode: 'TH'
        })
      });
    });

    it('adds Alta Medical Services even if no hospital is provided', async () => {
      await groupsService.create({ name: 'Study', type: 'CLINICAL', hospitals: [] });
      expect(hospitalsService.resolveNames).toHaveBeenCalledWith(['Alta Medical Services']);
    });

    it('preserves the legacy all-instruments default when no selection is provided', async () => {
      instrumentsService.find.mockResolvedValueOnce([{ id: 'baseline' }, { id: 'followup' }]);
      await groupsService.create({ name: 'Study', type: 'CLINICAL', hospitals: [] });
      expect(groupModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accessibleInstruments: { connect: [{ id: 'baseline' }, { id: 'followup' }] }
        })
      });
    });

    it('preserves an explicit empty instrument selection', async () => {
      instrumentsService.find.mockResolvedValueOnce([{ id: 'baseline' }]);
      await groupsService.create({ accessibleInstrumentIds: [], name: 'Study', type: 'CLINICAL', hospitals: [] });
      expect(groupModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ accessibleInstruments: { connect: [] } })
      });
    });

    it('rejects unknown instruments before creating the group or changing hospitals', async () => {
      await expect(
        groupsService.create({
          accessibleInstrumentIds: ['missing'],
          hospitals: [],
          name: 'Study',
          type: 'CLINICAL'
        })
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(groupModel.create).not.toHaveBeenCalled();
      expect(hospitalsService.resolveNames).not.toHaveBeenCalled();
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
