import { InjectModel, InjectPrismaClient } from '@douglasneuroinformatics/libnest';
import type { ExtendedPrismaClient, Model } from '@douglasneuroinformatics/libnest';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { normalizeHospitalKey } from '@opendatacapture/schemas/group';
import type { HospitalOption } from '@opendatacapture/schemas/group';

@Injectable()
export class HospitalsService {
  constructor(
    @InjectModel('Hospital') private readonly hospitalModel: Model<'Hospital'>,
    @InjectPrismaClient() private readonly prismaClient: ExtendedPrismaClient
  ) {}

  async rename(id: string, rawName: string): Promise<HospitalOption> {
    const name = rawName.trim();
    const key = normalizeHospitalKey(name);
    if (!key) throw new BadRequestException('El centre sanitari ha de tenir un nom vàlid.');
    return this.prismaClient.$transaction(async (transaction) => {
      const hospital = await transaction.hospital.findUniqueOrThrow({ where: { id } });
      if (hospital.isInternal && hospital.name !== name) {
        throw new ConflictException('El centre intern ha de conservar el nom Alta Medical Services.');
      }
      const matches = await transaction.hospital.findMany({
        where: { id: { not: id }, OR: [{ key }, { aliasKeys: { has: key } }] }
      });
      if (matches.length) {
        throw new ConflictException(
          'Aquest nom ja correspon a un altre centre. No es poden fusionar centres canviant-ne el nom.'
        );
      }
      const updated = await transaction.hospital.update({
        where: { id },
        data: { name, key, aliasKeys: { set: [...new Set([...hospital.aliasKeys, hospital.key, key])] } }
      });
      const groups = await transaction.group.findMany({ where: { hospitalIds: { has: id } } });
      for (const group of groups) {
        if (group.hospitalIds.length !== group.hospitals.length) {
          throw new ConflictException(
            'El catàleg del grup és inconsistent. Cal revisar-lo abans de canviar el nom del centre.'
          );
        }
        await transaction.group.update({
          where: { id: group.id },
          data: {
            hospitals: {
              set: group.hospitalIds.map((hospitalId, index) => (hospitalId === id ? name : group.hospitals[index]!))
            }
          }
        });
      }
      await transaction.pendingInvestigator.updateMany({
        where: { hospital: hospital.name },
        data: { hospital: name }
      });
      return { id: updated.id, name: updated.name, isInternal: updated.isInternal };
    });
  }

  async resolveNames(names: string[]): Promise<HospitalOption[]> {
    const result = new Map<string, HospitalOption>();
    for (const raw of names) {
      const name = raw.trim();
      const key = normalizeHospitalKey(name);
      if (!key) throw new BadRequestException('El centre sanitari ha de tenir un nom vàlid.');
      const matches = await this.hospitalModel.findMany({
        where: { OR: [{ key }, { aliasKeys: { has: key } }] }
      });
      if (matches.length > 1) {
        throw new ConflictException(`El centre '${name}' és ambigu. Cal revisar-ne la localitat.`);
      }
      let hospital = matches[0];
      if (!hospital) {
        try {
          hospital = await this.hospitalModel.create({
            data: { name, key, aliasKeys: [key], isInternal: key === normalizeHospitalKey('Alta Medical Services') }
          });
        } catch (error) {
          if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'P2002') throw error;
          hospital = await this.hospitalModel.findUniqueOrThrow({ where: { key } });
        }
      }
      result.set(hospital.id, hospital);
    }
    return [...result.values()];
  }

  async findByIds(ids: string[]): Promise<HospitalOption[]> {
    const hospitals = await this.hospitalModel.findMany({ where: { id: { in: ids } } });
    if (new Set(ids).size !== hospitals.length) {
      throw new BadRequestException('Hi ha centres sanitaris que no existeixen al catàleg.');
    }
    return hospitals;
  }
}
