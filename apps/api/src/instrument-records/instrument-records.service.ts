import { replacer, reviver, yearsPassed } from '@douglasneuroinformatics/libjs';
import { accessibleQuery, InjectModel } from '@douglasneuroinformatics/libnest';
import type { Model } from '@douglasneuroinformatics/libnest';
import { linearRegression } from '@douglasneuroinformatics/libstats';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException
} from '@nestjs/common';
import type { Json, ScalarInstrument } from '@opendatacapture/runtime-core';
import { DEFAULT_GROUP_NAME } from '@opendatacapture/schemas/core';
import { hospitalMatchesName } from '@opendatacapture/schemas/group';
import type { HospitalOption } from '@opendatacapture/schemas/group';
import { $RecordArrayFieldValue } from '@opendatacapture/schemas/instrument';
import type {
  CreateInstrumentRecordData,
  InstrumentRecord,
  InstrumentRecordQueryParams,
  InstrumentRecordsExport,
  LinearRegressionResults,
  UploadInstrumentRecordsData
} from '@opendatacapture/schemas/instrument-records';
import { normalizeOrionAdverseEventRecords } from '@opendatacapture/schemas/instrument-records';
import { removeSubjectIdScope } from '@opendatacapture/subject-utils';
import {
  canOpenTheraVisit,
  getTheraVisit,
  THERA_RETIRED_INSTRUMENT_NAME,
  validateTheraVisit
} from '@opendatacapture/schemas/thera';
import type { TheraStoredVisit, TheraVisit } from '@opendatacapture/schemas/thera';
import type { Prisma, Session } from '@prisma/client';
import { isNumber, mergeWith, pickBy } from 'lodash-es';

import { AuditLogService } from '@/audit-log/audit-log.service';
import type { EntityOperationOptions } from '@/core/types';
import { GroupsService } from '@/groups/groups.service';
import { InstrumentsService } from '@/instruments/instruments.service';
import { OrionFollowupService } from '@/orion-followup/orion-followup.service';
import { OrionCodesService } from '@/orion-codes/orion-codes.service';
import type { OrionTransactionClient } from '@/orion-codes/orion-codes.service';
import { SessionsService } from '@/sessions/sessions.service';
import { CreateSubjectDto } from '@/subjects/dto/create-subject.dto';
import { SubjectsService } from '@/subjects/subjects.service';

import { InstrumentMeasuresService } from './instrument-measures.service';

type ExpandDataType =
  | {
      measure: string;
      measureValue: boolean | Date | number | string | undefined;
      success: true;
    }
  | {
      message: string;
      success: false;
    };

type CurrentUserContext = {
  basePermissionLevel: 'ADMIN' | 'GROUP_MANAGER' | 'STANDARD';
  id: string;
};

@Injectable()
export class InstrumentRecordsService {
  constructor(
    @InjectModel('InstrumentRecord') private readonly instrumentRecordModel: Model<'InstrumentRecord'>,
    @InjectModel('User') private readonly userModel: Model<'User'>,
    private readonly auditLogService: AuditLogService,
    private readonly groupsService: GroupsService,
    private readonly instrumentMeasuresService: InstrumentMeasuresService,
    private readonly instrumentsService: InstrumentsService,
    private readonly orionFollowupService: OrionFollowupService,
    private readonly sessionsService: SessionsService,
    private readonly subjectsService: SubjectsService,
    private readonly orionCodesService: OrionCodesService
  ) {}

  async count(
    filter: Prisma.InstrumentRecordWhereInput = {},
    { ability }: EntityOperationOptions = {}
  ): Promise<number> {
    return this.instrumentRecordModel.count({
      where: { AND: [accessibleQuery(ability, 'read', 'InstrumentRecord'), filter] }
    });
  }

  async reserveOrionPatientCode({ groupId, user }: { groupId: string; user: EntityOperationOptions['user'] }) {
    const context = await this.getOrionPatientCodeContext({ groupId, user });
    return { code: await this.orionCodesService.preview(groupId, context.user.id) };
  }

  async reserveTheraPatientCode({ groupId, user }: { groupId: string; user: EntityOperationOptions['user'] }) {
    const context = await this.getOrionPatientCodeContext({ groupId, user, prefix: 'TH' });
    return { code: await this.orionCodesService.preview(groupId, context.user.id, 'TH') };
  }

