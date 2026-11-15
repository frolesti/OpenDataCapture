import { PRISMA_CLIENT_TOKEN } from '@douglasneuroinformatics/libnest';
import { Test } from '@nestjs/testing';
import { THERA_EXCLUSIONS, THERA_INCLUSIONS, THERA_NAMES, THERA_VAGINAL_ITEMS } from '@opendatacapture/schemas/thera';
import type { TheraStoredVisit } from '@opendatacapture/schemas/thera';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InstrumentsService } from '../../instruments/instruments.service';
import { OnboardingMailService } from '../../users/onboarding-mail.service';
import { renderTheraReminderEmail } from '../thera-reminder-email';
import { getTheraReminders, TheraRemindersService } from '../thera-reminders.service';

const baseline: TheraStoredVisit = {
  id: 'basal',
  visit: 'V0',
  data: {
    patient_code: 'TH-01-01',
    site_hospital: 'Hospital',
    visit_date: '2024-01-31',
    informed_consent: 'si',
    age: 18,
    eva_dryness: 5,
    eva_dyspareunia: 0,
    ...Object.fromEntries(THERA_INCLUSIONS.map((key) => [key, 'si'])),
    ...Object.fromEntries(THERA_EXCLUSIONS.map((key) => [key, 'no'])),
    ...Object.fromEntries(THERA_VAGINAL_ITEMS.map((key) => [key, 3]))
  }
};
const recipient = {
  username: 'investigator',
  basePermissionLevel: 'STANDARD',
  groupIds: ['thera'],
  firstName: 'María',
  lastName: 'García',
  professionalTitle: 'Dra',
  email: 'investigator@example.test'
};

describe('THERA reminder windows and email', () => {
  it.each([
    ['2024-02-14', undefined],
    ['2024-02-15', 'advance'],
    ['2024-02-21', 'advance'],
    ['2024-02-22', 'open'],
    ['2024-03-07', 'open'],
    ['2024-03-08', undefined]
  ] as const)('selects the correct stage on %s', (today, stage) => {
    const reminders = getTheraReminders([baseline], today);
    expect(reminders.length).toBe(stage ? 1 : 0);
    if (stage)
      expect(reminders[0]).toMatchObject({
        stage,
        visit: 'V1',
        window: { min: '2024-02-22', max: '2024-03-07' }
      });
  });

  it('uses the actual V1 date for subsequent visits and waits for all predecessors', () => {
    const first: TheraStoredVisit = {
      id: 'first',
      visit: 'V1',
      data: { patient_code: 'TH-01-01', visit_date: '2024-03-03' }
    };
    expect(getTheraReminders([baseline, first], '2024-05-13')[0]).toMatchObject({ visit: 'V2', stage: 'advance' });
    expect(getTheraReminders([baseline, first], '2024-08-06')).toEqual([]);
    expect(getTheraReminders([{ ...baseline, data: { ...baseline.data, exclusion_1: 'si' } }], '2024-02-22')).toEqual(
      []
    );
    expect(
      getTheraReminders([baseline, { id: 'fourth', visit: 'V4', data: { patient_code: 'TH-01-01' } }], '2024-02-22')
    ).toEqual([]);
  });

  it('renders both Spanish email stages with escaped names, day-first dates and no clinical responses', () => {
    for (const stage of ['advance', 'open'] as const) {
      const html = renderTheraReminderEmail({
        ...recipient,
        firstName: '<María>',
        patientCode: 'TH-01-01',
        visit: 'V1',
        stage,
        window: { min: '2024-02-22', max: '2024-03-07' }
      });
      expect(html).toContain('&lt;María&gt;');
      expect(html).toContain('Estimada Dra. &lt;María&gt; García:');
      expect(html).toContain('22/02/2024');
      expect(html).toContain('07/03/2024');
      expect(html).toContain('src="cid:logo-alta"');
      expect(html).toContain('https://altahealthdata.com/auth/login');
      expect(html).not.toContain('eva_dryness');
      expect(html).toContain(
        stage === 'advance' ? 'primera visita se abre el 22/02/2024' : 'primera visita está abierta hasta el 07/03/2024'
      );
      expect(html.split(/\s+/).length).toBeLessThan(180);
    }
  });
});

