import { BadRequestException, Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { DEFAULT_GROUP_HOSPITAL } from '@opendatacapture/schemas/group';
import type { StudyHospital } from '@opendatacapture/schemas/user';
import type { Prisma } from '@prisma/client';

import { HospitalsService } from '@/hospitals/hospitals.service';
import { OrionCodesService, type OrionTransactionClient } from '@/orion-codes/orion-codes.service';

@Injectable()
export class AdministratorStudyAccessService implements OnApplicationBootstrap {
  constructor(
    private readonly hospitalsService: HospitalsService,
    private readonly orionCodesService: OrionCodesService
  ) {}

  async onApplicationBootstrap() {
    await this.orionCodesService.transaction((transaction) => this.synchronize(transaction));
  }

  async createGroup(data: Prisma.GroupCreateInput) {
    return this.orionCodesService.transaction(async (transaction) => {
      const group = await transaction.group.create({ data });
      await this.synchronize(transaction);
      return group;
    });
  }

  async resolve(transaction: OrionTransactionClient, existing: StudyHospital[] = [], requested?: StudyHospital[]) {
    const groups = await transaction.group.findMany();
    if (
      requested &&
      (new Set(requested.map((entry) => entry.groupId)).size !== requested.length ||
        requested.some((entry) => !groups.some((group) => group.id === entry.groupId)))
    ) {
      throw new BadRequestException('Cada centre ha de correspondre a un únic estudi assignat.');
    }

    const studyHospitals: StudyHospital[] = [];
    for (const group of groups) {
      const currentCatalog = group.hospitalIds.length
        ? await this.hospitalsService.findByIds(group.hospitalIds, transaction)
        : await this.hospitalsService.resolveNames(group.hospitals, transaction);
      const [defaultHospital] = await this.hospitalsService.resolveNames([DEFAULT_GROUP_HOSPITAL], transaction);
      if (!defaultHospital) {
        throw new BadRequestException('No s’ha pogut resoldre el centre Alta Medical Services.');
      }
      const catalog = [
        ...new Map([...currentCatalog, defaultHospital].map((hospital) => [hospital.id, hospital])).values()
      ];
      const hospitalIds = catalog.map((hospital) => hospital.id);
      const hospitals = catalog.map((hospital) => hospital.name);
      if (
        JSON.stringify(group.hospitalIds) !== JSON.stringify(hospitalIds) ||
        JSON.stringify(group.hospitals) !== JSON.stringify(hospitals)
      ) {
        await transaction.group.update({
          where: { id: group.id },
          data: { hospitalIds: { set: hospitalIds }, hospitals: { set: hospitals } }
        });
      }

      const explicit = requested?.find((entry) => entry.groupId === group.id);
      if (explicit && !hospitalIds.includes(explicit.hospitalId)) {
        throw new BadRequestException(`Cal assignar un centre sanitari vàlid per a l'estudi '${group.name}'.`);
      }
      const previous = existing.find((entry) => entry.groupId === group.id && hospitalIds.includes(entry.hospitalId));
      studyHospitals.push({
        groupId: group.id,
        hospitalId: explicit?.hospitalId ?? previous?.hospitalId ?? defaultHospital.id
      });
    }
    return { groupIds: groups.map((group) => group.id), studyHospitals };
  }

  private async synchronize(transaction: OrionTransactionClient) {
    const administrators = await transaction.user.findMany({ where: { basePermissionLevel: 'ADMIN' } });
    for (const administrator of administrators) {
      const access = await this.resolve(transaction, administrator.studyHospitals);
      const sameGroups =
        administrator.groupIds.length === access.groupIds.length &&
        access.groupIds.every((id) => administrator.groupIds.includes(id));
      const sameHospitals =
        administrator.studyHospitals.length === access.studyHospitals.length &&
        access.studyHospitals.every((entry) =>
          administrator.studyHospitals.some(
            (previous) => previous.groupId === entry.groupId && previous.hospitalId === entry.hospitalId
          )
        );
      if (sameGroups && sameHospitals) continue;
      await transaction.user.update({
        where: { id: administrator.id },
        data: {
          groups: { set: access.groupIds.map((id) => ({ id })) },
          studyHospitals: access.studyHospitals
        }
      });
    }
  }
}