  private async getOrionPatientCodeContext({
    groupId,
    user,
    prefix = 'OR'
  }: {
    groupId: string;
    user: EntityOperationOptions['user'];
    prefix?: 'OR' | 'TH';
  }) {
    if (!user) {
      throw new ForbiddenException('A signed-in investigator is required to reserve an ORION patient code');
    }

    const group = await this.groupsService.findById(groupId, { user });
    if (!group) {
      throw new NotFoundException(`Failed to resolve group with ID: ${groupId}`);
    }
    if (group.studyCode !== prefix) {
      const studyName = prefix === 'TH' ? 'THERA' : 'ORION';
      throw new BadRequestException(
        group.studyCode
          ? `El formulari ${studyName} no correspon al grup '${group.name}', configurat amb el codi '${group.studyCode}'. Seleccioneu el grup de l’estudi correcte.`
          : `El grup '${group.name}' no té configurat el codi d’estudi ${studyName} (${prefix}). Cal configurar-lo a Gestionar grups abans de generar codis de pacient.`
      );
    }

    const account = await this.userModel.findUniqueOrThrow({
      where: { id: user.id }
    });
    if (!account.groupIds.includes(groupId)) {
      throw new ForbiddenException('The investigator is not assigned to this ORION group');
    }
    const assignment = account.studyHospitals.find((entry) => entry.groupId === groupId);
    const assignedHospital = group.hospitalCatalog?.find((entry) => entry.id === assignment?.hospitalId);
    const hospital = assignedHospital?.name;
    if (!hospital || !group.hospitals.includes(hospital)) {
      throw new BadRequestException('Assign a hospital to the investigator before creating an ORION patient code');
    }

    return { group, hospital, user: account };
  }

  private assertTheraInstrumentActive(name: string) {
    if (name === THERA_RETIRED_INSTRUMENT_NAME) {
      throw new BadRequestException(
        'El formulario de finalización THERA se ha retirado. El estudio se completa al registrar la cuarta visita.'
      );
    }
  }

  private async getTheraRecords(
    groupId: string,
    subjectId: string,
    options: EntityOperationOptions
  ): Promise<TheraStoredVisit[]> {
    const instruments = await this.instrumentsService.find(
      { kind: 'FORM' },
      {
        ...options,
        currentUser: this.buildCurrentUserContext(options.user)
      }
    );
    const names = new Map(
      instruments.flatMap((instrument) => {
        const visit = instrument.internal && getTheraVisit(instrument.internal.name);
        return visit ? [[instrument.id, visit] as const] : [];
      })
    );
    const records = await this.instrumentRecordModel.findMany({
      where: {
        groupId,
        subjectId,
        instrumentId: { in: [...names.keys()] },
        AND: [accessibleQuery(options.ability, 'read', 'InstrumentRecord')]
      }
    });
    return records.flatMap((record) => {
      const visit = names.get(record.instrumentId);
      if (!visit || !record.data || typeof record.data !== 'object' || Array.isArray(record.data)) return [];
      return [{ id: record.id, visit, data: record.data as Record<string, unknown> }];
    });
  }

  private async validateTheraRecord(
    visit: TheraVisit,
    data: Record<string, unknown>,
    groupId: null | string | undefined,
    subjectId: string,
    options: EntityOperationOptions,
    editingId?: string
  ) {
    if (!groupId || !options.user) throw new BadRequestException('Seleccione un grupo THERA y una sesión autenticada.');
    await this.getOrionPatientCodeContext({ groupId, user: options.user, prefix: 'TH' });
    if (visit === 'V0' && !editingId) return;
    const records = await this.getTheraRecords(groupId, subjectId, options);
    const error = validateTheraVisit(visit, data, records, editingId);
    if (error) throw new UnprocessableEntityException(error);
    if (!editingId && !canOpenTheraVisit(visit, records, String(data.patient_code))) {
      throw new UnprocessableEntityException(
        'No se puede registrar esta visita: hoy está fuera del periodo permitido para este paciente.'
      );
    }
    if (editingId) {
      const replacement = records.map((record) => (record.id === editingId ? { ...record, data } : record));
      for (const record of replacement) {
        const dependentError = validateTheraVisit(record.visit, record.data, replacement, record.id);
        if (dependentError)
          throw new UnprocessableEntityException(`El cambio invalidaría una visita guardada: ${dependentError}`);
      }
    }
  }