describe('persistent THERA reminder delivery', () => {
  let service: TheraRemindersService;
  const state = new Map<string, { sentAt: Date | null; claimedAt: Date | null; error: string | null }>();
  const sendStudyReminder = vi.fn();
  const findUser = vi.fn();
  const reminders = {
    upsert: vi.fn(async ({ where }: { where: { id: string } }) => {
      if (!state.has(where.id)) state.set(where.id, { sentAt: null, claimedAt: null, error: null });
      return state.get(where.id);
    }),
    updateMany: vi.fn(async ({ where, data }: { where: { id: string }; data: { claimedAt: Date } }) => {
      const entry = state.get(where.id)!;
      if (entry.sentAt || (entry.claimedAt && entry.claimedAt.getTime() >= Date.now() - 15 * 60 * 1000))
        return { count: 0 };
      entry.claimedAt = data.claimedAt;
      return { count: 1 };
    }),
    update: vi.fn(
      async ({ where, data }: { where: { id: string }; data: Partial<{ sentAt: Date; error: string | null }> }) => {
        Object.assign(state.get(where.id)!, data);
        return state.get(where.id);
      }
    )
  };

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2024-02-15T08:00:00Z'));
    state.clear();
    vi.clearAllMocks();
    sendStudyReminder.mockResolvedValue({ messageId: 'test' });
    findUser.mockResolvedValue(recipient);
    const module = await Test.createTestingModule({
      providers: [
        TheraRemindersService,
        {
          provide: PRISMA_CLIENT_TOKEN,
          useValue: {
            instrumentRecord: {
              findMany: vi.fn().mockResolvedValue([
                {
                  id: baseline.id,
                  instrumentId: 'basal-instrument',
                  groupId: 'thera',
                  subjectId: 'subject',
                  session: { userId: 'investigator' },
                  data: baseline.data
                }
              ])
            },
            user: { findUnique: findUser },
            theraVisitReminder: reminders
          }
        },
        {
          provide: InstrumentsService,
          useValue: {
            find: vi.fn().mockResolvedValue([
              {
                id: 'basal-instrument',
                kind: 'FORM',
                internal: { name: THERA_NAMES.V0 }
              }
            ])
          }
        },
        { provide: OnboardingMailService, useValue: { sendStudyReminder } }
      ]
    }).compile();
    service = module.get(TheraRemindersService);
  });
  afterEach(() => vi.useRealTimers());

  it('sends once before opening and once when open despite repeated polling', async () => {
    await service.processDueReminders();
    await service.processDueReminders();
    expect(sendStudyReminder).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date('2024-02-22T08:00:00Z'));
    await service.processDueReminders();
    await service.processDueReminders();
    expect(sendStudyReminder).toHaveBeenCalledTimes(2);
    expect(state.size).toBe(2);
    expect([...state.values()].every((entry) => entry.sentAt !== null)).toBe(true);
  });

  it('records an SMTP failure and retries it on the next poll without marking it sent', async () => {
    sendStudyReminder.mockRejectedValueOnce(new Error('SMTP unavailable'));
    await service.processDueReminders();
    expect([...state.values()][0]).toMatchObject({ sentAt: null, error: 'Error: SMTP unavailable' });
    vi.setSystemTime(new Date('2024-02-15T08:16:00Z'));
    await service.processDueReminders();
    expect(sendStudyReminder).toHaveBeenCalledTimes(2);
    expect([...state.values()][0]?.sentAt).not.toBeNull();
  });

  it.each([
    { ...recipient, groupIds: [] },
    { ...recipient, email: null },
    { ...recipient, username: 'admin' }
  ])('does not mail an unassigned, missing-email or admin account', async (user) => {
    findUser.mockResolvedValue(user);
    await service.processDueReminders();
    expect(sendStudyReminder).not.toHaveBeenCalled();
  });
});
