import crypto from 'node:crypto';

import { HybridCrypto } from '@douglasneuroinformatics/libcrypto';
import { accessibleQuery, ConfigService, InjectModel } from '@douglasneuroinformatics/libnest';
import type { Model } from '@douglasneuroinformatics/libnest';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Assignment, UpdateAssignmentData } from '@opendatacapture/schemas/assignment';

import type { EntityOperationOptions } from '@/core/types';
import { GatewayService } from '@/gateway/gateway.service';
import { InstrumentsService } from '@/instruments/instruments.service';

import { CreateAssignmentDto } from './dto/create-assignment.dto';

const ORION_SELECTION_INTERNAL = {
  edition: 1,
  name: 'ORION_PR_2026_SELECTION'
} as const;

const ORION_FOLLOWUP_INTERNAL = {
  edition: 1,
  name: 'ORION_PR_2026_FOLLOWUP'
} as const;

@Injectable()
export class AssignmentsService {
  private readonly assignmentBaseUrl: string;

  constructor(
    @InjectModel('Assignment') private readonly assignmentModel: Model<'Assignment'>,
    @InjectModel('InstrumentRecord') private readonly instrumentRecordModel: Model<'InstrumentRecord'>,
    configService: ConfigService,
    private readonly gatewayService: GatewayService,
    private readonly instrumentsService: InstrumentsService
  ) {
    if (configService.get('NODE_ENV') === 'production') {
      const siteAddress = configService.getOrThrow('GATEWAY_SITE_ADDRESS');
      this.assignmentBaseUrl = siteAddress.origin;
    } else {
      const gatewayPort = configService.get('GATEWAY_DEV_SERVER_PORT');
      this.assignmentBaseUrl = `http://localhost:${gatewayPort}`;
    }
  }

  async create({ expiresAt, groupId, instrumentId, subjectId }: CreateAssignmentDto): Promise<Assignment> {
    await this.assertOrionFollowupEligibilityForAssignment({ groupId, instrumentId, subjectId });

    const { privateKey, publicKey } = await HybridCrypto.generateKeyPair();
    const id = crypto.randomUUID();
    const assignment = await this.assignmentModel.create({
      data: {
        encryptionKeyPair: {
          privateKey: Buffer.from(await HybridCrypto.serializePrivateKey(privateKey)),
          publicKey: Buffer.from(await HybridCrypto.serializePublicKey(publicKey))
        },
        expiresAt,
        group: groupId
          ? {
              connect: {
                id: groupId
              }
            }
          : undefined,
        id,
        instrument: {
          connect: {
            id: instrumentId
          }
        },
        status: 'OUTSTANDING',
        subject: {
          connect: {
            id: subjectId
          }
        },
        url: `${this.assignmentBaseUrl}/assignments/${id}`
      }
    });
    try {
      await this.gatewayService.createRemoteAssignment(assignment, publicKey);
    } catch (err) {
      await this.assignmentModel.delete({ where: { id } });
      throw err;
    }
    return assignment;
  }

  async find(
    { subjectId }: { subjectId?: string } = {},
    { ability }: EntityOperationOptions = {}
  ): Promise<Assignment[]> {
    return this.assignmentModel.findMany({
      where: {
        AND: [accessibleQuery(ability, 'read', 'Assignment'), { subjectId }]
      }
    });
  }

  async findById(id: string, { ability }: EntityOperationOptions = {}) {
    const assignment = await this.assignmentModel.findFirst({
      where: { AND: [accessibleQuery(ability, 'read', 'Assignment')], id }
    });
    if (!assignment) {
      throw new NotFoundException(`Failed to find assignment with ID: ${id}`);
    }
    return assignment;
  }

  async updateById(id: string, data: UpdateAssignmentData, { ability }: EntityOperationOptions = {}) {
    if (data.status === 'CANCELED') {
      await this.gatewayService.deleteRemoteAssignment(id);
    }
    return this.assignmentModel.update({
      data,
      where: { AND: [accessibleQuery(ability, 'update', 'Assignment')], id }
    });
  }

  private async assertOrionFollowupEligibilityForAssignment({
    groupId,
    instrumentId,
    subjectId
  }: {
    groupId?: string;
    instrumentId: string;
    subjectId: string;
  }) {
    const instrument = await this.instrumentsService.findById(instrumentId);
    const isOrionFollowup =
      instrument.kind === 'FORM' &&
      instrument.internal.name === ORION_FOLLOWUP_INTERNAL.name &&
      instrument.internal.edition === ORION_FOLLOWUP_INTERNAL.edition;

    if (!isOrionFollowup) {
      return;
    }

    const selectionInstrumentId = this.instrumentsService.generateScalarInstrumentId({
      internal: ORION_SELECTION_INTERNAL
    });
    const selectionRecord = await this.instrumentRecordModel.findFirst({
      orderBy: { createdAt: 'desc' },
      where: {
        groupId: groupId ?? null,
        instrumentId: selectionInstrumentId,
        subjectId
      }
    });

    const selectionData = selectionRecord?.data as Record<string, unknown> | null;
    if (!selectionRecord || !selectionData || !this.isEligibleSelection(selectionData)) {
      throw new BadRequestException(
        'No se puede asignar la visita de 3 meses de ORION sin una visita de selección completada y apta.'
      );
    }
  }

  private isEligibleSelection(data: Record<string, unknown>) {
    const inclusionKeys = ['inclusion_1', 'inclusion_2', 'inclusion_3', 'inclusion_4', 'inclusion_5', 'inclusion_6'];
    const exclusionKeys = ['exclusion_1', 'exclusion_2', 'exclusion_3', 'exclusion_4', 'exclusion_5', 'exclusion_6'];
    return (
      data.informed_consent === 'si' &&
      inclusionKeys.every((key) => data[key] === 'si') &&
      exclusionKeys.every((key) => data[key] === 'no')
    );
  }
}
