import { forwardRef, Module } from '@nestjs/common';

import { GatewayModule } from '@/gateway/gateway.module';
import { InstrumentsModule } from '@/instruments/instruments.module';

import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';

@Module({
  controllers: [AssignmentsController],
  exports: [AssignmentsService],
  imports: [forwardRef(() => GatewayModule), InstrumentsModule],
  providers: [AssignmentsService]
})
export class AssignmentsModule {}