  async create(
    { data: rawData, date, groupId, instrumentId, sessionId, subjectId }: CreateInstrumentRecordData,
    options?: EntityOperationOptions
  ): Promise<InstrumentRecord> {
    const currentUser = this.buildCurrentUserContext(options?.user);
    const group = groupId ? await this.groupsService.findById(groupId, options) : null;
    const instrument = await this.instrumentsService.findById(instrumentId, { currentUser });
    if (instrument.kind === 'SERIES') {
      throw new UnprocessableEntityException(
        `Cannot create instrument record for series instrument '${instrument.id}'`
      );
    }
    this.assertTheraInstrumentActive(instrument.internal.name);

    await this.subjectsService.findById(subjectId);
    const session = await this.sessionsService.findById(sessionId, options);
    if (session.subjectId !== subjectId || session.groupId !== (groupId ?? null)) {
      throw new BadRequestException('La sessió ha de correspondre al participant i al grup seleccionats.');
    }

    const normalizedRawData =
      instrument.internal.name === 'ORION_PR_2026_FOLLOWUP' ? this.normalizeOrionFollowupDates(rawData) : rawData;
    const parseResult = instrument.validationSchema.safeParse(
      normalizeOrionAdverseEventRecords(this.parseJson(normalizedRawData), instrument.internal.name)
    );
    if (!parseResult.success) {
      throw new UnprocessableEntityException({
        error: 'Unprocessable Entity',
        issues: parseResult.error.issues,
        message: `Data received for record does not pass validation schema of instrument '${instrument.id}'`,
        statusCode: 422
      });
    }

    const parsedData = parseResult.data as Record<string, unknown>;
    const theraVisit = getTheraVisit(instrument.internal.name);
    if (group && options?.user) {
      if (!group.accessibleInstrumentIds.includes(instrumentId)) {
        throw new ForbiddenException('El formulari no està habilitat per al grup seleccionat.');
      }
      const account = await this.userModel.findUniqueOrThrow({ where: { id: options.user.id } });
      if (!account.groupIds.includes(group.id)) {
        throw new ForbiddenException('L’investigador no pertany al grup seleccionat.');
      }
      const assignment = account.studyHospitals.find((entry) => entry.groupId === group.id);
      const hospital = group.hospitalCatalog?.find((entry) => entry.id === assignment?.hospitalId);
      if (group.hospitals.length > 0) {
        if (!hospital) {
          throw new BadRequestException('Cal assignar un centre sanitari vàlid per a aquest estudi.');
        }
        this.validateHospitalSelection(parsedData, [hospital.name], [hospital]);
      }
    }

    const isTheraBaseline = theraVisit === 'V0';
    const isSelection = instrument.internal.name === 'ORION_PR_2026_SELECTION' || isTheraBaseline;
    if (isSelection && !groupId) {
      throw new BadRequestException('Cal seleccionar el grup ORION abans de crear un pacient.');
    }
    if (isSelection && session.userId !== options?.user?.id) {
      throw new ForbiddenException('El codi de pacient s’ha de generar dins la sessió del mateix investigador.');
    }
    const orionContext = isSelection
      ? await this.getOrionPatientCodeContext({
          groupId: groupId!,
          user: options?.user,
          ...(isTheraBaseline ? { prefix: 'TH' as const } : {})
        })
      : undefined;
    if (theraVisit) {
      await this.validateTheraRecord(theraVisit, parsedData, groupId, subjectId, options ?? {});
    }
    const rawPatientCode = parsedData.patient_code ?? parsedData.user_code;
    let userCode = typeof rawPatientCode === 'string' ? rawPatientCode : '';
    const selectionRecordId = await this.orionFollowupService.validateFollowup({
      followupData: parsedData,
      groupId,
      instrument,
      subjectId,
      userCode
    });
    const createRecord = async (transaction?: OrionTransactionClient) => {
      if (orionContext) {
        userCode = isTheraBaseline
          ? await this.orionCodesService.create(
              orionContext.group.id,
              orionContext.user.id,
              orionContext.hospital,
              transaction,
              'TH'
            )
          : await this.orionCodesService.create(
              orionContext.group.id,
              orionContext.user.id,
              orionContext.hospital,
              transaction
            );
        parsedData.patient_code = userCode;
        parsedData.user_code = undefined;
      }
      const model = transaction?.instrumentRecord ?? this.instrumentRecordModel;
      return model.create({
        data: {
          computedMeasures: instrument.measures
            ? this.instrumentMeasuresService.computeMeasures(instrument.measures, parsedData as Json)
            : null,
          data: this.serializeData(parsedData),
          date,
          group: groupId
            ? {
                connect: { id: groupId }
              }
            : undefined,
          instrument: {
            connect: {
              id: instrumentId
            }
          },
          session: {
            connect: {
              id: sessionId
            }
          },
          subject: {
            connect: {
              id: subjectId
            }
          }
        }
      });
    };
    const record = isSelection
      ? await this.orionCodesService.transaction((transaction) => createRecord(transaction))
      : await createRecord();

    await this.orionFollowupService.scheduleReminder({
      groupId,
      instrument,
      investigator: options?.user,
      selectionData: parsedData,
      selectionRecordId: record.id!,
      subjectId,
      userCode
    });
    await this.orionFollowupService.completeFollowup({ followupRecordId: record.id!, selectionRecordId });

    return record;
  }

  async deleteById(id: string, { ability, user }: EntityOperationOptions = {}) {
    const instrumentRecord = await this.instrumentRecordModel.findFirst({
      include: { session: true },
      where: {
        AND: [accessibleQuery(ability, 'delete', 'InstrumentRecord')],
        id
      }
    });

    if (!instrumentRecord) {
      throw new NotFoundException(`Could not find record with ID '${id}'`);
    }

    const instrument = await this.getInstrumentById(instrumentRecord.instrumentId);
    if (instrument.kind !== 'SERIES' && getTheraVisit(instrument.internal.name) && instrumentRecord.groupId) {
      const remaining = (
        await this.getTheraRecords(instrumentRecord.groupId, instrumentRecord.subjectId, { ability, user })
      ).filter((record) => record.id !== id);
      for (const record of remaining) {
        const error = validateTheraVisit(record.visit, record.data, remaining, record.id);
        if (error)
          throw new BadRequestException(
            `No se puede eliminar una visita necesaria para otra visita guardada: ${error}`
          );
      }
    }

    return this.instrumentRecordModel.delete({
      where: { AND: [accessibleQuery(ability, 'delete', 'InstrumentRecord')], id }
    });
  }

