import { Module } from '@nestjs/common';

import { InstrumentsModule } from '@/instruments/instruments.module';
import { HospitalsModule } from '@/hospitals/hospitals.module';

import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  controllers: [GroupsController],
  exports: [GroupsService],
  imports: [InstrumentsModule, HospitalsModule],
  providers: [GroupsService]
})
export class GroupsModule {}
