import { accessibleQuery, CryptoService, InjectModel } from '@douglasneuroinformatics/libnest';
import type { Model } from '@douglasneuroinformatics/libnest';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@opendatacapture/schemas/user';

import type { EntityOperationOptions } from '@/core/types';
import { GroupsService } from '@/groups/groups.service';
import { OrionCodesService } from '@/orion-codes/orion-codes.service';
import type { OrionTransactionClient } from '@/orion-codes/orion-codes.service';
import type {
  CreatePendingInvestigatorData,
  PendingInvestigator,
  UpdatePendingInvestigatorData,
  StudyHospital
} from '@opendatacapture/schemas/user';

import { CreateUserDto } from './dto/create-user.dto';
import { OnboardingMailService } from './onboarding-mail.service';

import type { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<'User'>,
    @InjectModel('PendingInvestigator') private readonly pendingInvestigatorModel: Model<'PendingInvestigator'>,
    private readonly cryptoService: CryptoService,
    private readonly groupsService: GroupsService,
    private readonly onboardingMailService: OnboardingMailService,
    private readonly orionCodesService: OrionCodesService
  ) {}

  async checkUsernameExists(username: string, { ability }: EntityOperationOptions = {}): Promise<{ success: boolean }> {
    const user = await this.userModel.findFirst({
      include: { groups: true },
      omit: {
        hashedPassword: true
      },
      where: { AND: [accessibleQuery(ability, 'read', 'User'), { username }] }
    });
    if (!user) {
      return { success: false };
    }
    return { success: true };
  }

  async count(
    filter: NonNullable<Parameters<Model<'User'>['count']>[0]>['where'] = {},
    { ability }: EntityOperationOptions = {}
  ) {
    return this.userModel.count({
      where: { AND: [accessibleQuery(ability, 'read', 'User'), filter] }
    });
  }

  /** Adds a new user to the database with default permissions, verifying the provided groups exist */
  async create(
    {
      basePermissionLevel,
      dateOfBirth,
      email,
      firstName,
      groupIds,
      lastName,
      password,
      sex,
      username,
      studyHospitals,
      professionalTitle
    }: CreateUserDto,
    options?: EntityOperationOptions & { skipPendingEmailConflict?: boolean }
  ) {
    if (await this.userModel.exists({ username })) {
      throw new ConflictException(`User with username '${username}' already exists!`);
    }

    // Check that all group exist and are accessible to the user
    for (const id of groupIds) {
      const group = await this.groupsService.findById(id, options);
      if (!group) {
        throw new NotFoundException(`Failed to resolve group with ID: ${id}`);
      }
    }

    const normalizedEmail = this.normalizeEmail(email);
    if (normalizedEmail && (await this.userModel.exists({ email: normalizedEmail }))) {
      throw new ConflictException(`User with email '${normalizedEmail}' already exists!`);
    }

    if (
      !options?.skipPendingEmailConflict &&
      normalizedEmail &&
      (await this.pendingInvestigatorModel.exists({ email: normalizedEmail }))
    ) {
      throw new ConflictException(`There is already a pending investigator with email '${normalizedEmail}'`);
    }

    const hashedPassword = await this.cryptoService.hashPassword(password);
    const assignments =
      basePermissionLevel === 'STANDARD' || studyHospitals
        ? await this.resolveStudyHospitals(groupIds, studyHospitals, undefined, options)
        : [];

    return this.orionCodesService.transaction(async (transaction) => {
      const created = await transaction.user.create({
        data: {
          additionalPermissions: [],
          basePermissionLevel,
          dateOfBirth,
          email: normalizedEmail,
          firstName,
          studyHospitals: assignments,
          professionalTitle,
          groups: {
            connect: groupIds.map((id) => ({ id }))
          },
          hashedPassword,
          lastName,
          sex,
          username: username
        },
        omit: {
          hashedPassword: true
        }
      });
      await this.assignStudyNumbers(created.id, groupIds, options, transaction);
      return created;
    });
  }

  async deleteById(id: string, { ability }: EntityOperationOptions = {}) {
    return this.userModel.delete({
      omit: {
        hashedPassword: true
      },
      where: { AND: [accessibleQuery(ability, 'delete', 'User')], id }
    });
  }

  /** Delete the user with the provided username, otherwise throws */
  async deleteByUsername(username: string, { ability }: EntityOperationOptions = {}) {
    const user = await this.findByUsername(username);
    return this.userModel.delete({
      omit: {
        hashedPassword: true
      },
      where: { AND: [accessibleQuery(ability, 'delete', 'User')], id: user.id }
    });
  }

  async find({ groupId }: { groupId?: string } = {}, { ability }: EntityOperationOptions = {}) {
    const users = await this.userModel.findMany({
      omit: {
        hashedPassword: true
      },
      where: {
        AND: [accessibleQuery(ability, 'read', 'User'), { groupIds: groupId ? { has: groupId } : undefined }]
      }
    });
    return this.withPromotedInvestigatorHospitals(users);
  }

  async findById(id: string, { ability }: EntityOperationOptions = {}) {
    const user = await this.userModel.findFirst({
      include: { groups: true },
      omit: {
        hashedPassword: true
      },
      where: { AND: [accessibleQuery(ability, 'read', 'User')], id }
    });
    if (!user) {
      throw new NotFoundException(`Failed to find user with ID: ${id}`);
    }
    return user;
  }

  async findCurrentById(
    id: string,
    { ability }: EntityOperationOptions = {}
  ): Promise<User & { hospital: null | string }> {
    const user = await this.userModel.findFirst({
      include: { groups: true },
      omit: {
        hashedPassword: true
      },
      where: { AND: [accessibleQuery(ability, 'update', 'User'), { id }] }
    });
    if (!user) {
      throw new NotFoundException(`Failed to find current user with ID: ${id}`);
    }

    const promotedPending = await this.pendingInvestigatorModel.findFirst({
      select: {
        hospital: true
      },
      where: {
        promotedUserId: id
      }
    });

    return {
      ...user,
      studyNumbers: (await this.orionCodesService.findForUsers([id])).map(({ groupId, number }) => ({
        groupId,
        number
      })),
      hospital: promotedPending?.hospital ?? null
    };
  }

  async findByUsername(username: string, { ability }: EntityOperationOptions = {}) {
    const user = await this.userModel.findFirst({
      include: { groups: true },
      omit: {
        hashedPassword: true
      },
      where: { AND: [accessibleQuery(ability, 'read', 'User'), { username }] }
    });
    if (!user) {
      throw new NotFoundException(`Failed to find user with username: ${username}`);
    }
    return user;
  }

  async updateById(
    id: string,
    { groupIds, hospital, password, studyHospitals, ...data }: UpdateUserDto,
    { ability }: EntityOperationOptions = {}
  ) {
    const currentUser = await this.userModel.findUnique({ where: { id } });
    if (!currentUser) {
      throw new NotFoundException(`Failed to find user with ID: ${id}`);
    }

    const normalizedEmail = this.normalizeEmail(data.email);
    const currentEmail = this.normalizeEmail(currentUser.email);
    if (normalizedEmail && normalizedEmail !== currentEmail) {
      if (await this.userModel.exists({ email: normalizedEmail })) {
        throw new ConflictException(`User with email '${normalizedEmail}' already exists!`);
      }
      if (await this.pendingInvestigatorModel.exists({ email: normalizedEmail })) {
        throw new ConflictException(`Pending investigator with email '${normalizedEmail}' already exists`);
      }
    }

    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await this.cryptoService.hashPassword(password);
    }

    const groupsUpdate =
      groupIds === undefined
        ? undefined
        : {
            // Replace memberships so unselected groups are removed as well.
            set: groupIds.map((id) => ({ id }))
          };

    let assignments: StudyHospital[] | undefined;
    if (studyHospitals !== undefined || groupIds !== undefined || hospital !== undefined) {
      const nextGroupIds = groupIds ?? currentUser.groupIds;
      const source =
        studyHospitals ?? currentUser.studyHospitals?.filter((entry) => nextGroupIds.includes(entry.groupId));
      assignments = await this.resolveStudyHospitals(
        nextGroupIds,
        studyHospitals !== undefined ? studyHospitals : source?.length ? source : undefined,
        hospital,
        { ability }
      );
    }

    return this.orionCodesService.transaction(async (transaction) => {
      const updated = await transaction.user.update({
        data: {
          ...data,
          ...(assignments ? { studyHospitals: assignments } : {}),
          email: normalizedEmail,
          ...(groupsUpdate ? { groups: groupsUpdate } : {}),
          hashedPassword
        },
        omit: {
          hashedPassword: true
        },
        where: { AND: [accessibleQuery(ability, 'update', 'User')], id }
      });
      if (groupIds !== undefined) {
        await this.assignStudyNumbers(id, groupIds ?? currentUser.groupIds, { ability }, transaction);
      }
      if (
        hospital !== undefined ||
        assignments !== undefined ||
        groupIds !== undefined ||
        data.professionalTitle !== undefined
      ) {
        await transaction.pendingInvestigator.updateMany({
          where: { promotedUserId: id },
          data: {
            ...(hospital !== undefined ? { hospital } : {}),
            ...(assignments !== undefined ? { studyHospitals: assignments } : {}),
            ...(groupIds !== undefined ? { groupIds } : {}),
            ...(data.professionalTitle !== undefined ? { professionalTitle: data.professionalTitle } : {})
          }
        });
      }
      return updated;
    });
  }

  private async resolveStudyHospitals(
    groupIds: string[],
    assignments: StudyHospital[] | undefined,
    legacyHospital: string | undefined,
    options?: EntityOperationOptions
  ): Promise<StudyHospital[]> {
    if (
      assignments &&
      (new Set(assignments.map((entry) => entry.groupId)).size !== assignments.length ||
        assignments.some((entry) => !groupIds.includes(entry.groupId)))
    ) {
      throw new BadRequestException('Cada centre ha de correspondre a un únic estudi assignat.');
    }
    const result: StudyHospital[] = [];
    for (const id of groupIds) {
      const group = await this.groupsService.findById(id, options);
      const catalog = group.hospitalCatalog;
      if (!catalog?.length) {
        if (group.hospitals.length === 0 && !assignments?.some((entry) => entry.groupId === id)) continue;
        if (!legacyHospital || !group.hospitals.includes(legacyHospital)) {
          throw new BadRequestException(`Cal assignar un centre sanitari vàlid per a l'estudi '${group.name}'.`);
        }
        continue;
      }
      const assignment = assignments?.find((entry) => entry.groupId === id);
      const hospital = assignment
        ? catalog.find((entry) => entry.id === assignment.hospitalId)
        : assignments === undefined
          ? catalog.find((entry) => entry.name === legacyHospital)
          : undefined;
      if (!hospital) {
        throw new BadRequestException(`Cal assignar un centre sanitari vàlid per a l'estudi '${group.name}'.`);
      }
      result.push({ groupId: id, hospitalId: hospital.id });
    }
    return result;
  }

  private async assignStudyNumbers(
    userId: string,
    groupIds: string[],
    options?: EntityOperationOptions,
    transaction?: OrionTransactionClient
  ) {
    for (const id of groupIds) {
      const group = await this.groupsService.findById(id, options);
      if (group.studyCode === 'OR') {
        await this.orionCodesService.assignInvestigator(id, userId, transaction);
      }
    }
  }

  private async withPromotedInvestigatorHospitals<T extends { id: string }>(users: T[]) {
    const promoted = await this.pendingInvestigatorModel.findMany({
      select: { hospital: true, promotedUserId: true },
      where: { promotedUserId: { in: users.map((user) => user.id) } }
    });
    const hospitalByUserId = new Map(promoted.map((entry) => [entry.promotedUserId, entry.hospital]));
    const numbers = await this.orionCodesService.findForUsers(users.map((user) => user.id));
    return users.map((user) => ({
      ...user,
      hospital: hospitalByUserId.get(user.id) ?? null,
      studyNumbers: numbers
        .filter((entry) => entry.investigatorId === user.id)
        .map(({ groupId, number }) => ({ groupId, number }))
    }));
  }

  async createPending(
    { groupIds, ...data }: CreatePendingInvestigatorData,
    options?: EntityOperationOptions
  ): Promise<PendingInvestigator> {
    if (data.basePermissionLevel !== 'STANDARD') {
      throw new BadRequestException('Pending investigators must use STANDARD permissions');
    }
    if (groupIds.length === 0) {
      throw new BadRequestException('Pending investigators must be assigned to at least one group');
    }

    const groups = [];

    for (const id of groupIds) {
      const group = await this.groupsService.findById(id, options);
      if (!group) {
        throw new NotFoundException(`Failed to resolve group with ID: ${id}`);
      }
      groups.push(group);
    }

    const studyHospitals = await this.resolveStudyHospitals(groupIds, data.studyHospitals, data.hospital, options);

    const normalizedEmail = this.normalizeEmail(data.email);
    if (!normalizedEmail) {
      throw new BadRequestException('Pending investigator email is required');
    }

    if (await this.userModel.exists({ email: normalizedEmail })) {
      throw new ConflictException(`User with email '${normalizedEmail}' already exists`);
    }

    if (await this.pendingInvestigatorModel.exists({ email: normalizedEmail })) {
      throw new ConflictException(`Pending investigator with email '${normalizedEmail}' already exists`);
    }

    return this.pendingInvestigatorModel.create({
      data: {
        ...data,
        studyHospitals,
        email: normalizedEmail,
        groupIds,
        mailError: null,
        mailSentAt: null,
        notes: data.notes ?? null,
        promotedAt: null,
        promotedUserId: null,
        status: 'PENDING'
      }
    });
  }

  async findPending(): Promise<PendingInvestigator[]> {
    return this.pendingInvestigatorModel.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async updatePendingById(id: string, update: UpdatePendingInvestigatorData): Promise<PendingInvestigator> {
    const pending = await this.pendingInvestigatorModel.findUnique({ where: { id } });
    if (!pending) {
      throw new NotFoundException(`Failed to find pending investigator with ID: ${id}`);
    }

    const normalizedEmail = this.normalizeEmail(update.email);
    const currentEmail = this.normalizeEmail(pending.email);
    if (normalizedEmail && normalizedEmail !== currentEmail) {
      if (await this.userModel.exists({ email: normalizedEmail })) {
        throw new ConflictException(`User with email '${normalizedEmail}' already exists`);
      }
      const otherPending = await this.pendingInvestigatorModel.findFirst({
        where: { email: normalizedEmail, NOT: { id } }
      });
      if (otherPending) {
        throw new ConflictException(`Pending investigator with email '${normalizedEmail}' already exists`);
      }
    }
    const studyHospitals =
      update.studyHospitals !== undefined || update.groupIds !== undefined || update.hospital !== undefined
        ? await this.resolveStudyHospitals(
            update.groupIds ?? pending.groupIds,
            update.studyHospitals ??
              pending.studyHospitals?.filter((entry) => (update.groupIds ?? pending.groupIds).includes(entry.groupId)),
            update.hospital ?? pending.hospital
          )
        : undefined;
    return this.pendingInvestigatorModel.update({
      data: {
        ...update,
        ...(studyHospitals ? { studyHospitals } : {}),
        email: normalizedEmail
      },
      where: { id }
    });
  }

  async deletePendingById(id: string): Promise<PendingInvestigator> {
    const pending = await this.pendingInvestigatorModel.findUnique({ where: { id } });
    if (!pending) {
      throw new NotFoundException(`Failed to find pending investigator with ID: ${id}`);
    }
    return this.pendingInvestigatorModel.delete({ where: { id } });
  }

  async promotePendingById(id: string, options?: EntityOperationOptions) {
    const pending = await this.pendingInvestigatorModel.findUnique({ where: { id } });
    if (!pending) {
      throw new NotFoundException(`Failed to find pending investigator with ID: ${id}`);
    }

    if (pending.promotedAt || pending.promotedUserId) {
      throw new ConflictException('This pending investigator was already promoted');
    }

    if (pending.professionalTitle !== 'Dr' && pending.professionalTitle !== 'Dra') {
      throw new BadRequestException(
        'Seleccione el tratamiento Dr. o Dra. antes de crear la cuenta y enviar el correo.'
      );
    }

    const normalizedPendingEmail = this.normalizeEmail(pending.email);
    if (normalizedPendingEmail && (await this.userModel.exists({ email: normalizedPendingEmail }))) {
      throw new ConflictException(`User with email '${normalizedPendingEmail}' already exists`);
    }

    const studyHospitals = await this.resolveStudyHospitals(
      pending.groupIds,
      pending.studyHospitals?.length ? pending.studyHospitals : undefined,
      pending.hospital,
      options
    );
    await this.onboardingMailService.verifyConnection();

    const usernameBase = this.buildUsername(pending.firstName, pending.lastName);
    const username = await this.resolveUniqueUsername(usernameBase);
    const password = this.generatePassword();

    let createdUser: Awaited<ReturnType<UsersService['create']>> | null = null;

    try {
      createdUser = await this.create(
        {
          basePermissionLevel: pending.basePermissionLevel,
          dateOfBirth: pending.dateOfBirth ?? undefined,
          email: normalizedPendingEmail,
          firstName: pending.firstName,
          groupIds: pending.groupIds,
          studyHospitals,
          professionalTitle: pending.professionalTitle,
          lastName: pending.lastName,
          password,
          sex: pending.sex ?? undefined,
          username
        },
        { ...options, skipPendingEmailConflict: true }
      );

      await this.onboardingMailService.sendWelcomeEmail({
        email: pending.email,
        firstName: pending.firstName,
        lastName: pending.lastName,
        password,
        professionalTitle: pending.professionalTitle,
        username
      });

      const updatedPending = await this.pendingInvestigatorModel.update({
        data: {
          mailError: null,
          mailSentAt: new Date(),
          promotedAt: new Date(),
          promotedUserId: createdUser.id,
          status: 'COMPLETED'
        },
        where: { id: pending.id }
      });

      return { pending: updatedPending, user: createdUser };
    } catch (error) {
      if (createdUser) {
        const userId = createdUser.id;
        await this.orionCodesService.transaction(async (transaction) => {
          await transaction.orionInvestigator.deleteMany({ where: { investigatorId: userId } });
          await transaction.user.delete({ where: { id: userId } });
        });
      }
      await this.pendingInvestigatorModel.update({
        data: {
          mailError: String(error),
          status: 'READY_FOR_ACCOUNT'
        },
        where: { id: pending.id }
      });
      throw error;
    }
  }

  private buildUsername(firstName: string, lastName: string) {
    const sanitize = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase();

    const firstInitial = sanitize(firstName).slice(0, 1);
    const firstSurname = sanitize(lastName.split(' ')[0] ?? lastName);

    const base = `${firstInitial}${firstSurname}`.trim();
    return base || `user${Date.now()}`;
  }

  private async resolveUniqueUsername(base: string) {
    if (!(await this.userModel.exists({ username: base }))) {
      return base;
    }
    let i = 1;
    while (await this.userModel.exists({ username: `${base}${i}` })) {
      i += 1;
    }
    return `${base}${i}`;
  }

  private generatePassword(length = 14) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let retVal = '';
    for (let i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  }

  private normalizeEmail(email?: null | string) {
    if (!email) {
      return undefined;
    }

    const normalized = email.trim().toLowerCase();
    return normalized || undefined;
  }
}
