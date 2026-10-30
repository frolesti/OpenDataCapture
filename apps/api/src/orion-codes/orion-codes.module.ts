import { Module } from '@nestjs/common';

import { OrionCodesService } from './orion-codes.service';

@Module({ providers: [OrionCodesService], exports: [OrionCodesService] })
export class OrionCodesModule {}
