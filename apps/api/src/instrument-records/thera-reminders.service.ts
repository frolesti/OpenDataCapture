import { createHash } from 'node:crypto';

import { InjectPrismaClient } from '@douglasneuroinformatics/libnest';
import type { ExtendedPrismaClient } from '@douglasneuroinformatics/libnest';
import { Injectable, Logger } from '@nestjs/common';
import {
  canStartTheraVisit,
  getTheraVisit,
  isTheraPatientCode,
  parseTheraDate,
  THERA_VISIT_ORDER,
  theraPatientVisitWindow,
  theraToday
} from '@opendatacapture/schemas/thera';
import type { TheraStoredVisit } from '@opendatacapture/schemas/thera';

import { InstrumentsService } from '@/instruments/instruments.service';
import { OnboardingMailService } from '@/users/onboarding-mail.service';

import { renderTheraReminderEmail } from './thera-reminder-email';
import type { TheraReminderEmailData } from './thera-reminder-email';

const POLL_INTERVAL_MS = 15 * 60 * 1000;

export function getTheraReminders(records: TheraStoredVisit[], today = theraToday()) {
  const reminders: Pick<TheraReminderEmailData, 'patientCode' | 'visit' | 'stage' | 'window'>[] = [];
  for (const patientCode of new Set(records.map((record) => record.data.patient_code).filter(isTheraPatientCode))) {
    const visit = THERA_VISIT_ORDER.find((entry) => entry !== 'V0' && canStartTheraVisit(entry, records, patientCode));
    if (!visit) continue;
    const window = theraPatientVisitWindow(visit, records, patientCode);
    if (!window || today > window.max) continue;
    const advance = parseTheraDate(window.min)!;
    advance.setUTCDate(advance.getUTCDate() - 7);
    if (today < advance.toISOString().slice(0, 10)) continue;
    reminders.push({ patientCode, visit, window, stage: today < window.min ? 'advance' : 'open' });
  }
  return reminders;
}

@Injectable()
export class TheraRemindersService {
  private readonly logger = new Logger(TheraRemindersService.name);
  private timer?: NodeJS.Timeout;
  private processing = false;

  constructor(
    @InjectPrismaClient() private readonly prisma: ExtendedPrismaClient,
    private readonly instrumentsService: InstrumentsService,
    private readonly mailService: OnboardingMailService
  ) {}

  onApplicationBootstrap() {
    const poll = () =>
      void this.processDueReminders().catch((error: unknown) => {
        this.logger.error(`THERA reminder polling failed: ${String(error)}`);
      });
    this.timer = setInterval(poll, POLL_INTERVAL_MS);
    poll();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async processDueReminders() {
    if (this.processing) return;
    this.processing = true;
    try {
      const instruments = await this.instrumentsService.find({ kind: 'FORM' });
      const visits = new Map(
        instruments.flatMap((instrument) => {
          const visit = getTheraVisit(instrument.internal.name);
          return visit ? [[instrument.id, visit] as const] : [];
        })
      );
      if (!visits.size) return;
      const records = await this.prisma.instrumentRecord.findMany({
        where: { instrumentId: { in: [...visits.keys()] }, group: { studyCode: 'TH' } },
        include: { session: { select: { userId: true } } }
      });
      const patients = new Map<
        string,
        { groupId: string; subjectId: string; userId: string; records: TheraStoredVisit[] }
      >();
      for (const record of records) {
        const visit = visits.get(record.instrumentId);
        if (
          !visit ||
          !record.groupId ||
          !record.session.userId ||
          !record.data ||
          typeof record.data !== 'object' ||
          Array.isArray(record.data)
        )
          continue;
        const data = Object.fromEntries(Object.entries(record.data));
        if (!isTheraPatientCode(data.patient_code)) {
          this.logger.warn(`Cannot schedule THERA record '${record.id}': missing patient code.`);
          continue;
        }
        const key = JSON.stringify([record.groupId, record.subjectId, record.session.userId, data.patient_code]);
        const patient = patients.get(key) ?? {
          groupId: record.groupId,
          subjectId: record.subjectId,
          userId: record.session.userId,
          records: []
        };
        patient.records.push({ id: record.id, visit, data });
        patients.set(key, patient);
      }
      for (const patient of patients.values()) {
        const reminders = getTheraReminders(patient.records);
        if (!reminders.length) continue;
        const investigator = await this.prisma.user.findUnique({ where: { id: patient.userId } });
        if (
          !investigator ||
          investigator.username === 'admin' ||
          !investigator.email ||
          investigator.basePermissionLevel !== 'STANDARD' ||
          !investigator.groupIds.includes(patient.groupId)
        )
          continue;
        for (const reminder of reminders) {
          const id = createHash('sha256')
            .update(
              JSON.stringify([
                patient.groupId,
                patient.subjectId,
                patient.userId,
                reminder.patientCode,
                reminder.visit,
                reminder.stage,
                reminder.window.min,
                reminder.window.max
              ])
            )
            .digest('hex');
          await this.prisma.theraVisitReminder.upsert({
            where: { id },
            create: { id, sentAt: null, claimedAt: null, error: null },
            update: {}
          });
          const now = new Date();
          const claimed = await this.prisma.theraVisitReminder.updateMany({
            where: {
              id,
              sentAt: null,
              OR: [{ claimedAt: null }, { claimedAt: { lt: new Date(now.getTime() - POLL_INTERVAL_MS) } }]
            },
            data: { claimedAt: now, error: null }
          });
          if (!claimed.count) continue;
          try {
            await this.mailService.sendStudyReminder({
              email: investigator.email,
              subject: `THERA-SGM-2026: ${reminder.visit} ${reminder.stage === 'advance' ? 'próxima apertura' : 'periodo abierto'}`,
              html: renderTheraReminderEmail({ ...investigator, ...reminder })
            });
          } catch (error) {
            this.logger.error(`THERA reminder '${id}' failed: ${String(error)}`);
            await this.prisma.theraVisitReminder.update({ where: { id }, data: { error: String(error) } });
            continue;
          }
          await this.prisma.theraVisitReminder.update({ where: { id }, data: { sentAt: new Date(), error: null } });
        }
      }
    } finally {
      this.processing = false;
    }
  }
}