  async deletePatientVisits(id: string, { ability }: EntityOperationOptions = {}) {
    return this.orionCodesService.transaction(async (transaction) => {
      const authorization = accessibleQuery(ability, 'delete', 'InstrumentRecord');
      const selected = await transaction.instrumentRecord.findFirst({
        where: { AND: [authorization], id }
      });
      if (!selected) throw new NotFoundException(`Could not find record with ID '${id}'`);

      const patientCode = (data: unknown) => {
        if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined;
        const fields = Object.fromEntries(Object.entries(data));
        const code = fields.patient_code ?? fields.user_code;
        return typeof code === 'string' && code.trim() ? code : undefined;
      };
      const family = async (instrumentId: string) => {
        const instrument = await this.getInstrumentById(instrumentId);
        if (instrument.kind === 'SERIES') return undefined;
        if (getTheraVisit(instrument.internal.name)) return 'THERA';
        if (['ORION_PR_2026_SELECTION', 'ORION_PR_2026_FOLLOWUP'].includes(instrument.internal.name)) return 'ORION';
        return undefined;
      };
      const code = patientCode(selected.data);
      const study = await family(selected.instrumentId);
      if (!selected.groupId || !code || !study) {
        throw new BadRequestException('El registro no identifica un paciente de un estudio con múltiples visitas.');
      }
      const candidates = await transaction.instrumentRecord.findMany({
        where: { groupId: selected.groupId, subjectId: selected.subjectId }
      });
      const ids: string[] = [];
      for (const candidate of candidates) {
        if (patientCode(candidate.data) === code && (await family(candidate.instrumentId)) === study) {
          ids.push(candidate.id);
        }
      }
      if (!ids.includes(id)) {
        throw new BadRequestException('Las visitas han cambiado. Actualice la tabla antes de eliminarlas.');
      }
      const result = await transaction.instrumentRecord.deleteMany({
        where: { id: { in: ids }, AND: [authorization] }
      });
      if (result.count !== ids.length) {
        throw new ForbiddenException('No se han eliminado las visitas: faltan permisos para alguna de ellas.');
      }
      if (study === 'ORION') {
        await transaction.orionFollowupReminder.deleteMany({
          where: { OR: [{ selectionRecordId: { in: ids } }, { followupRecordId: { in: ids } }] }
        });
      }
      return result;
    });
  }

  async exists(where: Prisma.InstrumentRecordWhereInput): Promise<boolean> {
    return this.instrumentRecordModel.exists(where);
  }

  async exportRecords({ groupId }: { groupId?: string } = {}, { ability, user }: EntityOperationOptions = {}) {
    const currentUser = this.buildCurrentUserContext(user);
    const data: InstrumentRecordsExport = [];
    const records = await this.instrumentRecordModel.findMany({
      include: {
        session: {
          select: {
            date: true,
            id: true,
            type: true
          }
        },
        subject: true
      },
      where: {
        AND: [
          {
            subject: groupId ? { groupIds: { has: groupId } } : {}
          },
          accessibleQuery(ability, 'read', 'InstrumentRecord')
        ]
      }
    });

    const instruments = new Map<string, ScalarInstrument>();
    for (const record of records) {
      let instrument: ScalarInstrument;
      if (instruments.has(record.instrumentId)) {
        instrument = instruments.get(record.instrumentId)!;
      } else {
        try {
          instrument = (await this.instrumentsService.findById(record.instrumentId, {
            ability,
            currentUser
          })) as ScalarInstrument;
          instruments.set(record.instrumentId, instrument);
        } catch (error) {
          if (error instanceof NotFoundException) {
            continue;
          }
          throw error;
        }
      }

      const rawData =
        typeof record.data === 'object' && record.data !== null && !Array.isArray(record.data) ? record.data : {};
      const computedMeasures = record.computedMeasures || {};
      const mergedData = { ...computedMeasures, ...rawData };

      // Ensure all measures from the instrument definition are present in the export
      const allMeasureKeys = new Set([...Object.keys(mergedData)]);
      if (instrument.measures) {
        Object.keys(instrument.measures).forEach((key) => allMeasureKeys.add(key));
      }

      let schema: any = instrument.validationSchema;
      while (
        schema &&
        (schema._def?.typeName === 'ZodEffects' ||
          schema._def?.typeName === 'ZodOptional' ||
          schema._def?.typeName === 'ZodNullable')
      ) {
        if (schema._def.typeName === 'ZodEffects') {
          schema = schema._def.schema;
        } else {
          schema = schema._def.innerType;
        }
      }

      if (schema && schema._def?.typeName === 'ZodObject') {
        Object.keys(schema.shape).forEach((key) => allMeasureKeys.add(key));
      }

      for (const measureKey of allMeasureKeys) {
        const measureValue = mergedData[measureKey];

        if (measureValue === undefined || measureValue === null) {
          // Push empty string for missing values to ensure column existence
          data.push({
            groupId: record.subject.groupIds[0] ?? DEFAULT_GROUP_NAME,
            instrumentEdition: instrument.internal.edition,
            instrumentName: instrument.internal.name,
            measure: measureKey,
            sessionDate: record.session.date.toISOString(),
            sessionId: record.session.id,
            sessionType: record.session.type,
            subjectAge: record.subject.dateOfBirth ? yearsPassed(record.subject.dateOfBirth) : null,
            subjectId: removeSubjectIdScope(record.subject.id),
            subjectSex: record.subject.sex,
            timestamp: record.date.toISOString(),
            value: ''
          });
          continue;
        }

        if (!Array.isArray(measureValue)) {
          data.push({
            groupId: record.subject.groupIds[0] ?? DEFAULT_GROUP_NAME,
            instrumentEdition: instrument.internal.edition,
            instrumentName: instrument.internal.name,
            measure: measureKey,
            sessionDate: record.session.date.toISOString(),
            sessionId: record.session.id,
            sessionType: record.session.type,
            subjectAge: record.subject.dateOfBirth ? yearsPassed(record.subject.dateOfBirth) : null,
            subjectId: removeSubjectIdScope(record.subject.id),
            subjectSex: record.subject.sex,
            timestamp: record.date.toISOString(),
            value: measureValue
          });
        }

        if (Array.isArray(measureValue) && measureValue.length < 1) continue;

        if (Array.isArray(measureValue) && measureValue.length >= 1) {
          const arrayResult = this.expandData(measureValue);
          arrayResult.forEach((arrayEntry: ExpandDataType) => {
            if (!arrayEntry.success)
              throw new Error(`exportRecords: ${instrument.internal.name}.${measureKey} — ${arrayEntry.message}`);
            data.push({
              groupId: record.subject.groupIds[0] ?? DEFAULT_GROUP_NAME,
              instrumentEdition: instrument.internal.edition,
              instrumentName: instrument.internal.name,
              measure: `${measureKey} - ${arrayEntry.measure}`,
              sessionDate: record.session.date.toISOString(),
              sessionId: record.session.id,
              sessionType: record.session.type,
              subjectAge: record.subject.dateOfBirth ? yearsPassed(record.subject.dateOfBirth) : null,
              subjectId: removeSubjectIdScope(record.subject.id),
              subjectSex: record.subject.sex,
              timestamp: record.date.toISOString(),
              value: arrayEntry.measureValue
            });
          });
        }
      }
    }
    return data;
  }

