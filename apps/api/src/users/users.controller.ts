import { CurrentUser, RouteAccess } from '@douglasneuroinformatics/libnest';
import type { AppAbility } from '@douglasneuroinformatics/libnest';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreatePendingInvestigatorDto } from './dto/create-pending-investigator.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePendingInvestigatorDto } from './dto/update-pending-investigator.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller({ path: 'users' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Get User by Username' })
  @Get('/check-username/:username')
  @RouteAccess({ action: 'read', subject: 'User' })
  checkUsernameExists(@Param('username') username: string, @CurrentUser('ability') ability: AppAbility) {
    return this.usersService.checkUsernameExists(username, { ability });
  }

  @ApiOperation({ summary: 'Create User' })
  @Post()
  @RouteAccess({ action: 'create', subject: 'User' })
  create(@Body() user: CreateUserDto, @CurrentUser('ability') ability: AppAbility) {
    return this.usersService.create(user, { ability });
  }

  @ApiOperation({ summary: 'Delete User' })
  @Delete(':id')
  @RouteAccess({ action: 'delete', subject: 'User' })
  deleteById(@Param('id') id: string, @CurrentUser('ability') ability: AppAbility) {
    return this.usersService.deleteById(id, { ability });
  }

  @ApiOperation({ summary: 'Get All Users' })
  @Get()
  @RouteAccess({ action: 'read', subject: 'User' })
  find(@CurrentUser('ability') ability: AppAbility, @Query('groupId') groupId?: string) {
    return this.usersService.find({ groupId }, { ability });
  }

  @ApiOperation({ summary: 'List Pending Investigators' })
  @Get('/pending')
  @RouteAccess({ action: 'manage', subject: 'all' })
  findPending() {
    return this.usersService.findPending();
  }

  @ApiOperation({ summary: 'Get Current User Profile' })
  @Get('/me')
  @RouteAccess({ action: 'update', subject: 'User' })
  findCurrent(@CurrentUser() user: { id: string }, @CurrentUser('ability') ability: AppAbility) {
    return this.usersService.findCurrentById(user.id, { ability });
  }

  @ApiOperation({ summary: 'Get User' })
  @Get(':id')
  @RouteAccess({ action: 'read', subject: 'User' })
  findById(@Param('id') id: string, @CurrentUser('ability') ability: AppAbility) {
    return this.usersService.findById(id, { ability });
  }

  @ApiOperation({ summary: 'Update User' })
  @Patch(':id')
  @RouteAccess({ action: 'update', subject: 'User' })
  updateById(@Param('id') id: string, @Body() update: UpdateUserDto, @CurrentUser('ability') ability: AppAbility) {
    return this.usersService.updateById(id, update, { ability });
  }

  @ApiOperation({ summary: 'Create Pending Investigator' })
  @Post('/pending')
  @RouteAccess({ action: 'manage', subject: 'all' })
  createPending(@Body() pending: CreatePendingInvestigatorDto, @CurrentUser('ability') ability: AppAbility) {
    return this.usersService.createPending(pending, { ability });
  }

  @ApiOperation({ summary: 'Update Pending Investigator' })
  @Patch('/pending/:id')
  @RouteAccess({ action: 'manage', subject: 'all' })
  updatePendingById(@Param('id') id: string, @Body() update: UpdatePendingInvestigatorDto) {
    return this.usersService.updatePendingById(id, update);
  }

  @ApiOperation({ summary: 'Delete Pending Investigator' })
  @Delete('/pending/:id')
  @RouteAccess({ action: 'manage', subject: 'all' })
  deletePendingById(@Param('id') id: string) {
    return this.usersService.deletePendingById(id);
  }

  @ApiOperation({ summary: 'Promote Pending Investigator to User and Send Mail' })
  @Post('/pending/:id/promote')
  @RouteAccess({ action: 'manage', subject: 'all' })
  promotePendingById(@Param('id') id: string, @CurrentUser('ability') ability: AppAbility) {
    return this.usersService.promotePendingById(id, { ability });
  }
}
