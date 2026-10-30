import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { GroupsModule } from '@/groups/groups.module';
import { OrionCodesModule } from '@/orion-codes/orion-codes.module';

import { OnboardingMailService } from './onboarding-mail.service';
import { AccountAccessInterceptor } from './account-access.interceptor';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  exports: [UsersService],
  imports: [GroupsModule, OrionCodesModule],
  providers: [OnboardingMailService, UsersService, { provide: APP_INTERCEPTOR, useClass: AccountAccessInterceptor }]
})
export class UsersModule {}