  async find(query: InstrumentRecordQueryParams, options: EntityOperationOptions = {}): Promise<InstrumentRecord[]> {
    const { ability } = options;
    const currentUser = this.buildCurrentUserContext(options.user);
    const { groupId, instrumentId, instrumentName, kind, minDate, subjectId } = query;

    if (groupId) {
      await this.groupsService.findById(groupId, options);
    }

    const allowedInstruments = await this.instrumentsService.find(
      { kind },
      {
        ability,
        currentUser
      }
    );
    const instrumentKindIds = allowedInstruments.map((instrument) => instrument.id);
    const matchingInstrumentIds = instrumentName
      ? allowedInstruments
          .filter((instrument) => instrument.internal?.name === instrumentName)
          .map((instrument) => instrument.id)
      : undefined;

    if (instrumentName && matchingInstrumentIds?.length === 0) {
      return [];
    }

    if (instrumentId) {
      // If the specific instrument is no longer accessible, return an empty list instead of throwing.
      if (!instrumentKindIds.includes(instrumentId)) {
        return [];
      }

      try {
        await this.instrumentsService.findById(instrumentId, { ability, currentUser });
      } catch (error) {
        if (error instanceof NotFoundException) {
          return [];
        }
        throw error;
      }
    }

    const records = await this.instrumentRecordModel.findMany({
      include: {
        instrument: false
      },
      where: {
        AND: [
          { date: { gte: minDate } },
          { groupId },
          { instrumentId },
          { instrumentId: { in: matchingInstrumentIds ?? instrumentKindIds } },
          accessibleQuery(ability, 'read', 'InstrumentRecord'),
          { subjectId }
        ]
      }
    });

    return records;
  }

  async linearModel(
    { groupId, instrumentId }: { groupId?: string; instrumentId: string },
    options: EntityOperationOptions = {}
  ): Promise<LinearRegressionResults> {
    const { ability } = options;
    const currentUser = this.buildCurrentUserContext(options.user);
    if (groupId) {
      await this.groupsService.findById(groupId, options);
    }
    const instrument = await this.getInstrumentById(instrumentId, { ability, currentUser });

    if (instrument.kind === 'SERIES') {
      throw new UnprocessableEntityException(`Cannot create linear model for series instrument '${instrument.id}'`);
    }

    if (!instrument.measures) {
      return {};
    }

    const records = await this.instrumentRecordModel.findMany({
      include: { instrument: true },
      where: { AND: [accessibleQuery(ability, 'read', 'InstrumentRecord'), { groupId }, { instrumentId }] }
    });

    if (3 > records.length) {
      return {};
    }

    const data: { [key: string]: [x: number[], y: number[]] } = {};
    for (const record of records) {
      const numericMeasures = pickBy(record.computedMeasures, isNumber);
      for (const measure in numericMeasures) {
        const x = record.date.getTime();
        const y = numericMeasures[measure]!;
        if (Array.isArray(data[measure])) {
          data[measure][0].push(x);
          data[measure][1].push(y);
        } else {
          data[measure] = [[x], [y]];
        }
      }
    }

    const results: LinearRegressionResults = {};
    for (const measure in data) {
      results[measure] = linearRegression(new Float64Array(data[measure]![0]), new Float64Array(data[measure]![1]));
    }
    return results;
  }

