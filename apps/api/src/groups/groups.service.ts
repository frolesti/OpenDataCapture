import { accessibleQuery, InjectModel } from '@douglasneuroinformatics/libnest';
import type { Model } from '@douglasneuroinformatics/libnest';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import type { EntityOperationOptions } from '@/core/types';
import { InstrumentsService } from '@/instruments/instruments.service';

import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel('Group') private readonly groupModel: Model<'Group'>,
    private readonly instrumentsService: InstrumentsService
  ) {}

  async create({ hospitals = [], name, settings, type, ...data }: CreateGroupDto) {
    const exists = await this.groupModel.exists({ name });
    if (exists) {
      throw new ConflictException(`Group with name '${name}' already exists!`);
    }
    return this.groupModel.create({
      data: {
        accessibleInstruments: {
          connect: (await this.instrumentsService.find()).map(({ id }) => ({ id }))
        },
        hospitals: this.normalizeHospitals(hospitals),
        name,
        settings: {
          defaultIdentificationMethod: type === 'CLINICAL' ? 'PERSONAL_INFO' : 'CUSTOM_ID',
          ...settings
        },
        type,
        ...data
      }
    });
  }

  async deleteById(id: string, { ability }: EntityOperationOptions = {}) {
    return this.groupModel.delete({
      where: { AND: [accessibleQuery(ability, 'delete', 'Group')], id }
    });
  }

  async findAll({ ability }: EntityOperationOptions = {}) {
    return this.groupModel.findMany({
      where: accessibleQuery(ability, 'read', 'Group')
    });
  }

  async findById(id: string, { ability }: EntityOperationOptions = {}) {
    const group = await this.groupModel.findFirst({
      where: { AND: [accessibleQuery(ability, 'read', 'Group')], id }
    });
    if (!group) {
      throw new NotFoundException(`Failed to find group with ID: ${id}`);
    }
    return group;
  }

  async updateById(
    id: string,
    { accessibleInstrumentIds, hospitals, name, settings, type }: UpdateGroupDto,
    { ability }: EntityOperationOptions = {}
  ) {
    const where: Prisma.GroupWhereInput = { AND: [accessibleQuery(ability, 'update', 'Group')], id };
    const group = await this.groupModel.findFirst({ where });
    if (!group) {
      throw new NotFoundException(`Failed to find group with ID: ${id}`);
    }
    if (typeof name === 'string' && name !== group.name) {
      const nameTakenByOther = await this.groupModel.exists({ AND: [{ name }, { id: { not: id } }] });
      if (nameTakenByOther) {
        throw new ConflictException(`Group with name '${name}' already exists!`);
      }
    }

    const updateData: Prisma.GroupUpdateInput = {};
    if (accessibleInstrumentIds) {
      updateData.accessibleInstruments = {
        set: accessibleInstrumentIds.map((instrumentId) => ({ id: instrumentId }))
      };
    }
    if (hospitals !== undefined) {
      updateData.hospitals = { set: this.normalizeHospitals(hospitals) };
    }
    if (typeof name === 'string') {
      updateData.name = name;
    }
    if (type) {
      updateData.type = type;
    }
    if (settings) {
      updateData.settings = { ...group.settings, ...settings };
    }

    return this.groupModel.update({
      data: updateData,
      where: { AND: [accessibleQuery(ability, 'update', 'Group')], id }
    });
  }

  private normalizeHospitals(hospitals: string[]) {
    return Array.from(new Set(hospitals.map((hospital) => hospital.trim()).filter(Boolean)));
  }
}
