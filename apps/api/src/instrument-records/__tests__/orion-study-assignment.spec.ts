import { getModelToken } from '@douglasneuroinformatics/libnest';
import { replacer } from '@douglasneuroinformatics/libjs';
import type { Model } from '@douglasneuroinformatics/libnest';
import { MockFactory, type MockedInstance } from '@douglasneuroinformatics/libnest/testing';
import { Test } from '@nestjs/testing';
import type { User } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
import {
  THERA_EXCLUSIONS,
  THERA_INCLUSIONS,
  THERA_NAMES,
  THERA_VAGINAL_ITEMS,
  THERA_VISIT_ORDER
} from '@opendatacapture/schemas/thera';
import type { TheraVisit } from '@opendatacapture/schemas/thera';

describe('ORION record assignment and atomic code persistence', () => {
  afterEach(() => vi.useRealTimers());
  let service: InstrumentRecordsService;
  let groups: MockedInstance<GroupsService>;
  let records: MockedInstance<Model<'InstrumentRecord'>>;
  let accounts: MockedInstance<Model<'User'>>;
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
    accounts = moduleRef.get(getModelToken('User'));
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
    records.findMany.mockResolvedValue([]);
    instruments.find.mockResolvedValue([
      { id: 'selection', kind: 'FORM', internal: { name: 'ORION_PR_2026_SELECTION', edition: 34 } }
    ]);
  });

  it('rejects a centre from another study before allocating any patient code', async () => {
    await expect(
      service.create({ ...input, data: { ...input.data, site_hospital: 'OMEGA centre' } }, { user })
    ).rejects.toThrow('not configured');
    expect(codes.create).not.toHaveBeenCalled();
    expect(records.create).not.toHaveBeenCalled();
  });

  it.each([null, 'OR'])('does not bypass missing or incompatible study metadata (%s) for THERA', async (studyCode) => {
    groups.findById.mockResolvedValue({
      id: 'group',
      name: 'THERA-SGM-2026',
      studyCode,
      accessibleInstrumentIds: ['selection'],
      hospitals: []
    });
    await expect(service.reserveTheraPatientCode({ groupId: 'group', user })).rejects.toThrow('THERA');
    expect(codes.preview).not.toHaveBeenCalled();
    expect(codes.create).not.toHaveBeenCalled();
  });

  function configureThera(visit: TheraVisit = 'V0') {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-14T12:00:00Z'));
    const ids = { V0: 'selection', V1: 'first', V2: 'second', V3: 'third', V4: 'fourth' };
    groups.findById.mockResolvedValue({
      id: 'orion',
      studyCode: 'TH',
      accessibleInstrumentIds: Object.values(ids),
      hospitals: ['CS Aravaca'],
      hospitalCatalog: [{ id: 'aravaca', name: 'CS Aravaca', isInternal: false }]
    });
    const instrument = {
      id: ids[visit],
      kind: 'FORM' as const,
      internal: { name: THERA_NAMES[visit], edition: 1 },
      validationSchema: z
        .object({ patient_code: z.string(), site_hospital: z.string(), visit_date: z.string() })
        .passthrough()
    };
    instruments.findById.mockResolvedValue(instrument);
    instruments.find.mockResolvedValue(
      THERA_VISIT_ORDER.map((key) => ({
        ...instrument,
        id: ids[key],
        internal: { name: THERA_NAMES[key], edition: 1 }
      }))
    );
    codes.create.mockResolvedValue('TH-01-02');
    codes.preview.mockResolvedValue('TH-01-02');
    records.findMany.mockResolvedValue([]);
    return {
      ...input,
      instrumentId: instrument.id,
      data: {
        site_hospital: 'CS Aravaca',
        patient_code: 'TH-01-01',
        visit_date: { V0: '2024-02-29', V1: '2024-02-29', V2: '2024-05-29', V3: '2024-08-29', V4: '2025-02-28' }[visit],
        first_visit_date: '2024-02-29',
        baseline_date: '2024-01-31'
      }
    };
  }

  const theraBaselineData = {
    patient_code: 'TH-01-01',
    site_hospital: 'CS Aravaca',
    visit_date: '2024-01-31',
    informed_consent: 'si',
    age: 18,
    eva_dryness: 5,
    eva_dyspareunia: 0,
    ...Object.fromEntries(THERA_INCLUSIONS.map((key) => [key, 'si'])),
    ...Object.fromEntries(THERA_EXCLUSIONS.map((key) => [key, 'no'])),
    ...Object.fromEntries(THERA_VAGINAL_ITEMS.map((key) => [key, 3]))
  };

  it.each(['V3', 'V4'] as const)('rejects skipped predecessors in %s create, CSV and edit requests', async (visit) => {
    const data = configureThera(visit);
    records.findMany.mockResolvedValue([
      { id: 'baseline', instrumentId: 'selection', data: theraBaselineData },
      {
        id: 'first',
        instrumentId: 'first',
        data: {
          ...data.data,
          visit_date: '2024-02-29'
        }
      }
    ]);
    await expect(service.create(data, { user })).rejects.toThrow('V2');
    await expect(
      service.upload(
        {
          groupId: 'orion',
          instrumentId: data.instrumentId,
          records: [{ data: data.data, date: new Date(), subjectId: 'subject' }]
        },
        { user }
      )
    ).rejects.toThrow('V2');
    records.findFirst.mockResolvedValue({
      id: 'existing',
      instrumentId: data.instrumentId,
      groupId: 'orion',
      subjectId: 'subject',
      data: data.data,
      session: { userId: user.id }
    });
    await expect(service.updateById('existing', {}, { user })).rejects.toThrow('V2');
    expect(records.create).not.toHaveBeenCalled();
    expect(records.createMany).not.toHaveBeenCalled();
    expect(records.update).not.toHaveBeenCalled();
  });

  it('accepts the fourth visit only with the full preceding sequence', async () => {
    const data = configureThera('V4');
    vi.setSystemTime(new Date('2025-02-28T12:00:00Z'));
    records.findMany.mockResolvedValue([
      { id: 'baseline', instrumentId: 'selection', data: theraBaselineData },
      ...[
        ['first', '2024-02-29'],
        ['second', '2024-05-29'],
        ['third', '2024-08-29']
      ].map(([instrumentId, date]) => ({
        id: instrumentId,
        instrumentId,
        data: { ...data.data, visit_date: date }
      }))
    ]);
    await expect(service.create(data, { user })).resolves.toBeDefined();
    expect(records.create).toHaveBeenCalledOnce();
  });

  it('rejects deleting a second visit that is required by an already saved third visit', async () => {
    const data = configureThera('V2');
    records.findFirst.mockResolvedValue({
      id: 'second',
      instrumentId: 'second',
      groupId: 'orion',
      subjectId: 'subject',
      data: data.data,
      session: { userId: user.id }
    });
    records.findMany.mockResolvedValue([
      { id: 'baseline', instrumentId: 'selection', data: theraBaselineData },
      { id: 'first', instrumentId: 'first', data: { ...data.data, visit_date: '2024-02-29' } },
      { id: 'second', instrumentId: 'second', data: data.data },
      { id: 'third', instrumentId: 'third', data: { ...data.data, visit_date: '2024-08-29' } }
    ]);
    await expect(service.deleteById('second', { user })).rejects.toThrow('V2');
    expect(records.delete).not.toHaveBeenCalled();
  });

  it('keeps clinical sequencing enforced when an administrator submits a visible test form', async () => {
    const data = configureThera('V3');
    user.basePermissionLevel = 'ADMIN';
    records.findMany.mockResolvedValue([
      { id: 'baseline', instrumentId: 'selection', data: theraBaselineData },
      { id: 'first', instrumentId: 'first', data: { ...data.data, visit_date: '2024-02-29' } }
    ]);
    await expect(service.create(data, { user })).rejects.toThrow('V2');
  });

  it('only allows administrators to persist explicitly marked future/out-of-window THERA tests', async () => {
    const data = configureThera('V1');
    const marked = { ...data, data: { ...data.data, visit_date: '2099-01-01', _thera_test_dates: true } };
    records.findMany.mockResolvedValue([{ id: 'baseline', instrumentId: 'selection', data: theraBaselineData }]);
    await expect(service.create(marked, { user })).rejects.toThrow('Solo un administrador');
    expect(records.create).not.toHaveBeenCalled();
    await expect(
      service.upload(
        {
          groupId: data.groupId,
          instrumentId: data.instrumentId,
          records: [{ data: marked.data, date: new Date(), subjectId: data.subjectId }]
        },
        { user }
      )
    ).rejects.toThrow('Solo un administrador');

    user.basePermissionLevel = 'ADMIN';
    await expect(service.create(marked, { user })).resolves.toBeDefined();
    expect(records.create).toHaveBeenCalled();
    records.create.mockClear();
    await expect(
      service.create({ ...marked, data: { ...marked.data, _thera_test_dates: false } }, { user })
    ).rejects.toThrow('futura');
    expect(records.create).not.toHaveBeenCalled();
  });

  it('offers administrators every group hospital while keeping investigators assigned to their own centre', async () => {
    const data = configureThera();
    groups.findById.mockResolvedValue({
      id: data.groupId,
      studyCode: 'TH',
      accessibleInstrumentIds: ['selection'],
      hospitals: ['CS Aravaca', 'Hospital de prueba'],
      hospitalCatalog: [
        { id: 'aravaca', name: 'CS Aravaca', isInternal: false },
        { id: 'other', name: 'Hospital de prueba', isInternal: false }
      ]
    });
    const otherHospital = { ...data, data: { ...data.data, site_hospital: 'Hospital de prueba' } };
    await expect(service.create(otherHospital, { user })).rejects.toThrow('not configured');
    user.basePermissionLevel = 'ADMIN';
    await expect(service.create(otherHospital, { user })).resolves.toBeDefined();
    records.findFirst.mockResolvedValue({
      id: 'baseline',
      instrumentId: data.instrumentId,
      subjectId: data.subjectId,
      groupId: data.groupId,
      data: data.data,
      session: { userId: user.id }
    });
    await service.updateById('baseline', otherHospital.data, { user });
    expect(records.update).toHaveBeenCalled();
    await expect(
      service.updateById('baseline', { ...otherHospital.data, site_hospital: 'Unknown' }, { user })
    ).rejects.toThrow('not configured');
  });

  it('previews a THERA code only for a TH study', async () => {
    configureThera();
    expect(await service.reserveTheraPatientCode({ groupId: 'orion', user })).toEqual({ code: 'TH-01-02' });
    expect(codes.preview).toHaveBeenCalledWith('orion', user.id, 'TH');
    expect(codes.create).not.toHaveBeenCalled();
    groups.findById.mockResolvedValueOnce({ id: 'orion', studyCode: 'OR' });
    await expect(service.reserveTheraPatientCode({ groupId: 'orion', user })).rejects.toThrow('THERA');
  });

  it('rejects new records, edits and CSV imports for the retired independent finalization form', async () => {
    const data = configureThera('V1');
    instruments.findById.mockResolvedValue({
      id: 'retired',
      kind: 'FORM',
      internal: { name: 'THERA_SGM_2026_END', edition: 1 },
      validationSchema: z.object({}).passthrough()
    });
    await expect(service.create({ ...data, instrumentId: 'retired' }, { user })).rejects.toThrow('se ha retirado');
    await expect(
      service.upload(
        {
          groupId: 'orion',
          instrumentId: 'retired',
          records: [{ data: data.data, date: new Date(), subjectId: 'subject' }]
        },
        { user }
      )
    ).rejects.toThrow('se ha retirado');
    records.findFirst.mockResolvedValue({
      id: 'retired-record',
      instrumentId: 'retired',
      groupId: 'orion',
      data: data.data,
      session: { userId: user.id }
    });
    await expect(service.updateById('retired-record', {}, { user })).rejects.toThrow('se ha retirado');
    expect(records.create).not.toHaveBeenCalled();
    expect(records.createMany).not.toHaveBeenCalled();
    expect(records.update).not.toHaveBeenCalled();
  });

  it('blocks new follow-up submissions after the fourth visit completes the study', async () => {
    const data = configureThera('V1');
    instruments.find.mockResolvedValue([
      { id: 'selection', internal: { name: THERA_NAMES.V0, edition: 1 } },
      { id: 'first', internal: { name: THERA_NAMES.V1, edition: 1 } },
      { id: 'fourth', internal: { name: THERA_NAMES.V4, edition: 1 } }
    ]);
    records.findMany.mockResolvedValue([
      { id: 'baseline', instrumentId: 'selection', data: theraBaselineData },
      { id: 'completed', instrumentId: 'fourth', data: { ...data.data, visit_date: '2025-02-28' } }
    ]);
    await expect(service.create(data, { user })).rejects.toThrow('completado');
    expect(records.create).not.toHaveBeenCalled();
  });

  it('preserves the manually entered THERA code without allocating one', async () => {
    const data = configureThera();
    data.data.patient_code = 'centre/patient 7';
    await service.create(data, { user });
    expect(records.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ data: expect.objectContaining({ patient_code: 'centre/patient 7' }) })
    });
    expect(codes.create).not.toHaveBeenCalled();
    expect(codes.preview).not.toHaveBeenCalled();
  });

  it('rejects duplicate manually entered THERA baselines across editions', async () => {
    const data = configureThera();
    records.findMany.mockResolvedValue([{ id: 'existing', instrumentId: 'selection', data: data.data }]);
    await expect(service.create(data, { user })).rejects.toThrow('Ya existe');
    expect(records.create).not.toHaveBeenCalled();
  });

  it.each(['', '   '])('rejects empty THERA codes before writing a record (%j)', async (patient_code) => {
    const data = configureThera();
    await expect(service.create({ ...data, data: { ...data.data, patient_code } }, { user })).rejects.toThrow(
      'Código de paciente'
    );
    expect(records.create).not.toHaveBeenCalled();
  });

  it('rejects THERA follow-up without eligible baseline, including direct API calls', async () => {
    const data = configureThera('V1');
    await expect(service.create(data, { user })).rejects.toThrow('basal apta');
    records.findMany.mockResolvedValue([
      { id: 'baseline', instrumentId: 'selection', data: { ...theraBaselineData, exclusion_1: 'si' } }
    ]);
    await expect(service.create(data, { user })).rejects.toThrow('basal apta');
    expect(records.create).not.toHaveBeenCalled();
  });

  it('validates THERA saved dates rather than trusting client-supplied anchors', async () => {
    const data = configureThera('V1');
    records.findMany.mockResolvedValue([{ id: 'baseline', instrumentId: 'selection', data: theraBaselineData }]);
    await expect(
      service.create({ ...data, data: { ...data.data, baseline_date: '2024-02-01' } }, { user })
    ).rejects.toThrow('basal');
    await expect(
      service.create({ ...data, data: { ...data.data, visit_date: '2024-03-08' } }, { user })
    ).rejects.toThrow('entre');
    vi.setSystemTime(new Date('2024-02-29T12:00:00Z'));
    await service.create(data, { user });
    expect(records.create).toHaveBeenCalledTimes(1);
    expect(codes.create).not.toHaveBeenCalled();
  });

  it('preserves manual THERA baseline codes in CSV uploads and rejects duplicates', async () => {
    const data = configureThera();
    data.data.patient_code = 'centre/patient 7';
    const upload = {
      groupId: 'orion',
      instrumentId: 'selection',
      records: [{ data: data.data, date: new Date(), subjectId: 'subject' }]
    };
    await service.upload(upload, { user });
    expect(records.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ data: expect.objectContaining({ patient_code: 'centre/patient 7' }) })]
    });
    expect(codes.create).not.toHaveBeenCalled();
    records.createMany.mockClear();
    await expect(
      service.upload({ ...upload, records: [...upload.records, ...upload.records] }, { user })
    ).rejects.toThrow('más de una visita');
    records.findMany.mockResolvedValue([{ id: 'existing', instrumentId: 'selection', data: data.data }]);
    await expect(service.upload(upload, { user })).rejects.toThrow('Ya existe');
    expect(records.createMany).not.toHaveBeenCalled();
  });

  it('does not confuse subject separators with characters in a free-text THERA code during import', async () => {
    const data = configureThera();
    await service.upload(
      {
        groupId: 'orion',
        instrumentId: 'selection',
        records: [
          { data: { ...data.data, patient_code: 'b:c' }, date: new Date(), subjectId: 'a' },
          { data: { ...data.data, patient_code: 'c' }, date: new Date(), subjectId: 'a:b' }
        ]
      },
      { user }
    );
    expect(records.createMany).toHaveBeenCalledWith({ data: expect.any(Array) });
  });

  it('rejects editing a THERA anchor when that would invalidate an existing follow-up', async () => {
    configureThera();
    records.findFirst.mockResolvedValue({
      id: 'baseline',
      instrumentId: 'selection',
      groupId: 'orion',
      subjectId: 'subject',
      data: { ...theraBaselineData },
      session: { userId: user.id }
    });
    records.findMany.mockResolvedValue([
      { id: 'baseline', instrumentId: 'selection', data: theraBaselineData },
      {
        id: 'followup',
        instrumentId: 'first',
        data: {
          patient_code: 'TH-01-01',
          site_hospital: 'CS Aravaca',
          visit_date: '2024-02-29',
          baseline_date: '2024-01-31'
        }
      }
    ]);
    await expect(service.updateById('baseline', { visit_date: '2024-01-30' }, { user })).rejects.toThrow('invalidaría');
    expect(records.update).not.toHaveBeenCalled();
  });

  it('rejects deleting a THERA baseline while its follow-up exists', async () => {
    configureThera();
    records.findFirst.mockResolvedValue({
      id: 'baseline',
      instrumentId: 'selection',
      groupId: 'orion',
      subjectId: 'subject',
      data: theraBaselineData,
      session: { userId: user.id }
    });

    records.findMany.mockResolvedValue([
      { id: 'baseline', instrumentId: 'selection', data: theraBaselineData },
      {
        id: 'followup',
        instrumentId: 'first',
        data: {
          patient_code: 'TH-01-01',
          site_hospital: 'CS Aravaca',
          visit_date: '2024-02-29',
          baseline_date: '2024-01-31'
        }
      }
    ]);
    await expect(service.deleteById('baseline', { user })).rejects.toThrow('No se puede eliminar');
    expect(records.delete).not.toHaveBeenCalled();
  });

  it.each(['2024-02-21', '2024-03-08'])('rejects new visits when today is outside the window (%s)', async (today) => {
    const input = configureThera('V1');
    records.findMany.mockResolvedValue([{ id: 'baseline', instrumentId: 'selection', data: theraBaselineData }]);
    vi.setSystemTime(new Date(`${today}T12:00:00Z`));
    const data = { ...input.data, visit_date: today === '2024-02-21' ? '2024-02-22' : '2024-02-29' };
    await expect(service.create({ ...input, data }, { user })).rejects.toThrow(
      today === '2024-02-21' ? 'futura' : 'hoy está fuera'
    );
    expect(records.create).not.toHaveBeenCalled();
  });

  it.each(['THERA', 'ORION'])('atomically deletes only this %s patient across historical editions', async (study) => {
    const selected = {
      id: 'basal',
      instrumentId: 'old-baseline',
      groupId: 'study',
      subjectId: 'subject',
      data: { patient_code: 'PATIENT-1' }
    };
    const reminders = { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) };
    Object.assign(transaction, { orionFollowupReminder: reminders });
    instruments.findById.mockImplementation(async (id) => ({
      id,
      kind: 'FORM',
      internal: {
        edition: 1,
        name: id === 'other-study' ? 'OTHER_STUDY' : study === 'THERA' ? THERA_NAMES.V0 : 'ORION_PR_2026_SELECTION'
      }
    }));
    records.findFirst.mockResolvedValue(selected);
    records.findMany.mockResolvedValue([
      selected,
      { ...selected, id: 'followup', instrumentId: 'old-followup', data: { user_code: 'PATIENT-1' } },
      { ...selected, id: 'other-patient', data: { patient_code: 'PATIENT-2' } },
      { ...selected, id: 'other-study', instrumentId: 'other-study' }
    ]);
    records.deleteMany.mockResolvedValue({ count: 2 });
    await service.deletePatientVisits('basal', { user });
    expect(codes.transaction).toHaveBeenCalledOnce();
    expect(records.findMany).toHaveBeenCalledWith({ where: { groupId: 'study', subjectId: 'subject' } });
    expect(records.deleteMany).toHaveBeenCalledExactlyOnceWith({
      where: { id: { in: ['basal', 'followup'] }, AND: [{}] }
    });
    if (study === 'ORION') expect(reminders.deleteMany).toHaveBeenCalledOnce();
    else expect(reminders.deleteMany).not.toHaveBeenCalled();
  });

  it('fails the whole deletion transaction if any visit is no longer deletable', async () => {
    configureThera();
    const selected = {
      id: 'basal',
      instrumentId: 'selection',
      groupId: 'orion',
      subjectId: 'subject',
      data: theraBaselineData
    };
    records.findFirst.mockResolvedValue(selected);
    records.findMany.mockResolvedValue([selected, { ...selected, id: 'followup' }]);
    records.deleteMany.mockResolvedValue({ count: 1 });
    await expect(service.deletePatientVisits('basal', { user })).rejects.toThrow('faltan permisos');
    expect(codes.transaction).toHaveBeenCalledOnce();
  });

  it('rejects out-of-window THERA CSV before creating sessions', async () => {
    const data = configureThera('V1');
    records.findMany.mockResolvedValue([{ id: 'baseline', instrumentId: 'selection', data: theraBaselineData }]);
    await expect(
      service.upload(
        {
          groupId: 'orion',
          instrumentId: 'first',
          records: [{ data: { ...data.data, visit_date: '2024-03-08' }, date: new Date(), subjectId: 'subject' }]
        },
        { user }
      )
    ).rejects.toThrow('entre');
    expect(records.createMany).not.toHaveBeenCalled();
  });

  it('accepts a reconciled OMEGA alias without rewriting the submitted centre', async () => {
    groups.findById.mockResolvedValue({
      accessibleInstrumentIds: ['selection'],
      hospitalCatalog: [
        {
          aliasKeys: ['cs aravaca'],
          id: 'aravaca',
          isInternal: false,
          name: 'CS Aravaca (Madrid)'
        }
      ],
      hospitals: ['CS Aravaca (Madrid)'],
      id: 'orion'
    });
    instruments.findById.mockResolvedValue({
      id: 'selection',
      internal: { edition: 1, name: 'ESTUDI_OSTEOPOROSIS' },
      kind: 'FORM',
      validationSchema: z.object({ CAP: z.string() })
    });
    await service.create({ ...input, data: { CAP: 'CS Aravaca' } }, { user });
    expect(records.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ data: { CAP: 'CS Aravaca' } })
    });
    expect(codes.create).not.toHaveBeenCalled();
  });

  it('does not accept an alias from a different hospital in the same catalogue', async () => {
    groups.findById.mockResolvedValue({
      accessibleInstrumentIds: ['selection'],
      hospitalCatalog: [
        { id: 'aravaca', isInternal: false, name: 'CS Aravaca' },
        { aliasKeys: ['cs avila norte'], id: 'avila', isInternal: false, name: 'CS Ávila Norte (Ávila)' }
      ],
      hospitals: ['CS Aravaca', 'CS Ávila Norte (Ávila)'],
      id: 'orion'
    });
    await expect(
      service.create({ ...input, data: { ...input.data, site_hospital: 'CS Ávila Norte' } }, { user })
    ).rejects.toThrow('not configured');
    expect(records.create).not.toHaveBeenCalled();
    expect(codes.create).not.toHaveBeenCalled();
  });

  it('rejects an unassigned form before allocating any patient code', async () => {
    groups.findById.mockResolvedValueOnce({ id: 'orion', accessibleInstrumentIds: [], hospitals: [] });
    await expect(service.create(input, { user })).rejects.toThrow('no està habilitat');
    expect(codes.create).not.toHaveBeenCalled();
  });

  it('preserves the manually entered ORION code without allocating one', async () => {
    const result = await service.create(input, { user });
    expect(codes.create).not.toHaveBeenCalled();
    expect(records.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ data: { site_hospital: 'CS Aravaca', patient_code: 'preview' } })
    });
    expect(result.data).toEqual({ patient_code: 'OR-01-01' });
  });

  it('rejects duplicate manual ORION codes, including historical user_code records', async () => {
    records.findMany.mockResolvedValue([{ id: 'existing', data: { user_code: 'preview' } }]);
    await expect(service.create(input, { user })).rejects.toThrow('Ya existe');
    expect(records.create).not.toHaveBeenCalled();
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

  it('checks current database membership when the authenticated payload has no groupIds', async () => {
    configureAdverseEvents();
    records.findFirst.mockResolvedValue({
      data: { baseline_adverse_events: 'no', patient_code: 'OR-01-01', site_hospital: 'CS Aravaca' },
      groupId: 'orion',
      id: 'record',
      instrumentId: 'selection',
      session: { userId: user.id }
    });
    Reflect.deleteProperty(user, 'groupIds');
    accounts.findUniqueOrThrow.mockResolvedValue({ ...user, groupIds: ['orion'] });

    await service.updateById('record', { baseline_adverse_events: 'no' }, { user });
    expect(records.update).toHaveBeenCalledOnce();
  });

  it('rejects editing after database membership is removed, even with an old authenticated payload', async () => {
    records.findFirst.mockResolvedValue({
      data: {},
      groupId: 'orion',
      id: 'record',
      instrumentId: 'selection',
      session: { userId: user.id }
    });
    accounts.findUniqueOrThrow.mockResolvedValue({ ...user, groupIds: [] });

    await expect(service.updateById('record', {}, { user })).rejects.toThrow('ja no està assignat');
    expect(records.update).not.toHaveBeenCalled();
  });

  it('does not allocate ORION codes against the OMEGA group', async () => {
    groups.findById.mockResolvedValueOnce({ id: 'omega', studyCode: null });
    await expect(service.reserveOrionPatientCode({ groupId: 'omega', user })).rejects.toThrow('no té configurat');
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
