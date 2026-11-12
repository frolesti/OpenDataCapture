import { accessibleQuery, InjectModel } from '@douglasneuroinformatics/libnest';
import type { Model } from '@douglasneuroinformatics/libnest';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_GROUP_HOSPITAL } from '@opendatacapture/schemas/group';
import type { Prisma } from '@prisma/client';

import type { EntityOperationOptions } from '@/core/types';
import { InstrumentsService } from '@/instruments/instruments.service';
import { HospitalsService } from '@/hospitals/hospitals.service';

import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel('Group') private readonly groupModel: Model<'Group'>,
    @InjectModel('User') private readonly userModel: Model<'User'>,
    @InjectModel('PendingInvestigator') private readonly pendingModel: Model<'PendingInvestigator'>,
    private readonly instrumentsService: InstrumentsService,
    private readonly hospitalsService: HospitalsService
  ) {}

  async create({ accessibleInstrumentIds, hospitals = [], name, settings, studyCode, type }: CreateGroupDto) {
    const exists = await this.groupModel.exists({ name });
    if (exists) {
      throw new ConflictException(`Group with name '${name}' already exists!`);
    }
    const instruments = await this.instrumentsService.find();
    const availableIds = new Set(instruments.map(({ id }) => id));
    if (accessibleInstrumentIds?.some((id) => !availableIds.has(id))) {
      throw new BadRequestException('Hi ha instruments seleccionats que no estan disponibles.');
    }
    const instrumentIds = [...new Set(accessibleInstrumentIds ?? instruments.map(({ id }) => id))];
    const catalog = await this.hospitalsService.resolveNames([DEFAULT_GROUP_HOSPITAL, ...hospitals]);
    const administrators = await this.userModel.findMany({
      where: { basePermissionLevel: 'ADMIN' },
      select: { id: true }
    });
    const created = await this.groupModel.create({
      data: {
        accessibleInstruments: {
          connect: instrumentIds.map((id) => ({ id }))
        },
        hospitals: catalog.map((hospital) => hospital.name),
        hospitalIds: catalog.map((hospital) => hospital.id),
        name,
        studyCode,
        settings: {
          defaultIdentificationMethod: type === 'CLINICAL' ? 'PERSONAL_INFO' : 'CUSTOM_ID',
          ...settings
        },
        type,
        users: {
          connect: administrators.map(({ id }) => ({ id }))
        }
      }
    });

    return this.sanitizeGroupHospitals(created);
  }

  async deleteById(id: string, { ability }: EntityOperationOptions = {}) {
    return this.groupModel.delete({
      where: { AND: [accessibleQuery(ability, 'delete', 'Group')], id }
    });
  }

  async findAll({ ability, user }: EntityOperationOptions = {}) {
    const groups = await this.groupModel.findMany({
      where: accessibleQuery(ability, 'read', 'Group')
    });

    return Promise.all(groups.map((group) => this.sanitizeGroupHospitals(group, user)));
  }

  async findById(id: string, { ability, user }: EntityOperationOptions = {}) {
    const group = await this.groupModel.findFirst({
      where: { AND: [accessibleQuery(ability, 'read', 'Group')], id }
    });
    if (!group) {
      throw new NotFoundException(`Failed to find group with ID: ${id}`);
    }
    return this.sanitizeGroupHospitals(group, user);
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
      const catalog = await this.hospitalsService.resolveNames(hospitals);
      const removedIds = group.hospitalIds.filter((hospitalId) => !catalog.some((entry) => entry.id === hospitalId));
      if (removedIds.length) {
        const filter = { studyHospitals: { some: { groupId: id, hospitalId: { in: removedIds } } } };
        const [active, pending] = await Promise.all([
          this.userModel.count({ where: filter }),
          this.pendingModel.count({ where: { ...filter, promotedAt: null } })
        ]);
        if (active || pending) {
          throw new ConflictException('No es pot retirar un centre d’un estudi mentre tingui investigadors assignats.');
        }
      }
      updateData.hospitals = { set: catalog.map((hospital) => hospital.name) };
      updateData.hospitalIds = { set: catalog.map((hospital) => hospital.id) };
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

    const updated = await this.groupModel.update({
      data: updateData,
      where: { AND: [accessibleQuery(ability, 'update', 'Group')], id }
    });

    return this.sanitizeGroupHospitals(updated);
  }

  private normalizeHospitals(hospitals: string[]) {
    return Array.from(new Set(hospitals.map((hospital) => hospital.trim()).filter(Boolean)));
  }

  private async sanitizeGroupHospitals<T extends { hospitals?: unknown; hospitalIds?: string[] }>(
    group: T,
    user?: EntityOperationOptions['user']
  ) {
    const catalog = group.hospitalIds?.length ? await this.hospitalsService.findByIds(group.hospitalIds) : undefined;
    const visibleCatalog = catalog;
    return {
      ...group,
      hospitalCatalog: visibleCatalog,
      hospitalIds: visibleCatalog?.map((hospital) => hospital.id) ?? group.hospitalIds,
      hospitals: visibleCatalog?.map((hospital) => hospital.name) ?? this.sanitizeHospitals(group.hospitals)
    };
  }

  private sanitizeHospitals(value: unknown) {
    if (!Array.isArray(value)) {
      return [];
    }

    return this.normalizeHospitals(value.filter((entry): entry is string => typeof entry === 'string'));
  }
}
