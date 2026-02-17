import { accessibleQuery, InjectModel } from '@douglasneuroinformatics/libnest';
import type { Model } from '@douglasneuroinformatics/libnest';
import { Injectable } from '@nestjs/common';

import type { EntityOperationOptions } from '@/core/types';

export type AuditFieldChange = {
  field: string;
  newValue?: string;
  oldValue?: string;
};

export type CreateAuditLogData = {
  changes: AuditFieldChange[];
  groupId?: string;
  instrumentId: string;
  newData?: unknown;
  previousData?: unknown;
  recordId: string;
  subjectId: string;
  userId: string;
  username: string;
};

@Injectable()
export class AuditLogService {
  constructor(@InjectModel('AuditLog') private readonly auditLogModel: Model<'AuditLog'>) {}

  async create(data: CreateAuditLogData) {
    return this.auditLogModel.create({
      data: {
        changes: data.changes,
        groupId: data.groupId,
        instrumentId: data.instrumentId,
        newData: data.newData as any,
        previousData: data.previousData as any,
        recordId: data.recordId,
        subjectId: data.subjectId,
        userId: data.userId,
        username: data.username
      }
    });
  }

  async find(
    query: { groupId?: string; instrumentId?: string; subjectId?: string },
    { ability }: EntityOperationOptions = {}
  ) {
    const where: Record<string, unknown> = {};
    if (query.groupId) {
      where.groupId = query.groupId;
    }
    if (query.instrumentId) {
      where.instrumentId = query.instrumentId;
    }
    if (query.subjectId) {
      where.subjectId = query.subjectId;
    }

    return this.auditLogModel.findMany({
      orderBy: { createdAt: 'desc' },
      where
    });
  }

  /** Compute field-level diff between old and new data objects */
  computeChanges(oldData: Record<string, unknown>, newData: Record<string, unknown>): AuditFieldChange[] {
    const changes: AuditFieldChange[] = [];
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of allKeys) {
      const oldVal = oldData[key];
      const newVal = newData[key];

      const oldStr = oldVal !== undefined && oldVal !== null ? JSON.stringify(oldVal) : undefined;
      const newStr = newVal !== undefined && newVal !== null ? JSON.stringify(newVal) : undefined;

      if (oldStr !== newStr) {
        changes.push({
          field: key,
          newValue: newStr,
          oldValue: oldStr
        });
      }
    }

    return changes;
  }
}
