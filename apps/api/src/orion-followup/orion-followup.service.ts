import { ConfigService, InjectModel, InjectPrismaClient } from '@douglasneuroinformatics/libnest';
import type { ExtendedPrismaClient, Model } from '@douglasneuroinformatics/libnest';
import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import type { AnyScalarInstrument } from '@opendatacapture/runtime-core';
import type { User } from '@prisma/client';
import nodemailer from 'nodemailer';

import { InstrumentsService } from '@/instruments/instruments.service';
import { AssignmentsService } from '@/assignments/assignments.service';

const FOLLOWUP_DELAY_MS = 10 * 7 * 24 * 60 * 60 * 1000;
const FOLLOWUP_ASSIGNMENT_EXPIRY_MS = 14 * 7 * 24 * 60 * 60 * 1000;
const FOLLOWUP_WINDOW_MIN_DAYS = 76;
const FOLLOWUP_WINDOW_MAX_DAYS = 104;
const REMINDER_POLL_INTERVAL_MS = 60 * 60 * 1000;
const ORION_SELECTION_INTERNAL = {
  edition: 1,
  name: 'ORION_PR_2026_SELECTION'
} as const;
const ORION_FOLLOWUP_INTERNAL = {
  edition: 1,
  name: 'ORION_PR_2026_FOLLOWUP'
} as const;

@Injectable()
export class OrionFollowupService {
  private readonly logger = new Logger(OrionFollowupService.name);
  private reminderTimer?: NodeJS.Timeout;
  private readonly transporter: nodemailer.Transporter<nodemailer.SentMessageInfo>;

