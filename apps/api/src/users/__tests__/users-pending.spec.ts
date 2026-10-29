import { CryptoService, getModelToken } from '@douglasneuroinformatics/libnest';
import type { Model } from '@douglasneuroinformatics/libnest';
import { MockFactory, type MockedInstance } from '@douglasneuroinformatics/libnest/testing';
import { Test } from '@nestjs/testing';
import { $CreatePendingInvestigatorData, $UpdatePendingInvestigatorData } from '@opendatacapture/schemas/user';
import { beforeEach, describe, expect, it } from 'vitest';

import { GroupsService } from '../../groups/groups.service';
import { OnboardingMailService } from '../onboarding-mail.service';
import { UsersService } from '../users.service';

describe('pending investigator comments', () => {
  let service: UsersService;
  let pendingModel: MockedInstance<Model<'PendingInvestigator'>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        MockFactory.createForModelToken(getModelToken('User')),
        MockFactory.createForModelToken(getModelToken('PendingInvestigator')),
        MockFactory.createForService(CryptoService),
        MockFactory.createForService(GroupsService),
        MockFactory.createForService(OnboardingMailService)
      ]
    }).compile();
    service = moduleRef.get(UsersService);
    pendingModel = moduleRef.get(getModelToken('PendingInvestigator'));
    moduleRef.get<MockedInstance<GroupsService>>(GroupsService).findById.mockResolvedValue({
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
});
