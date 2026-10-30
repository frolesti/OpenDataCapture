import { Module } from '@nestjs/common';

import { GroupsModule } from '@/groups/groups.module';
import { OrionCodesModule } from '@/orion-codes/orion-codes.module';

import { OnboardingMailService } from './onboarding-mail.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  exports: [UsersService],
  imports: [GroupsModule, OrionCodesModule],
  providers: [OnboardingMailService, UsersService]
})
export class UsersModule {}
