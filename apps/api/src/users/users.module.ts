import { Module } from '@nestjs/common';

import { GroupsModule } from '@/groups/groups.module';

import { OnboardingMailService } from './onboarding-mail.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  exports: [UsersService],
  imports: [GroupsModule],
  providers: [OnboardingMailService, UsersService]
})
export class UsersModule {}
