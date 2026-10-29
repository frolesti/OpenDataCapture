import { CryptoService, getModelToken } from '@douglasneuroinformatics/libnest';
import type { Model } from '@douglasneuroinformatics/libnest';
import { MockFactory, type MockedInstance } from '@douglasneuroinformatics/libnest/testing';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { GroupsService } from '../../groups/groups.service';
import { OnboardingMailService } from '../onboarding-mail.service';
import { UsersService } from '../users.service';

describe('investigator promotion', () => {
  let service: UsersService;
  let pendingModel: MockedInstance<Model<'PendingInvestigator'>>;
  let userModel: MockedInstance<Model<'User'>>;
  let mail: MockedInstance<OnboardingMailService>;

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
    userModel = moduleRef.get(getModelToken('User'));
    pendingModel = moduleRef.get(getModelToken('PendingInvestigator'));
    mail = moduleRef.get(OnboardingMailService);
  });

  it.each([null, undefined])(
    'rejects a legacy missing title before creating any account or contacting SMTP',
    async (professionalTitle) => {
      pendingModel.findUnique.mockResolvedValueOnce({ id: 'pending', professionalTitle });
      await expect(service.promotePendingById('pending')).rejects.toThrow('Dr. o Dra.');
      expect(userModel.create).not.toHaveBeenCalled();
      expect(mail.verifyConnection).not.toHaveBeenCalled();
      expect(mail.sendWelcomeEmail).not.toHaveBeenCalled();
      expect(pendingModel.update).not.toHaveBeenCalled();
    }
  );

  it('passes the full name and explicit title to the mail service', async () => {
    pendingModel.findUnique.mockResolvedValueOnce({
      id: 'pending',
      email: 'doctor@example.test',
      firstName: 'María',
      lastName: 'García Pérez',
      professionalTitle: 'Dra',
      basePermissionLevel: 'STANDARD',
      groupIds: []
    });
    userModel.create.mockResolvedValueOnce({ id: 'created-user' });
    await service.promotePendingById('pending');
    expect(mail.sendWelcomeEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'María',
        lastName: 'García Pérez',
        professionalTitle: 'Dra',
        username: 'mgarcia'
      })
    );
  });
});