  constructor(
    @InjectModel('InstrumentRecord') private readonly instrumentRecordModel: Model<'InstrumentRecord'>,
    @InjectPrismaClient() private readonly prismaClient: ExtendedPrismaClient,
    private readonly assignmentsService: AssignmentsService,
    private readonly configService: ConfigService,
    private readonly instrumentsService: InstrumentsService
  ) {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT ?? 587),
      requireTLS: process.env.MAIL_SECURE !== 'true',
      secure: process.env.MAIL_SECURE === 'true',
      auth: {
        pass: process.env.MAIL_PASSWORD,
        user: process.env.MAIL_USER
      },
      tls: {
        rejectUnauthorized: process.env.MAIL_TLS_REJECT_UNAUTHORIZED !== 'false',
        servername: process.env.MAIL_TLS_SERVERNAME ?? process.env.MAIL_HOST
      }
    });
  }

  onModuleInit() {
    void this.sendDueReminders();
    this.reminderTimer = setInterval(() => void this.sendDueReminders(), REMINDER_POLL_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.reminderTimer) {
      clearInterval(this.reminderTimer);
    }
  }

  async validateFollowup({
    followupData,
    groupId,
    instrument,
    subjectId,
    userCode
  }: {
    followupData: Record<string, unknown>;
    groupId?: string;
    instrument: AnyScalarInstrument;
    subjectId: string;
    userCode: string;
  }): Promise<string | undefined> {
    if (!this.isFollowupInstrument(instrument)) {
      return undefined;
    }

    const selectionInstrumentId = this.instrumentsService.generateScalarInstrumentId({
      internal: ORION_SELECTION_INTERNAL
    });
    const selectionRecords = await this.instrumentRecordModel.findMany({
      orderBy: { createdAt: 'desc' },
      where: { groupId: groupId ?? null, instrumentId: selectionInstrumentId, subjectId }
    });
    const selectionRecord = selectionRecords.find((record) => {
      const selectionData = record.data as Record<string, unknown> | null;
      return typeof selectionData?.user_code === 'string' && selectionData.user_code.trim() === userCode.trim();
    });
    const selectionData = selectionRecord?.data as Record<string, unknown> | null;

    if (!selectionRecord || !selectionData) {
      throw new UnprocessableEntityException(
        'La visita de selección ORION debe estar completada para este código de paciente.'
      );
    }

    if (followupData.continues_study === 'si') {
      const selectionVisitDate = this.parseInstrumentDate(selectionData.selection_visit_date);
      const followupDate = this.parseInstrumentDate(followupData.followup_date);
      if (!selectionVisitDate || !followupDate) {
        throw new UnprocessableEntityException(
          'No se puede verificar la ventana de seguimiento sin las fechas de selección y seguimiento.'
        );
      }

      const elapsedDays = (followupDate.getTime() - selectionVisitDate.getTime()) / (24 * 60 * 60 * 1000);
      if (elapsedDays < FOLLOWUP_WINDOW_MIN_DAYS || elapsedDays > FOLLOWUP_WINDOW_MAX_DAYS) {
        throw new UnprocessableEntityException(
          'La visita de seguimiento debe realizarse entre 76 y 104 días después de la visita de selección.'
        );
      }
    }

    return selectionRecord.id;
  }

  private parseInstrumentDate(value: unknown) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }
    if (typeof value !== 'string') {
      return undefined;
    }
    const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());
    if (!match) {
      return undefined;
    }
    const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 12);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  async scheduleReminder({
    groupId,
    instrument,
    investigator,
    selectionData,
    selectionRecordId,
    subjectId,
    userCode
  }: {
    groupId?: string;
    instrument: AnyScalarInstrument;
    investigator?: User;
    selectionData: Record<string, unknown>;
    selectionRecordId: string;
    subjectId: string;
    userCode: string;
  }) {
    if (!this.isSelectionInstrument(instrument) || !userCode.trim() || !this.isEligibleSelection(selectionData)) {
      return;
    }

    try {
      const reminderClient = this.reminderClient;
      if (!reminderClient) {
        this.logger.warn('Skipping ORION reminder persistence because reminder client is unavailable.');
      } else {
        await reminderClient.upsert({
          create: {
            dueAt: new Date(Date.now() + FOLLOWUP_DELAY_MS),
            investigatorEmail: investigator?.email,
            investigatorName: investigator
              ? `${investigator.firstName} ${investigator.lastName}`.trim()
              : 'Investigador',
            selectionRecordId,
            subjectId,
            userCode: userCode.trim()
          },
          update: {},
          where: { selectionRecordId }
        });
      }

      if (this.configService.get('GATEWAY_ENABLED') !== true) {
        return;
      }

      const followupInstrumentId = this.instrumentsService.generateScalarInstrumentId({
        internal: ORION_FOLLOWUP_INTERNAL
      });
      const existingAssignment = await this.prismaClient.assignment.findFirst({
        where: {
          instrumentId: followupInstrumentId,
          subjectId,
          status: 'OUTSTANDING'
        }
      });
      if (!existingAssignment) {
        await this.assignmentsService.create({
          expiresAt: new Date(Date.now() + FOLLOWUP_ASSIGNMENT_EXPIRY_MS),
          groupId,
          instrumentId: followupInstrumentId,
          subjectId
        });
      }
    } catch (error) {
      this.logger.error(`ORION reminder/assignment side effect failed: ${String(error)}`);
    }
  }

  async completeFollowup({
    followupRecordId,
    selectionRecordId
  }: {
    followupRecordId: string;
    selectionRecordId?: string;
  }) {
    if (!selectionRecordId) {
      return;
    }
    const reminderClient = this.reminderClient;
    if (!reminderClient) {
      return;
    }
    try {
      await reminderClient.updateMany({
        data: { completedAt: new Date(), followupRecordId, status: 'COMPLETE' },
        where: { selectionRecordId }
      });
    } catch (error) {
      this.logger.error(`Failed to complete ORION follow-up reminder state: ${String(error)}`);
    }
  }

  private async sendDueReminders() {
    if (!process.env.MAIL_HOST || !process.env.MAIL_USER || !process.env.MAIL_PASSWORD) {
      return;
    }

    const reminderClient = this.reminderClient;
    if (!reminderClient) {
      return;
    }

    const reminders = await reminderClient.findMany({
      where: {
        dueAt: { lte: new Date() },
        investigatorEmail: { not: null },
        status: 'PENDING'
      }
    });

    for (const reminder of reminders) {
      if (!reminder.investigatorEmail) {
        continue;
      }
      try {
        await this.transporter.sendMail({
          bcc: (process.env.MAIL_AUDIT_BCC ?? process.env.MAIL_USER).trim() || undefined,
          from: process.env.MAIL_FROM ?? '"Alta Medical Services" <info@altamedicalservices.com>',
          html: this.renderReminderEmail(reminder.investigatorName, reminder.userCode),
          subject: `Recordatorio ORION: visita de seguimiento pendiente para ${reminder.userCode}`,
          to: reminder.investigatorEmail
        });
        await reminderClient.update({ data: { status: 'SENT' }, where: { id: reminder.id } });
      } catch (error) {
        this.logger.error(`Failed to send ORION reminder ${reminder.id}: ${String(error)}`);
        await reminderClient.update({
          data: { error: String(error), status: 'FAILED' },
          where: { id: reminder.id }
        });
      }
    }
  }

  private isSelectionInstrument(instrument: AnyScalarInstrument) {
    return (
      instrument.internal.name === ORION_SELECTION_INTERNAL.name &&
      instrument.internal.edition === ORION_SELECTION_INTERNAL.edition
    );
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

  private get reminderClient():
    | {
        findMany: (...args: any[]) => Promise<any[]>;
        update: (...args: any[]) => Promise<any>;
        updateMany: (...args: any[]) => Promise<any>;
        upsert: (...args: any[]) => Promise<any>;
      }
    | undefined {
    return (this.prismaClient as unknown as Record<string, any>).orionFollowupReminder;
  }

  private isFollowupInstrument(instrument: AnyScalarInstrument) {
    return (
      instrument.internal.name === ORION_FOLLOWUP_INTERNAL.name &&
      instrument.internal.edition === ORION_FOLLOWUP_INTERNAL.edition
    );
  }

  private renderReminderEmail(investigatorName: string, userCode: string) {
    return `<!doctype html>
<html lang="es"><body style="background:#f6f8fb;font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0">
  <div style="max-width:520px;margin:48px auto;background:#fff;border:1px solid #ececec;border-radius:16px;box-shadow:0 6px 32px rgba(100,100,150,.18);padding:32px 24px;color:#222">
    <div style="background:#9998fe;border-radius:8px;color:#fff;font-size:20px;font-weight:700;padding:16px;text-align:center">Alta Medical Services</div>
    <p style="font-size:17px;margin:24px 0 16px">Hola ${this.escapeHtml(investigatorName)},</p>
    <div style="background:#f6f8fb;border-radius:8px;color:#333;padding:16px">
      El paciente con código <strong>${this.escapeHtml(userCode)}</strong> requiere la visita de seguimiento de ORION-PR-2026 en breve.
    </div>
    <p style="color:#888;font-size:14px;margin-top:24px">Saludos,<br />El equipo de Alta Medical Services</p>
  </div>
</body></html>`;
  }

  private escapeHtml(value: string) {
    return value.replace(
      /[&<>'"]/g,
      (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!
    );
  }
}