  async updateById(
    id: string,
    data: unknown[] | { [key: string]: unknown },
    { ability, user }: EntityOperationOptions = {}
  ) {
    const instrumentRecord = await this.instrumentRecordModel.findFirst({
      include: { session: true },
      where: { id }
    });
    if (!instrumentRecord) {
      throw new NotFoundException(`Could not find record with ID '${id}'`);
    }

    // Allow admin and group_manager to edit any record; standard users can only edit their own
    if (user) {
      const isPrivileged = user.basePermissionLevel === 'ADMIN' || user.basePermissionLevel === 'GROUP_MANAGER';
      if (!isPrivileged && instrumentRecord.session.userId !== user.id) {
        throw new ForbiddenException('Only the owner of the record can edit it.');
      }
      if (!isPrivileged && instrumentRecord.groupId) {
        const account = await this.userModel.findUniqueOrThrow({ where: { id: user.id } });
        if (!account.groupIds.includes(instrumentRecord.groupId)) {
          throw new ForbiddenException('L’investigador ja no està assignat a aquest estudi.');
        }
      }
    }

    if (Array.isArray(instrumentRecord.data) && !Array.isArray(data)) {
      throw new BadRequestException('Data must be an array when the instrument record data is an array');
    }

    // Deep clone the original data BEFORE mergeWith mutates it
    const originalData = JSON.parse(JSON.stringify(instrumentRecord.data)) as unknown;

    // all records must be attached to scalar instruments
    const instrument = (await this.getInstrumentById(instrumentRecord.instrumentId)) as ScalarInstrument;
    this.assertTheraInstrumentActive(instrument.internal.name);

    let normalizedData = data;
    if (!Array.isArray(data) && instrument.internal.name.startsWith('ORION_')) {
      normalizedData = { ...data };
      const storedData = instrumentRecord.data as Record<string, unknown>;
      if (typeof storedData.user_code === 'string' && typeof normalizedData.patient_code === 'string') {
        normalizedData.user_code = normalizedData.patient_code;
        delete normalizedData.patient_code;
      } else if (typeof storedData.patient_code === 'string' && typeof normalizedData.user_code === 'string') {
        normalizedData.patient_code = normalizedData.user_code;
        delete normalizedData.user_code;
      }
    }

    const updatedData = mergeWith(
      instrumentRecord.data,
      normalizedData,
      (updatedValue: unknown, sourceValue: unknown) => {
        if (Array.isArray(sourceValue)) {
          return sourceValue;
        }
        return undefined;
      }
    );

    const normalizedUpdatedData =
      instrument.internal.name === 'ORION_PR_2026_FOLLOWUP'
        ? this.normalizeOrionFollowupDates(updatedData)
        : updatedData;
    const parseResult = await instrument.validationSchema.safeParseAsync(
      normalizeOrionAdverseEventRecords(this.parseJson(normalizedUpdatedData), instrument.internal.name)
    );
    if (!parseResult.success) {
      throw new BadRequestException({
        issues: parseResult.error.issues,
        message: 'Merged data does not match validation schema'
      });
    }

    // Compute field-level diff using the cloned original data (not the mutated one)
    const oldDataObj =
      typeof originalData === 'object' && originalData !== null && !Array.isArray(originalData)
        ? (originalData as { [key: string]: unknown })
        : {};
    const newDataObj =
      typeof parseResult.data === 'object' && parseResult.data !== null && !Array.isArray(parseResult.data)
        ? (parseResult.data as { [key: string]: unknown })
        : {};
    const theraVisit = getTheraVisit(instrument.internal.name);
    if (theraVisit) {
      if (oldDataObj.patient_code !== newDataObj.patient_code) {
        throw new BadRequestException('El código de paciente asignado no se puede modificar.');
      }
      await this.validateTheraRecord(
        theraVisit,
        newDataObj,
        instrumentRecord.groupId,
        instrumentRecord.subjectId,
        { ability, user },
        id
      );
    }
    if (
      instrument.internal.name.startsWith('ORION_') &&
      (oldDataObj.patient_code ?? oldDataObj.user_code) !== (newDataObj.patient_code ?? newDataObj.user_code)
    ) {
      throw new BadRequestException('El codi de pacient assignat no es pot modificar.');
    }
    if (instrumentRecord.groupId && this.getHospitalSelection(oldDataObj) !== this.getHospitalSelection(newDataObj)) {
      if (!instrumentRecord.session.userId) {
        throw new BadRequestException('La sessió ha de tenir un investigador assignat per poder canviar-ne el centre.');
      }
      const owner = await this.userModel.findUniqueOrThrow({ where: { id: instrumentRecord.session.userId } });
      const group = await this.groupsService.findById(instrumentRecord.groupId);
      const assignment = owner.studyHospitals.find((entry) => entry.groupId === group.id);
      const hospital = group.hospitalCatalog?.find((entry) => entry.id === assignment?.hospitalId);
      if (!hospital) {
        throw new BadRequestException('Cal assignar un centre sanitari vàlid per a aquest estudi.');
      }
      this.validateHospitalSelection(newDataObj, [hospital.name], [hospital]);
    }
    const changes = this.auditLogService.computeChanges(oldDataObj, newDataObj);

    if (changes.length > 0 && user) {
      await this.auditLogService.create({
        changes,
        groupId: instrumentRecord.groupId ?? undefined,
        instrumentId: instrumentRecord.instrumentId,
        newData: newDataObj,
        previousData: oldDataObj,
        recordId: id,
        subjectId: instrumentRecord.subjectId,
        userId: user.id,
        username: user.username
      });
    }

    return this.instrumentRecordModel.update({
      data: {
        computedMeasures: instrument.measures
          ? this.instrumentMeasuresService.computeMeasures(instrument.measures, parseResult.data as Json)
          : null,
        data: theraVisit ? this.serializeData(parseResult.data) : parseResult.data
      },
      where: { AND: [accessibleQuery(ability, 'update', 'InstrumentRecord')], id }
    });
  }

