import { InjectModel, InjectPrismaClient } from '@douglasneuroinformatics/libnest';
import type { ExtendedPrismaClient, Model } from '@douglasneuroinformatics/libnest';
import { ConflictException, Injectable } from '@nestjs/common';

export type OrionTransactionClient = Parameters<Parameters<ExtendedPrismaClient['$transaction']>[0]>[0];

function isDuplicate(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
}

@Injectable()
export class OrionCodesService {
  constructor(
    @InjectModel('OrionInvestigator') private readonly investigatorModel: Model<'OrionInvestigator'>,
    @InjectModel('OrionPatientCode') private readonly patientCodeModel: Model<'OrionPatientCode'>,
    @InjectPrismaClient() private readonly prismaClient: ExtendedPrismaClient
  ) {}

  async transaction<T>(operation: (client: OrionTransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        return await this.prismaClient.$transaction(operation);
      } catch (error) {
        const conflict = error && typeof error === 'object' && 'code' in error && error.code === 'P2034';
        if ((!isDuplicate(error) && !conflict) || attempt === 19) throw error;
      }
    }
    throw new ConflictException('No s’ha pogut completar l’operació. Torneu-ho a provar.');
  }

  async findForUsers(userIds: string[]) {
    return this.investigatorModel.findMany({ where: { investigatorId: { in: userIds } } });
  }

  async assignInvestigator(groupId: string, investigatorId: string, transaction?: OrionTransactionClient) {
    const model = transaction?.orionInvestigator ?? this.investigatorModel;
    for (let attempt = 0; attempt < 20; attempt++) {
      const existing = await model.findFirst({ where: { groupId, investigatorId } });
      if (existing) return existing;
      const latest = await model.findFirst({
        where: { groupId },
        orderBy: { number: 'desc' }
      });
      try {
        return await model.create({
          data: { groupId, investigatorId, number: (latest?.number ?? 0) + 1 }
        });
      } catch (error) {
        if (transaction || !isDuplicate(error)) throw error;
      }
    }
    throw new ConflictException('No s’ha pogut assignar el número d’investigador. Torneu-ho a provar.');
  }

  async preview(groupId: string, investigatorId: string) {
    const investigator = await this.assignInvestigator(groupId, investigatorId);
    const latest = await this.patientCodeModel.findFirst({
      where: { groupId, investigatorId },
      orderBy: { sequence: 'desc' }
    });
    return this.format(investigator, (latest?.sequence ?? 0) + 1);
  }

  async create(groupId: string, investigatorId: string, hospital: string, transaction?: OrionTransactionClient) {
    const investigator = await this.assignInvestigator(groupId, investigatorId, transaction);
    const model = transaction?.orionPatientCode ?? this.patientCodeModel;
    for (let attempt = 0; attempt < 20; attempt++) {
      const latest = await model.findFirst({
        where: { groupId, investigatorId },
        orderBy: { sequence: 'desc' }
      });
      const sequence = (latest?.sequence ?? 0) + 1;
      const code = this.format(investigator, sequence);
      try {
        await model.create({
          data: { code, groupId, investigatorId, hospital, sequence, investigatorNumber: investigator.number }
        });
        return code;
      } catch (error) {
        if (transaction || !isDuplicate(error)) throw error;
      }
    }
    throw new ConflictException('No s’ha pogut assignar un codi de pacient únic. Torneu-ho a provar.');
  }

  private format(investigator: { number: number }, sequence: number) {
    return `OR-${String(investigator.number).padStart(2, '0')}-${String(sequence).padStart(2, '0')}`;
  }
}
