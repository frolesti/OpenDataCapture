import { forwardRef, Module } from '@nestjs/common';

import { AssignmentsModule } from '@/assignments/assignments.module';
import { InstrumentsModule } from '@/instruments/instruments.module';

import { OrionFollowupService } from './orion-followup.service';

@Module({
  exports: [OrionFollowupService],
  imports: [forwardRef(() => AssignmentsModule), InstrumentsModule],
  providers: [OrionFollowupService]
})
export class OrionFollowupModule {}
