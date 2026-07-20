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

  /** Compute field-level diff between old and new data objects */
  computeChanges(oldData: { [key: string]: unknown }, newData: { [key: string]: unknown }): AuditFieldChange[] {
    const changes: AuditFieldChange[] = [];
    const allKeys = new Set([...Object.keys(newData), ...Object.keys(oldData)]);

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
    const where: { [key: string]: unknown } = {};
    if (query.groupId) {
      where.groupId = query.groupId;
    }
    if (query.instrumentId) {
      where.instrumentId = query.instrumentId;
    }
    if (query.subjectId) {
      where.subjectId = query.subjectId;
    }

    const results = await this.auditLogModel.findMany({
      orderBy: { createdAt: 'desc' },
      where
    });

    // Transform results to avoid returning full newData/previousData blobs twice
    // and return only the useful, compact shape for the frontend.
    return results.map((r: any) => {
      const patientCode =
        r.newData?.codigoPaciente ??
        r.previousData?.codigoPaciente ??
        r.newData?.patientID ??
        r.previousData?.patientID ??
        undefined;
      const prevKeys = r.previousData ? Object.keys(r.previousData) : [];
      const newKeys = r.newData ? Object.keys(r.newData) : [];
      const fields = Array.from(new Set([...newKeys, ...prevKeys]));

      const compactChanges: { [key: string]: { new?: string; old?: string } } = {};
      (r.changes ?? []).forEach((c: any) => {
        compactChanges[c.field] = { new: c.newValue, old: c.oldValue };
      });

      return {
        changedCount: (r.changes ?? []).length,
        changes: r.changes ?? [],
        compactChanges,
        createdAt: r.createdAt,
        fields,
        groupId: r.groupId,
        id: r.id,
        instrumentId: r.instrumentId,
        patientCode,
        recordId: r.recordId,
        subjectId: r.subjectId,
        userId: r.userId,
        username: r.username
      };
    });
  }
}
