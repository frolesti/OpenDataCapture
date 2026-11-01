import { getModelToken } from '@douglasneuroinformatics/libnest';
import { replacer } from '@douglasneuroinformatics/libjs';
import type { Model } from '@douglasneuroinformatics/libnest';
import { MockFactory, type MockedInstance } from '@douglasneuroinformatics/libnest/testing';
import { Test } from '@nestjs/testing';
import type { User } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod/v4';

import { AuditLogService } from '../../audit-log/audit-log.service';
import { GroupsService } from '../../groups/groups.service';
import { InstrumentsService } from '../../instruments/instruments.service';
import { OrionCodesService } from '../../orion-codes/orion-codes.service';
import type { OrionTransactionClient } from '../../orion-codes/orion-codes.service';
import { OrionFollowupService } from '../../orion-followup/orion-followup.service';
import { SessionsService } from '../../sessions/sessions.service';
import { SubjectsService } from '../../subjects/subjects.service';
import { InstrumentMeasuresService } from '../instrument-measures.service';
import { InstrumentRecordsService } from '../instrument-records.service';

describe('ORION record assignment and atomic code persistence', () => {
  let service: InstrumentRecordsService;
  let groups: MockedInstance<GroupsService>;
  let records: MockedInstance<Model<'InstrumentRecord'>>;
  let codes: MockedInstance<OrionCodesService>;
  let instruments: MockedInstance<InstrumentsService>;
  let user: User;
  let transaction: OrionTransactionClient;
  const input = {
    groupId: 'orion',
    instrumentId: 'selection',
    subjectId: 'subject',
    sessionId: 'session',
    date: new Date(),
    data: { site_hospital: 'CS Aravaca', patient_code: 'preview' }
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        InstrumentRecordsService,
        MockFactory.createForModelToken(getModelToken('InstrumentRecord')),
        MockFactory.createForModelToken(getModelToken('User')),
        MockFactory.createForService(AuditLogService),
        MockFactory.createForService(GroupsService),
        MockFactory.createForService(InstrumentMeasuresService),
        MockFactory.createForService(InstrumentsService),
        MockFactory.createForService(OrionFollowupService),
        MockFactory.createForService(SessionsService),
        MockFactory.createForService(SubjectsService),
        MockFactory.createForService(OrionCodesService)
      ]
    }).compile();
    service = moduleRef.get(InstrumentRecordsService);
    groups = moduleRef.get(GroupsService);
    records = moduleRef.get(getModelToken('InstrumentRecord'));
    codes = moduleRef.get(OrionCodesService);
    instruments = moduleRef.get(InstrumentsService);
    instruments.getInstrumentInstance.mockImplementation((instrument) => instrument);
    moduleRef.get<MockedInstance<AuditLogService>>(AuditLogService).computeChanges.mockReturnValue([]);
    moduleRef.get<MockedInstance<SessionsService>>(SessionsService).create.mockResolvedValue({ id: 'upload-session' });
    user = {
      id: 'researcher',
      username: 'researcher',
      firstName: 'Test',
      lastName: 'Researcher',
      basePermissionLevel: 'STANDARD',
      groupIds: ['orion'],
      professionalTitle: null,
      studyHospitals: [{ groupId: 'orion', hospitalId: 'aravaca' }],
      createdAt: new Date(),
      updatedAt: new Date(),
      additionalPermissions: [],
      hashedPassword: 'test-fixture',
      email: null,
      sex: null,
      dateOfBirth: null
    };
    moduleRef.get<MockedInstance<Model<'User'>>>(getModelToken('User')).findUniqueOrThrow.mockResolvedValue(user);
    groups.findById.mockResolvedValue({
      id: 'orion',
      studyCode: 'OR',
      accessibleInstrumentIds: ['selection'],
      hospitals: ['CS Aravaca'],
      hospitalCatalog: [{ id: 'aravaca', name: 'CS Aravaca', isInternal: false }]
    });
    instruments.findById.mockResolvedValue({
      id: 'selection',
      kind: 'FORM',
      internal: { name: 'ORION_PR_2026_SELECTION', edition: 34 },
      validationSchema: z.object({ site_hospital: z.string(), patient_code: z.string() })
    });
    moduleRef.get<MockedInstance<SessionsService>>(SessionsService).findById.mockResolvedValue({
      id: 'session',
      groupId: 'orion',
      subjectId: 'subject',
      userId: 'researcher'
    });
    transaction = {} as OrionTransactionClient;
    Object.assign(transaction, { instrumentRecord: records });
    codes.transaction.mockImplementation((operation) => operation(transaction));
    codes.create.mockResolvedValue('OR-01-01');
    records.create.mockResolvedValue({ id: 'record', data: { patient_code: 'OR-01-01' } });
  });

  it('rejects a centre from another study before allocating any patient code', async () => {
    await expect(
      service.create({ ...input, data: { ...input.data, site_hospital: 'OMEGA centre' } }, { user })
    ).rejects.toThrow('not configured');
    expect(codes.create).not.toHaveBeenCalled();
    expect(records.create).not.toHaveBeenCalled();
  });

  it('rejects an unassigned form before allocating any patient code', async () => {
    groups.findById.mockResolvedValueOnce({ id: 'orion', accessibleInstrumentIds: [], hospitals: [] });
    await expect(service.create(input, { user })).rejects.toThrow('no està habilitat');
    expect(codes.create).not.toHaveBeenCalled();
  });

  it('writes the final code and response in the same transaction, replacing a stale preview', async () => {
    const result = await service.create(input, { user });
    expect(codes.create).toHaveBeenCalledWith('orion', 'researcher', 'CS Aravaca', transaction);
    expect(records.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ data: { site_hospital: 'CS Aravaca', patient_code: 'OR-01-01' } })
    });
    expect(result.data).toEqual({ patient_code: 'OR-01-01' });
  });

  it('propagates a failed record write through the transaction instead of confirming the code', async () => {
    records.create.mockRejectedValueOnce(new Error('record write failed'));
    await expect(service.create(input, { user })).rejects.toThrow('record write failed');
    expect(codes.transaction).toHaveBeenCalledTimes(1);
  });

  function configureAdverseEvents(name = 'ORION_PR_2026_SELECTION') {
    instruments.findById.mockResolvedValue({
      id: 'selection',
      kind: 'FORM',
      internal: { name, edition: 33 },
      measures: null,
      validationSchema: z.object({
        site_hospital: z.string(),
        patient_code: z.string(),
        baseline_adverse_events: z.enum(['si', 'no']),
        adverse_event_records: z.array(z.object({ seriousness: z.set(z.string()).min(1) })).optional()
      })
    });
  }

  function emptySeriousness() {
    return JSON.parse(JSON.stringify(new Set(), replacer)) as Record<string, never>;
  }

  it('accepts No with a hidden empty seriousness set before allocating and saving', async () => {
    configureAdverseEvents();
    await service.create(
      {
        ...input,
        data: {
          ...input.data,
          baseline_adverse_events: 'no',
          adverse_event_records: [{ seriousness: emptySeriousness() }]
        }
      },
      { user }
    );
    const saved = records.create.mock.calls[0]?.[0].data.data;
    expect(saved).not.toHaveProperty('adverse_event_records');
    expect(saved).toHaveProperty('baseline_adverse_events', 'no');
  });

  it('still rejects Yes with empty seriousness before saving or consuming a code', async () => {
    configureAdverseEvents();
    await expect(
      service.create(
        {
          ...input,
          data: {
            ...input.data,
            baseline_adverse_events: 'si',
            adverse_event_records: [{ seriousness: emptySeriousness() }]
          }
        },
        { user }
      )
    ).rejects.toThrow('does not pass validation');
    expect(records.create).not.toHaveBeenCalled();
    expect(codes.create).not.toHaveBeenCalled();
  });

  it('removes stored hidden rows before validating a partial record edit', async () => {
    configureAdverseEvents();
    records.findFirst.mockResolvedValueOnce({
      id: 'record',
      instrumentId: 'selection',
      groupId: 'orion',
      session: { userId: user.id },
      data: {
        site_hospital: 'CS Aravaca',
        patient_code: 'OR-01-01',
        baseline_adverse_events: 'si',
        adverse_event_records: [{ seriousness: emptySeriousness() }]
      }
    });
    await service.updateById('record', { baseline_adverse_events: 'no' }, { user });
    expect(records.update).toHaveBeenCalled();
    expect(records.update.mock.calls[0]?.[0].data.data).not.toHaveProperty('adverse_event_records');
  });

  it('removes hidden rows before upload schema validation', async () => {
    configureAdverseEvents();
    await service.upload(
      {
        groupId: 'orion',
        instrumentId: 'selection',
        records: [
          {
            subjectId: input.subjectId,
            date: input.date,
            data: {
              ...input.data,
              baseline_adverse_events: 'no',
              adverse_event_records: [{ seriousness: emptySeriousness() }]
            }
          }
        ]
      },
      { user }
    );
    expect(records.createMany).toHaveBeenCalled();
    const saved = records.createMany.mock.calls[0]?.[0].data;
    expect(saved).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ data: expect.not.objectContaining({ adverse_event_records: expect.anything() }) })
      ])
    );
  });

  it('does not allocate ORION codes against the OMEGA group', async () => {
    groups.findById.mockResolvedValueOnce({ id: 'omega', studyCode: null });
    await expect(service.reserveOrionPatientCode({ groupId: 'omega', user })).rejects.toThrow('no correspon');
    expect(codes.preview).not.toHaveBeenCalled();
  });

  it('keeps generic forms working in groups without a centre catalogue', async () => {
    groups.findById.mockResolvedValueOnce({
      id: 'orion',
      accessibleInstrumentIds: ['selection'],
      hospitals: []
    });
    instruments.findById.mockResolvedValueOnce({
      id: 'selection',
      kind: 'FORM',
      internal: { name: 'GENERIC_FORM', edition: 1 },
      validationSchema: z.object({ answer: z.string() })
    });
    await service.create({ ...input, data: { answer: 'yes' } }, { user });
    expect(records.create).toHaveBeenCalled();
    expect(codes.create).not.toHaveBeenCalled();
  });

  it('rejects uploads from another assigned group centre before writing any records', async () => {
    groups.findById.mockResolvedValueOnce({
      id: 'orion',
      accessibleInstrumentIds: ['selection'],
      hospitals: ['CS Aravaca', 'Other centre'],
      hospitalCatalog: [
        { id: 'aravaca', name: 'CS Aravaca', isInternal: false },
        { id: 'other', name: 'Other centre', isInternal: false }
      ]
    });
    await expect(
      service.upload(
        {
          groupId: 'orion',
          instrumentId: 'selection',
          records: [{ subjectId: 'subject', date: input.date, data: { site_hospital: 'Other centre' } }]
        },
        { user }
      )
    ).rejects.toThrow('not configured');
    expect(records.createMany).not.toHaveBeenCalled();
    expect(codes.create).not.toHaveBeenCalled();
  });
});
