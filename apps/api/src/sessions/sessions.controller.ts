import { CurrentUser, RouteAccess } from '@douglasneuroinformatics/libnest';
import type { AppAbility } from '@douglasneuroinformatics/libnest';
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import type { Session, User } from '@prisma/client';

import { CreateSessionDto } from './dto/create-session.dto';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @ApiOperation({ description: 'Get Sessions' })
  @Get()
  @RouteAccess({ action: 'read', subject: 'Session' })
  find(@CurrentUser('ability') ability: AppAbility, @Query('userId') userId?: string) {
    return this.sessionsService.find({ userId }, { ability });
  }

  @ApiOperation({ description: 'Get Session' })
  @Get(':id')
  @RouteAccess({ action: 'read', subject: 'Session' })
  findById(@Param('id') id: string, @CurrentUser('ability') ability: AppAbility) {
    return this.sessionsService.findById(id, { ability });
  }

  @ApiOperation({ description: 'Create Session' })
  @Post()
  @RouteAccess({ action: 'create', subject: 'Session' })
  create(
    @Body() data: CreateSessionDto,
    @CurrentUser() user: User,
    @CurrentUser('ability') ability: AppAbility
  ): Promise<Session> {
    return this.sessionsService.create({ ...data, username: user.username }, { ability });
  }
}