  async upload(
    { groupId, instrumentId, records }: UploadInstrumentRecordsData,
    options?: EntityOperationOptions
  ): Promise<InstrumentRecord[]> {
    const currentUser = this.buildCurrentUserContext(options?.user);
    const group = groupId ? await this.groupsService.findById(groupId, options) : null;

    const instrument = await this.instrumentsService.findById(instrumentId, { currentUser });
    if (instrument.kind === 'SERIES') {
      throw new UnprocessableEntityException(
        `Cannot create instrument record for series instrument '${instrument.id}'`
      );
    }

    this.assertTheraInstrumentActive(instrument.internal.name);
    const theraVisit = getTheraVisit(instrument.internal.name);
    if (theraVisit === 'V0') {
      throw new BadRequestException(
        'Las visitas basales THERA deben registrarse desde el formulario para asignar el código de paciente de forma atómica.'
      );
    }
    if (theraVisit) {
      const seen = new Set<string>();
      for (const record of records) {
        const parsed = await instrument.validationSchema.safeParseAsync(this.parseJson(record.data));
        if (!parsed.success)
          throw new UnprocessableEntityException({ message: 'Datos THERA no válidos', issues: parsed.error.issues });
        const data = parsed.data as Record<string, unknown>;
        const key = `${record.subjectId}:${String(data.patient_code)}`;
        if (seen.has(key))
          throw new BadRequestException('El archivo contiene más de una visita para el mismo paciente.');
        seen.add(key);
        await this.validateTheraRecord(theraVisit, data, groupId, record.subjectId, options ?? {});
      }
    }

    if (group && options?.user) {
      if (!group.accessibleInstrumentIds.includes(instrumentId)) {
        throw new ForbiddenException('El formulari no està habilitat per al grup seleccionat.');
      }
      const account = await this.userModel.findUniqueOrThrow({ where: { id: options.user.id } });
      if (!account.groupIds.includes(group.id)) {
        throw new ForbiddenException('L’investigador no pertany al grup seleccionat.');
      }
      let hospitals = group.hospitals;
      if (account.basePermissionLevel === 'STANDARD' && hospitals.length > 0) {
        const assignment = account.studyHospitals.find((entry) => entry.groupId === group.id);
        const hospital = group.hospitalCatalog?.find((entry) => entry.id === assignment?.hospitalId);
        if (!hospital) {
          throw new BadRequestException('Cal assignar un centre sanitari vàlid per a aquest estudi.');
        }
        hospitals = [hospital.name];
      }
      for (const record of records) {
        this.validateHospitalSelection(this.parseJson(record.data), hospitals, group.hospitalCatalog);
      }
    }

    const createdSessionsArray: Session[] = [];

    try {
      const subjectIdList = records.map(({ subjectId }) => {
        const subjectToAdd: CreateSubjectDto = { id: subjectId };

        return subjectToAdd;
      });

      await this.subjectsService.createMany(subjectIdList);

      const preProcessedRecords = await Promise.all(
        records.map(async (record) => {
          const { data: rawData, date, subjectId } = record;

          // Validate data
          const normalizedRawData =
            instrument.internal.name === 'ORION_PR_2026_FOLLOWUP' ? this.normalizeOrionFollowupDates(rawData) : rawData;
          const parseResult = instrument.validationSchema.safeParse(
            normalizeOrionAdverseEventRecords(this.parseJson(normalizedRawData), instrument.internal.name)
          );
          if (!parseResult.success) {
            console.error(parseResult.error.issues);
            throw new UnprocessableEntityException(
              `Data received for record does not pass validation schema of instrument '${instrument.id}'`
            );
          }

          // Only validate hospital selection for ORION instruments (OMEGA and others don't use group hospitals)
          if (instrument.internal.name.startsWith('ORION_')) {
            this.validateHospitalSelection(parseResult.data, group?.hospitals ?? [], group?.hospitalCatalog);
          }

          const session = await this.sessionsService.create({
            date: date,
            groupId: groupId ?? null,
            subjectData: { id: subjectId },
            type: 'RETROSPECTIVE',
            username: options?.user?.username
          });

          createdSessionsArray.push(session);

          const computedMeasures = instrument.measures
            ? this.instrumentMeasuresService.computeMeasures(instrument.measures, parseResult.data)
            : null;

          return {
            computedMeasures,
            data: this.serializeData(parseResult.data),
            date,
            groupId,
            instrumentId,
            sessionId: session.id,
            subjectId
          };
        })
      );
      await this.instrumentRecordModel.createMany({
        data: preProcessedRecords
      });

      return this.instrumentRecordModel.findMany({
        where: {
          groupId,
          instrumentId
        }
      });
    } catch (err) {
      await this.sessionsService.deleteByIds(createdSessionsArray.map((session) => session.id));
      throw err;
    }
  }

