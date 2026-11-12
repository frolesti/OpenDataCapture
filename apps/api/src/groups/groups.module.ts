import { Module } from '@nestjs/common';

import { InstrumentsModule } from '@/instruments/instruments.module';
import { HospitalsModule } from '@/hospitals/hospitals.module';
import { OrionCodesModule } from '@/orion-codes/orion-codes.module';

import { AdministratorStudyAccessService } from './administrator-study-access.service';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  controllers: [GroupsController],
  exports: [AdministratorStudyAccessService, GroupsService],
  imports: [InstrumentsModule, HospitalsModule, OrionCodesModule],
  providers: [AdministratorStudyAccessService, GroupsService]
})
export class GroupsModule {}
