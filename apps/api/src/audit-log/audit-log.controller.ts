import { CurrentUser, RouteAccess } from '@douglasneuroinformatics/libnest';
import type { AppAbility } from '@douglasneuroinformatics/libnest';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuditLogService } from './audit-log.service';

@ApiTags('Audit Log')
@Controller('audit-log')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit log entries' })
  @RouteAccess({ action: 'read', subject: 'AuditLog' })
  find(
    @CurrentUser('ability') ability: AppAbility,
    @Query('groupId') groupId?: string,
    @Query('instrumentId') instrumentId?: string,
    @Query('subjectId') subjectId?: string
  ) {
    return this.auditLogService.find({ groupId, instrumentId, subjectId }, { ability });
  }
}