  private expandData(listEntry: any[]): ExpandDataType[] {
    const validRecordArrayList: ExpandDataType[] = [];
    if (listEntry.length < 1) {
      throw new Error('Record Array is Empty');
    }
    for (const objectEntry of Object.values(listEntry)) {
      for (const [dataKey, dataValue] of Object.entries(objectEntry as { [key: string]: any })) {
        const parseResult = $RecordArrayFieldValue.safeParse(dataValue);
        if (!parseResult.success) {
          validRecordArrayList.push({
            message: `Error interpreting value ${dataValue} and record array key ${dataKey}`,
            success: false
          });
        }
        validRecordArrayList.push({
          measure: dataKey,
          measureValue: parseResult.data,
          success: true
        });
      }
    }
    return validRecordArrayList;
  }

  private getInstrumentById(
    instrumentId: string,
    options: {
      ability?: EntityOperationOptions['ability'];
      currentUser?: CurrentUserContext;
    } = {}
  ) {
    return this.instrumentsService
      .findById(instrumentId, options)
      .then((instrument) => this.instrumentsService.getInstrumentInstance(instrument));
  }

  private buildCurrentUserContext(user?: EntityOperationOptions['user']): CurrentUserContext | undefined {
    if (!user) {
      return undefined;
    }

    return {
      basePermissionLevel: user.basePermissionLevel ?? 'STANDARD',
      id: user.id
    };
  }

  private parseJson(data: unknown) {
    return JSON.parse(JSON.stringify(data), reviver) as unknown;
  }

  private normalizeOrionFollowupDates(data: unknown) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return data;
    }

    const normalized = { ...(data as Record<string, unknown>) };
    if (normalized.continues_study === 'no') {
      for (const field of [
        'followup_date',
        'eq5d_mobility',
        'eq5d_selfcare',
        'eq5d_activities',
        'eq5d_pain',
        'eq5d_anxiety',
        'eq5d_vas',
        'sleep_onset',
        'sleep_maintenance',
        'sleep_quality',
        'sleep_daytime',
        'mmas_forget',
        'mmas_remember',
        'mmas_better',
        'mmas_worse',
        'cgi_improvement',
        'objective_achieved',
        'dose_change',
        'dose_change_date',
        'new_dose',
        'concomitant_treatment_changes',
        'concomitant_treatment_changes_detail',
        'adverse_events',
        'adverse_event_records'
      ]) {
        normalized[field] = undefined;
      }
    }
    for (const field of ['followup_date', 'dose_change_date', 'end_date']) {
      normalized[field] = this.normalizeOrionDateValue(normalized[field]);
    }
    if (Array.isArray(normalized.adverse_event_records)) {
      normalized.adverse_event_records = normalized.adverse_event_records.map((record) => {
        if (!record || typeof record !== 'object' || Array.isArray(record)) {
          return record;
        }
        const normalizedRecord = { ...(record as Record<string, unknown>) };
        normalizedRecord.onset_date = this.normalizeOrionDateValue(normalizedRecord.onset_date);
        normalizedRecord.resolution_date = this.normalizeOrionDateValue(normalizedRecord.resolution_date);
        return normalizedRecord;
      });
    }
    return normalized;
  }

  private normalizeOrionDateValue(value: unknown) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return this.formatOrionDate(value);
    }
    if (typeof value !== 'string') {
      return value;
    }
    const trimmed = value.trim();
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      return trimmed;
    }
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(trimmed);
    if (!isoMatch) {
      return value;
    }
    const date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]), 12);
    return Number.isNaN(date.getTime()) ? value : this.formatOrionDate(date);
  }

  private formatOrionDate(date: Date) {
    return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
  }

  private serializeData(data: unknown) {
    return JSON.parse(JSON.stringify(data, replacer)) as unknown;
  }

  private getHospitalSelection(data: unknown) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const objectData = data as Record<string, unknown>;
    const value =
      objectData.site_hospital ?? objectData.CAP ?? objectData.centro_sanitario ?? objectData.centroAtencionPrimaria;
    return typeof value === 'string' ? value.trim() : undefined;
  }

  private validateHospitalSelection(data: unknown, groupHospitals: string[], catalog: HospitalOption[] = []) {
    if (groupHospitals.length === 0) {
      return;
    }

    const normalized = this.getHospitalSelection(data);
    if (!normalized) {
      return;
    }

    const matches = groupHospitals.some(
      (name) =>
        name === normalized ||
        catalog.some((hospital) => hospital.name === name && hospitalMatchesName(hospital, normalized))
    );
    if (!matches) {
      throw new BadRequestException(
        `Hospital '${normalized}' is not configured in the current group. Configure it in group management first.`
      );
    }
  }
}
