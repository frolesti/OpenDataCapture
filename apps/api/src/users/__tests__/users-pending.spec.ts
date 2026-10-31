import { CryptoService, getModelToken } from '@douglasneuroinformatics/libnest';
import type { Model } from '@douglasneuroinformatics/libnest';
import { MockFactory, type MockedInstance } from '@douglasneuroinformatics/libnest/testing';
import { Test } from '@nestjs/testing';
import { $CreatePendingInvestigatorData, $UpdatePendingInvestigatorData } from '@opendatacapture/schemas/user';
import { beforeEach, describe, expect, it } from 'vitest';

import { GroupsService } from '../../groups/groups.service';
import { OrionCodesService } from '../../orion-codes/orion-codes.service';
import { OnboardingMailService } from '../onboarding-mail.service';
import { UsersService } from '../users.service';

describe('pending investigator comments', () => {
  let service: UsersService;
  let pendingModel: MockedInstance<Model<'PendingInvestigator'>>;
  let groups: MockedInstance<GroupsService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        MockFactory.createForModelToken(getModelToken('User')),
        MockFactory.createForModelToken(getModelToken('PendingInvestigator')),
        MockFactory.createForService(CryptoService),
        MockFactory.createForService(GroupsService),
        MockFactory.createForService(OnboardingMailService),
        MockFactory.createForService(OrionCodesService)
      ]
    }).compile();
    service = moduleRef.get(UsersService);
    pendingModel = moduleRef.get(getModelToken('PendingInvestigator'));
    groups = moduleRef.get(GroupsService);
    groups.findById.mockResolvedValue({
      id: 'group',
      hospitals: ['Hospital de prova']
    });
  });

  it.each(['Pendent de confirmar la documentació', '', null, undefined])(
    'preserves supplied creation comments (%s) and defaults only missing comments to null',
    async (notes) => {
      await service.createPending(
        $CreatePendingInvestigatorData.parse({
          basePermissionLevel: 'STANDARD',
          email: 'doctor@example.test',
          firstName: 'Maria',
          lastName: 'Exemple',
          groupIds: ['group'],
          hospital: 'Hospital de prova',
          notes,
          professionalTitle: 'Dra',
          signed: false
        })
      );
      expect(pendingModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ notes: notes ?? null, professionalTitle: 'Dra', signed: false })
      });
    }
  );

  it.each(['Comentari actualitzat', null])('persists edited or explicitly cleared comments (%s)', async (notes) => {
    pendingModel.findUnique.mockResolvedValueOnce({ id: 'pending', email: 'doctor@example.test' });
    await service.updatePendingById('pending', $UpdatePendingInvestigatorData.parse({ notes }));
    expect(pendingModel.update).toHaveBeenCalledWith({
      data: expect.objectContaining({ notes }),
      where: { id: 'pending' }
    });
  });

  it('does not overwrite comments when an unrelated partial update omits them', async () => {
    pendingModel.findUnique.mockResolvedValueOnce({ id: 'pending', email: 'doctor@example.test' });
    await service.updatePendingById('pending', { firstName: 'Anna' });
    expect(pendingModel.update).toHaveBeenCalledWith({
      data: { email: undefined, firstName: 'Anna' },
      where: { id: 'pending' }
    });
  });

  it('accepts a separate centre for each assigned study', async () => {
    groups.findById.mockImplementation(async (id) => ({
      id,
      name: id,
      hospitals: [`Centre ${id}`],
      hospitalCatalog: [{ id: `hospital-${id}`, name: `Centre ${id}`, isInternal: false }]
    }));
    const studyHospitals = [
      { groupId: 'omega', hospitalId: 'hospital-omega' },
      { groupId: 'orion', hospitalId: 'hospital-orion' }
    ];
    await service.createPending({
      basePermissionLevel: 'STANDARD',
      email: 'doctor@example.test',
      firstName: 'Maria',
      lastName: 'Exemple',
      groupIds: ['omega', 'orion'],
      hospital: 'Centre omega',
      studyHospitals,
      signed: false
    });
    expect(pendingModel.create).toHaveBeenCalledWith({ data: expect.objectContaining({ studyHospitals }) });
  });

  it('rejects a centre belonging to another study even when it is present in the union', async () => {
    groups.findById.mockResolvedValue({
      id: 'orion',
      name: 'ORION',
      hospitals: ['Centre ORION'],
      hospitalCatalog: [{ id: 'hospital-orion', name: 'Centre ORION', isInternal: false }]
    });
    await expect(
      service.createPending({
        basePermissionLevel: 'STANDARD',
        email: 'doctor@example.test',
        firstName: 'Maria',
        lastName: 'Exemple',
        groupIds: ['orion'],
        hospital: 'Centre OMEGA',
        studyHospitals: [{ groupId: 'orion', hospitalId: 'hospital-omega' }],
        signed: false
      })
    ).rejects.toThrow('centre sanitari vàlid');
    expect(pendingModel.create).not.toHaveBeenCalled();
  });

  it('assigns any centre configured for the study without a special account classification', async () => {
    groups.findById.mockResolvedValue({
      id: 'orion',
      name: 'ORION',
      hospitals: ['Alta Medical Services'],
      hospitalCatalog: [{ id: 'internal', name: 'Alta Medical Services', isInternal: true }]
    });
    await service.createPending({
      basePermissionLevel: 'STANDARD',
      email: 'doctor@example.test',
      firstName: 'Maria',
      lastName: 'Exemple',
      groupIds: ['orion'],
      hospital: 'Alta Medical Services',
      studyHospitals: [{ groupId: 'orion', hospitalId: 'internal' }],
      signed: false
    });
    expect(pendingModel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ studyHospitals: [{ groupId: 'orion', hospitalId: 'internal' }] })
    });
  });

  it('preserves generic group onboarding when no healthcare centres are configured', async () => {
    groups.findById.mockResolvedValue({ id: 'generic', name: 'Generic', hospitals: [] });
    await service.createPending({
      basePermissionLevel: 'STANDARD',
      email: 'doctor@example.test',
      firstName: 'Maria',
      lastName: 'Exemple',
      groupIds: ['generic'],
      hospital: '',
      signed: false
    });
    expect(pendingModel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ groupIds: ['generic'], studyHospitals: [] })
    });
  });
});
