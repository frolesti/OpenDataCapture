import { CryptoService, getModelToken } from '@douglasneuroinformatics/libnest';
import type { Model } from '@douglasneuroinformatics/libnest';
import { MockFactory, type MockedInstance } from '@douglasneuroinformatics/libnest/testing';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { HospitalsService } from '../../hospitals/hospitals.service';
import { InstrumentsService } from '../../instruments/instruments.service';
import { OrionCodesService, type OrionTransactionClient } from '../../orion-codes/orion-codes.service';
import { OnboardingMailService } from '../../users/onboarding-mail.service';
import { UsersService } from '../../users/users.service';
import { AdministratorStudyAccessService } from '../administrator-study-access.service';
import { GroupsService } from '../groups.service';

const internalHospital = { id: 'alta', name: 'Alta Medical Services', isInternal: true };
const externalHospital = { id: 'clinic', name: 'Hospital Clínic', isInternal: false };
const study = {
  id: 'thera',
  name: 'THERA-SGM-2026',
  hospitals: ['Hospital Clínic'],
  hospitalIds: ['clinic'],
  accessibleInstrumentIds: ['thera-v0'],
  studyCode: null
};
const administrator = {
  id: 'admin',
  username: 'admin',
  additionalPermissions: [],
  basePermissionLevel: 'ADMIN' as const,
  groupIds: [] as string[],
  studyHospitals: [] as { groupId: string; hospitalId: string }[]
};

describe('administrator study access', () => {
  let access: AdministratorStudyAccessService;
  let users: UsersService;
  let groupModel: MockedInstance<Model<'Group'>>;
  let userModel: MockedInstance<Model<'User'>>;
  let pendingModel: MockedInstance<Model<'PendingInvestigator'>>;
  let hospitals: MockedInstance<HospitalsService>;
  let codes: MockedInstance<OrionCodesService>;
  let groups: MockedInstance<GroupsService>;
  let transaction: OrionTransactionClient;
  let instruments: MockedInstance<InstrumentsService>;
  let patientCodes: MockedInstance<Model<'OrionPatientCode'>>;
  let records: MockedInstance<Model<'InstrumentRecord'>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdministratorStudyAccessService,
        UsersService,
        MockFactory.createForModelToken(getModelToken('Group')),
        MockFactory.createForModelToken(getModelToken('User')),
        MockFactory.createForModelToken(getModelToken('PendingInvestigator')),
        MockFactory.createForModelToken(getModelToken('OrionPatientCode')),
        MockFactory.createForModelToken(getModelToken('InstrumentRecord')),
        MockFactory.createForService(CryptoService),
        MockFactory.createForService(GroupsService),
        MockFactory.createForService(HospitalsService),
        MockFactory.createForService(OnboardingMailService),
        MockFactory.createForService(OrionCodesService),
        MockFactory.createForService(InstrumentsService)
      ]
    }).compile();
    access = moduleRef.get(AdministratorStudyAccessService);
    users = moduleRef.get(UsersService);
    groupModel = moduleRef.get(getModelToken('Group'));
    userModel = moduleRef.get(getModelToken('User'));
    pendingModel = moduleRef.get(getModelToken('PendingInvestigator'));
    hospitals = moduleRef.get(HospitalsService);
    groups = moduleRef.get(GroupsService);
    codes = moduleRef.get(OrionCodesService);
    instruments = moduleRef.get(InstrumentsService);
    instruments.find.mockResolvedValue([]);
    patientCodes = moduleRef.get(getModelToken('OrionPatientCode'));
    records = moduleRef.get(getModelToken('InstrumentRecord'));
    patientCodes.findFirst.mockResolvedValue(null);
    records.findFirst.mockResolvedValue(null);
    transaction = {} as OrionTransactionClient;
    Object.assign(transaction, {
      group: groupModel,
      user: userModel,
      pendingInvestigator: pendingModel,
      orionPatientCode: patientCodes,
      instrumentRecord: records
    });
    codes.transaction.mockImplementation((operation) => operation(transaction));
    groupModel.findMany.mockResolvedValue([study]);
    userModel.findMany.mockResolvedValue([administrator]);
    userModel.findUnique.mockResolvedValue(administrator);
    userModel.create.mockResolvedValue({ id: 'created-admin' });
    userModel.update.mockResolvedValue(administrator);
    groups.findById.mockResolvedValue({ ...study, hospitalCatalog: [externalHospital, internalHospital] });
    hospitals.findByIds.mockResolvedValue([externalHospital]);
    hospitals.resolveNames.mockImplementation(async (names: string[]) =>
      names.map((name) => (name === internalHospital.name ? internalHospital : externalHospital))
    );
  });

  it('repairs existing administrators and legacy study catalogues on application startup', async () => {
    await access.onApplicationBootstrap();
    expect(groupModel.update).toHaveBeenCalledWith({
      where: { id: 'thera' },
      data: {
        hospitalIds: { set: ['clinic', 'alta'] },
        hospitals: { set: ['Hospital Clínic', 'Alta Medical Services'] }
      }
    });
    expect(userModel.findMany).toHaveBeenCalledWith();
    expect(userModel.update).toHaveBeenCalledWith({
      where: { id: 'admin' },
      data: {
        groups: { set: [{ id: 'thera' }] },
        studyHospitals: [{ groupId: 'thera', hospitalId: 'alta' }]
      }
    });
  });

  it('preserves a valid existing centre instead of moving an administrator to Alta', async () => {
    const previous = [{ groupId: 'thera', hospitalId: 'clinic' }];
    expect(await access.resolve(transaction, previous)).toEqual({ groupIds: ['thera'], studyHospitals: previous });
  });

  it('repairs a legacy THERA study code before assigning administrators, even when none exist', async () => {
    instruments.find.mockResolvedValue([{ id: 'thera-v0', internal: { name: 'THERA_SGM_2026_V0' } }]);
    userModel.findMany.mockResolvedValue([]);
    await access.onApplicationBootstrap();
    expect(groupModel.update).toHaveBeenCalledWith({
      where: { id: 'thera' },
      data: { studyCode: 'TH' }
    });
    expect(patientCodes.findFirst).toHaveBeenCalledWith({
      where: { groupId: 'thera', code: { not: { startsWith: 'TH-' } } },
      select: { id: true }
    });
  });

  it('never overwrites an explicitly configured study identity', async () => {
    instruments.find.mockResolvedValue([{ id: 'thera-v0', internal: { name: 'THERA_SGM_2026_V0' } }]);
    groupModel.findMany.mockResolvedValue([{ ...study, studyCode: 'OR' }]);
    userModel.findMany.mockResolvedValue([]);
    await access.onApplicationBootstrap();
    expect(groupModel.update).not.toHaveBeenCalled();
    expect(patientCodes.findFirst).not.toHaveBeenCalled();
  });

  it.each(['codes', 'records'])('does not infer a study identity over incompatible %s', async (kind) => {
    instruments.find.mockResolvedValue([{ id: 'thera-v0', internal: { name: 'THERA_SGM_2026_V0' } }]);
    userModel.findMany.mockResolvedValue([]);
    (kind === 'codes' ? patientCodes : records).findFirst.mockResolvedValue({ id: 'conflict' });
    await access.onApplicationBootstrap();
    expect(groupModel.update).not.toHaveBeenCalled();
  });

  it('only gives admin automatic study access and demotes other accounts without changing their centres', async () => {
    groupModel.findMany.mockResolvedValue([study, { ...study, id: 'orion', name: 'ORION' }]);
    userModel.findMany.mockResolvedValue([
      administrator,
      {
        ...administrator,
        id: 'second-admin',
        username: 'amunyoz',
        groupIds: ['orion'],
        studyHospitals: [{ groupId: 'orion', hospitalId: 'clinic' }]
      }
    ]);
    await access.onApplicationBootstrap();
    expect(userModel.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'second-admin' },
      data: { basePermissionLevel: 'STANDARD', additionalPermissions: [] }
    });
    expect(userModel.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'admin' },
      data: {
        groups: { set: [{ id: 'thera' }, { id: 'orion' }] },
        studyHospitals: [
          { groupId: 'thera', hospitalId: 'alta' },
          { groupId: 'orion', hospitalId: 'alta' }
        ]
      }
    });
  });

  it.each([[], ['Hospital Clínic']])('upgrades a legacy study with no catalogue IDs (%j)', async (...names) => {
    groupModel.findMany.mockResolvedValue([{ ...study, hospitalIds: [], hospitals: names }]);
    expect(await access.resolve(transaction)).toEqual({
      groupIds: ['thera'],
      studyHospitals: [{ groupId: 'thera', hospitalId: 'alta' }]
    });
    expect(groupModel.update).toHaveBeenCalledOnce();
  });

  it('repairs missing or retired assignments without retaining deleted study IDs', async () => {
    expect(
      await access.resolve(transaction, [
        { groupId: 'thera', hospitalId: 'removed' },
        { groupId: 'deleted-study', hospitalId: 'other' }
      ])
    ).toEqual({ groupIds: ['thera'], studyHospitals: [{ groupId: 'thera', hospitalId: 'alta' }] });
  });

  it.each([
    [{ groupId: 'thera', hospitalId: 'wrong-centre' }],
    [{ groupId: 'unassigned', hospitalId: 'alta' }],
    [
      { groupId: 'thera', hospitalId: 'alta' },
      { groupId: 'thera', hospitalId: 'clinic' }
    ]
  ])('rejects explicitly invalid administrator assignments: %j', async (...assignments) => {
    await expect(access.resolve(transaction, [], assignments)).rejects.toThrow();
    expect(userModel.update).not.toHaveBeenCalled();
  });

  it('is idempotent and avoids rewriting already valid catalogues and administrator profiles', async () => {
    groupModel.findMany.mockResolvedValue([
      {
        ...study,
        hospitalIds: ['clinic', 'alta'],
        hospitals: ['Hospital Clínic', 'Alta Medical Services']
      }
    ]);
    hospitals.findByIds.mockResolvedValue([externalHospital, internalHospital]);
    userModel.findMany.mockResolvedValue([
      {
        ...administrator,
        groupIds: ['thera'],
        studyHospitals: [{ groupId: 'thera', hospitalId: 'clinic' }]
      }
    ]);
    await access.onApplicationBootstrap();
    expect(groupModel.update).not.toHaveBeenCalled();
    expect(userModel.update).not.toHaveBeenCalled();
  });

  it('creates new administrators with every study even when the submitted group list is empty', async () => {
    await users.create({
      basePermissionLevel: 'ADMIN',
      firstName: 'Admin',
      lastName: 'User',
      username: 'admin',
      password: 'test-password',
      groupIds: []
    });
    expect(userModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          groups: { connect: [{ id: 'thera' }] },
          studyHospitals: [{ groupId: 'thera', hospitalId: 'alta' }]
        })
      })
    );
  });

  it.each(['amunyoz', 'ctorres', 'aramirez'])(
    'demotes %s and clears extra grants without changing groups, hospitals or records',
    async (username) => {
      userModel.findMany.mockResolvedValueOnce([
        {
          ...administrator,
          id: username,
          username,
          basePermissionLevel: 'GROUP_MANAGER',
          additionalPermissions: [{ action: 'manage', subject: 'all' }],
          groupIds: ['thera'],
          studyHospitals: [{ groupId: 'thera', hospitalId: 'clinic' }]
        }
      ]);
      await access.onApplicationBootstrap();
      expect(userModel.update).toHaveBeenCalledExactlyOnceWith({
        where: { id: username },
        data: { basePermissionLevel: 'STANDARD', additionalPermissions: [] }
      });
      expect(records.deleteMany).not.toHaveBeenCalled();
    }
  );

  it.each(['amunyoz', 'ctorres', 'aramirez'])('rejects new admin accounts and promotions for %s', async (username) => {
    await expect(
      users.create({
        username,
        basePermissionLevel: 'ADMIN',
        firstName: 'Test',
        lastName: 'User',
        password: 'test-password',
        groupIds: []
      })
    ).rejects.toThrow('Solo la cuenta admin');
    userModel.findUnique.mockResolvedValueOnce({
      ...administrator,
      username,
      id: username,
      basePermissionLevel: 'STANDARD'
    });
    await expect(users.updateById(username, { basePermissionLevel: 'ADMIN' })).rejects.toThrow('Solo la cuenta admin');
    expect(userModel.create).not.toHaveBeenCalled();
    expect(userModel.update).not.toHaveBeenCalled();
  });

  it('rejects privilege grants and transfers of the reserved admin username', async () => {
    userModel.findUnique.mockResolvedValue({
      ...administrator,
      username: 'researcher',
      basePermissionLevel: 'STANDARD'
    });
    await expect(
      users.updateById('researcher', {
        additionalPermissions: [{ action: 'manage', subject: 'all' }]
      })
    ).rejects.toThrow('permisos administrativos');
    await expect(users.updateById('researcher', { username: 'admin' })).rejects.toThrow('renombrar');
    userModel.findUnique.mockResolvedValue(administrator);
    await expect(users.updateById('admin', { username: 'other' })).rejects.toThrow('renombrar');
    expect(userModel.update).not.toHaveBeenCalled();
  });

  it('saves the exact admin group-edit payload from the UI without requiring hospital inputs', async () => {
    await users.updateById('admin', { groupIds: ['thera'], firstName: 'Admin' });
    expect(userModel.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          groups: { set: [{ id: 'thera' }] },
          studyHospitals: [{ groupId: 'thera', hospitalId: 'alta' }]
        })
      })
    );
  });

  it('also repairs administrator access during unrelated profile edits', async () => {
    await users.updateById('admin', { firstName: 'Admin' });
    expect(userModel.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ groups: { set: [{ id: 'thera' }] } })
      })
    );
  });

  it('assigns every study when an existing standard user is promoted to administrator', async () => {
    userModel.findUnique.mockResolvedValue({ ...administrator, basePermissionLevel: 'STANDARD' });
    await users.updateById('admin', { basePermissionLevel: 'ADMIN' });
    expect(userModel.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ studyHospitals: [{ groupId: 'thera', hospitalId: 'alta' }] })
      })
    );
  });

  it.each(['GROUP_MANAGER' as const, null])(
    'does not permit changing the reserved administrator role to %s',
    async (role) => {
      await expect(users.updateById('admin', { basePermissionLevel: role, groupIds: [] })).rejects.toThrow(
        'Solo la cuenta admin'
      );
      expect(groupModel.findMany).not.toHaveBeenCalled();
      expect(userModel.update).not.toHaveBeenCalled();
    }
  );

  it('still rejects standard-user memberships with no valid study centre', async () => {
    userModel.findUnique.mockResolvedValue({
      ...administrator,
      username: 'researcher',
      basePermissionLevel: 'STANDARD'
    });
    await expect(users.updateById('researcher', { groupIds: ['thera'] })).rejects.toThrow('centre sanitari vàlid');
    expect(userModel.update).not.toHaveBeenCalled();
  });

  it('creates a group and its administrator memberships and hospitals in the same transaction', async () => {
    groupModel.create.mockResolvedValue(study);
    await access.createGroup({ name: 'THERA-SGM-2026', type: 'RESEARCH', settings: {} });
    expect(codes.transaction).toHaveBeenCalledOnce();
    expect(groupModel.create).toHaveBeenCalledOnce();
    expect(userModel.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ studyHospitals: [{ groupId: 'thera', hospitalId: 'alta' }] })
      })
    );
  });

  it('propagates assignment failures so the group-creation transaction cannot commit partially', async () => {
    userModel.update.mockRejectedValue(new Error('database unavailable'));
    await expect(access.createGroup({ name: 'THERA', type: 'RESEARCH', settings: {} })).rejects.toThrow(
      'database unavailable'
    );
    expect(codes.transaction).toHaveBeenCalledOnce();
  });
});
