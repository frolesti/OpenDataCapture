import { useMemo, useState } from 'react';

import {
  AlertDialog,
  Button,
  Checkbox,
  ClientTable,
  Dialog,
  Heading,
  Input,
  Label,
  Select,
  Table
} from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { BasePermissionLevel, PendingInvestigator, User } from '@opendatacapture/schemas/user';
import { createFileRoute } from '@tanstack/react-router';

import { PageHeader } from '@/components/PageHeader';
import {
  type PendingTypeFilter,
  type ProfileFilter,
  UserDirectoryControls
} from '@/components/admin/users/UserDirectoryControls';
import { formatHospitalLabel, serializeHospital, type HospitalMetadata } from '@/components/admin/groups/hospitals';
import { useCreatePendingInvestigatorMutation } from '@/hooks/useCreatePendingInvestigatorMutation';
import { useCreateUserMutation } from '@/hooks/useCreateUserMutation';
import { useDeleteUserMutation } from '@/hooks/useDeleteUserMutation';
import { useDeletePendingInvestigatorMutation } from '@/hooks/useDeletePendingInvestigatorMutation';
import { groupsQueryOptions, useGroupsQuery } from '@/hooks/useGroupsQuery';
import { pendingInvestigatorsQueryOptions, usePendingInvestigatorsQuery } from '@/hooks/usePendingInvestigatorsQuery';
import { usePromotePendingInvestigatorMutation } from '@/hooks/usePromotePendingInvestigatorMutation';
import { useSessionsQuery } from '@/hooks/useSessionsQuery';
import { useUsersQuery, usersQueryOptions } from '@/hooks/useUsersQuery';
import { useUpdateGroupByIdMutation } from '@/hooks/useUpdateGroupByIdMutation';
import { useUpdatePendingInvestigatorMutation } from '@/hooks/useUpdatePendingInvestigatorMutation';
import { useUpdateUserMutation } from '@/hooks/useUpdateUserMutation';
import { useAppStore } from '@/store';

function formatDate(value?: Date | null | string) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
}

function ellipsize(value: string, maxLength = 48) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function buildPendingForm(entry?: PendingInvestigator) {
  return {
    email: entry?.email ?? '',
    firstName: entry?.firstName ?? '',
    groupIds: entry?.groupIds ?? [],
    hospital: entry?.hospital ?? '',
    lastName: entry?.lastName ?? '',
    notes: entry?.notes ?? '',
    signed: entry?.signed ?? false
  };
}

function buildUserSearchText(user: User) {
  return `${user.firstName} ${user.lastName} ${user.username} ${user.email ?? ''}`.toLowerCase();
}

function buildUserEditForm(user?: User) {
  return {
    email: user?.email ?? '',
    firstName: user?.firstName ?? '',
    groupIds: user?.groupIds ?? [],
    lastName: user?.lastName ?? '',
    username: user?.username ?? ''
  };
}

function buildPendingSearchText(entry: PendingInvestigator) {
  return `${entry.firstName} ${entry.lastName} ${entry.email}`.toLowerCase();
}

type UserFormState = {
  basePermissionLevel: 'ADMIN' | 'GROUP_MANAGER';
  firstName: string;
  groupIds: string[];
  lastName: string;
  password: string;
  username: string;
};

type InvestigatorFormState = {
  email: string;
  firstName: string;
  groupIds: string[];
  hospital: string;
  lastName: string;
  notes: string;
  signed: boolean;
};

type CreatedUserFormState = {
  email: string;
  firstName: string;
  groupIds: string[];
  lastName: string;
  username: string;
};

type UserDirectoryRow = {
  basePermissionLevel: BasePermissionLevel | 'PENDING';
  email: string;
  firstName: string;
  groupIds: string[];
  id: string;
  kind: 'pending' | 'user';
  lastConnectionLabel: string;
  lastName: string;
  notes: string;
  profileLabel: string;
  searchText: string;
  username: string;
};

const DEFAULT_USER_FORM: UserFormState = {
  basePermissionLevel: 'GROUP_MANAGER',
  firstName: '',
  groupIds: [],
  lastName: '',
  password: '',
  username: ''
};

const DEFAULT_INVESTIGATOR_FORM: InvestigatorFormState = {
  email: '',
  firstName: '',
  groupIds: [],
  hospital: '',
  lastName: '',
  notes: '',
  signed: false
};

const DEFAULT_CREATED_USER_FORM: CreatedUserFormState = {
  email: '',
  firstName: '',
  groupIds: [],
  lastName: '',
  username: ''
};

const DEFAULT_HOSPITAL_FORM: HospitalMetadata = {
  locality: '',
  name: '',
  province: '',
  state: ''
};

const RouteComponent = () => {
  const currentUser = useAppStore((store) => store.currentUser);
  const { t } = useTranslation();
  const groupsQuery = useGroupsQuery();
  const pendingInvestigatorsQuery = usePendingInvestigatorsQuery();
  const usersQuery = useUsersQuery();
  const sessionsQuery = useSessionsQuery();
  const createUserMutation = useCreateUserMutation();
  const createPendingMutation = useCreatePendingInvestigatorMutation();
  const deleteUserMutation = useDeleteUserMutation();
  const updateUserMutation = useUpdateUserMutation();
  const updatePendingMutation = useUpdatePendingInvestigatorMutation();
  const updateGroupMutation = useUpdateGroupByIdMutation();
  const promotePendingMutation = usePromotePendingInvestigatorMutation();
  const deletePendingMutation = useDeletePendingInvestigatorMutation();

  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isInvestigatorDialogOpen, setIsInvestigatorDialogOpen] = useState(false);
  const [isHospitalDialogOpen, setIsHospitalDialogOpen] = useState(false);
  const [isPendingDialogOpen, setIsPendingDialogOpen] = useState(false);
  const [isCreatedUserDialogOpen, setIsCreatedUserDialogOpen] = useState(false);
  const [isCreatedUserDeleteConfirmOpen, setIsCreatedUserDeleteConfirmOpen] = useState(false);
  const [isSignedPromotionConfirmOpen, setIsSignedPromotionConfirmOpen] = useState(false);
  const [isBulkSignedPromotionConfirmOpen, setIsBulkSignedPromotionConfirmOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'pending' | 'users'>('users');
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>('ALL');
  const [pendingTypeFilter, setPendingTypeFilter] = useState<PendingTypeFilter>('ALL');
  const [userGroupFilter, setUserGroupFilter] = useState<string>('ALL');
  const [pendingGroupFilter, setPendingGroupFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [hospitalDialogTarget, setHospitalDialogTarget] = useState<'create' | 'edit'>('create');
  const [userForm, setUserForm] = useState<UserFormState>(DEFAULT_USER_FORM);
  const [investigatorForm, setInvestigatorForm] = useState<InvestigatorFormState>(DEFAULT_INVESTIGATOR_FORM);
  const [pendingDialogForm, setPendingDialogForm] = useState<InvestigatorFormState>(DEFAULT_INVESTIGATOR_FORM);
  const [createdUserDialogForm, setCreatedUserDialogForm] = useState<CreatedUserFormState>(DEFAULT_CREATED_USER_FORM);
  const [hospitalForm, setHospitalForm] = useState<HospitalMetadata>(DEFAULT_HOSPITAL_FORM);
  const [selectedPendingId, setSelectedPendingId] = useState<null | string>(null);
  const [selectedUserId, setSelectedUserId] = useState<null | string>(null);
  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([]);

  const groupOptions = useMemo(
    () => (groupsQuery.data ?? []).map((group) => ({ id: group.id, name: group.name, hospitals: group.hospitals })),
    [groupsQuery.data]
  );

  const getHospitalOptions = (groupIds: string[]) => {
    const selectedGroups = groupOptions.filter((group) => groupIds.includes(group.id));
    return Array.from(
      new Set(
        selectedGroups
          .flatMap((group) => group.hospitals)
          .map((hospital) => hospital.trim())
          .filter(Boolean)
      )
    ).sort((left, right) => left.localeCompare(right));
  };

  const investigatorHospitalOptions = useMemo(() => {
    return getHospitalOptions(investigatorForm.groupIds);
  }, [groupOptions, investigatorForm.groupIds]);

  const pendingDialogHospitalOptions = useMemo(() => {
    return getHospitalOptions(pendingDialogForm.groupIds);
  }, [groupOptions, pendingDialogForm.groupIds]);

  const pendingRows = useMemo(
    () => (pendingInvestigatorsQuery.data ?? []).filter((entry) => !entry.promotedAt),
    [pendingInvestigatorsQuery.data]
  );

  const createdUsers = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const groupNameById = useMemo(() => new Map(groupOptions.map((group) => [group.id, group.name])), [groupOptions]);

  const summarizeGroups = (groupIds: string[]) => {
    const names = groupIds.map((id) => groupNameById.get(id) ?? id).filter(Boolean);
    if (names.length === 0) {
      return '-';
    }
    if (names.length <= 2) {
      return names.join(', ');
    }
    return `${names[0]}, ${names[1]} +${names.length - 2}`;
  };

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const filteredPendingRows = useMemo(() => {
    return pendingRows.filter((entry) => {
      if (!buildPendingSearchText(entry).includes(normalizedSearchTerm)) {
        return false;
      }

      if (pendingTypeFilter === 'PENDING_INVESTIGATOR' && entry.promotedAt) {
        return false;
      }

      if (pendingGroupFilter !== 'ALL' && !entry.groupIds.includes(pendingGroupFilter)) {
        return false;
      }

      return true;
    });
  }, [normalizedSearchTerm, pendingGroupFilter, pendingRows, pendingTypeFilter]);

  const sessionsByUserId = useMemo(() => {
    const byUserId = new Map<string, typeof sessionsQuery.data>();
    for (const session of sessionsQuery.data ?? []) {
      if (!session.userId) {
        continue;
      }
      const current = byUserId.get(session.userId) ?? [];
      current.push(session);
      byUserId.set(session.userId, current);
    }
    return byUserId;
  }, [sessionsQuery.data]);

  const getLastConnectionLabel = (userId: string) => {
    const sessions = sessionsByUserId.get(userId) ?? [];
    if (!sessions.length) {
      return '-';
    }
    return formatDate(sessions[0]?.createdAt);
  };

  const userDirectoryRows = useMemo<UserDirectoryRow[]>(() => {
    const userRows: UserDirectoryRow[] = createdUsers.map((entry) => {
      const basePermissionLevel = entry.basePermissionLevel ?? 'GROUP_MANAGER';
      const profileLabel =
        entry.username === currentUser?.username
          ? t({ en: 'Usuari (Tu)', fr: 'Usuario (Tú)' })
          : basePermissionLevel === 'STANDARD'
            ? t({ en: 'Investigador', fr: 'Investigador' })
            : t({ en: 'Usuari', fr: 'Usuario' });

      return {
        basePermissionLevel,
        email: entry.email ?? '-',
        firstName: entry.firstName,
        groupIds: entry.groupIds,
        id: entry.id,
        kind: 'user',
        lastConnectionLabel: basePermissionLevel === 'STANDARD' ? getLastConnectionLabel(entry.id) : '-',
        lastName: entry.lastName,
        notes: '-',
        profileLabel,
        searchText: buildUserSearchText(entry),
        username: entry.username
      };
    });

    const pendingDirectoryRows: UserDirectoryRow[] = pendingRows.map((entry) => ({
      basePermissionLevel: 'PENDING',
      email: entry.email,
      firstName: entry.firstName,
      groupIds: entry.groupIds,
      id: entry.id,
      kind: 'pending',
      lastConnectionLabel: '-',
      lastName: entry.lastName,
      notes: entry.notes?.trim() || '-',
      profileLabel: t({ en: 'Investigador (pendent)', fr: 'Investigador (pendiente)' }),
      searchText: buildPendingSearchText(entry),
      username: '-'
    }));

    return [...userRows, ...pendingDirectoryRows];
  }, [createdUsers, currentUser?.username, pendingRows, sessionsByUserId, t]);

  const filteredUserDirectoryRows = useMemo(() => {
    const profileFiltered = userDirectoryRows.filter((entry) => {
      if (profileFilter === 'ALL') {
        return true;
      }
      if (profileFilter === 'PENDING_INVESTIGATOR') {
        return entry.kind === 'pending';
      }
      if (profileFilter === 'INVESTIGATOR') {
        return entry.kind === 'user' && entry.basePermissionLevel === 'STANDARD';
      }
      return entry.kind === 'user' && entry.basePermissionLevel !== 'STANDARD';
    });

    return profileFiltered.filter((entry) => {
      if (!entry.searchText.includes(normalizedSearchTerm)) {
        return false;
      }

      if (userGroupFilter !== 'ALL' && !entry.groupIds.includes(userGroupFilter)) {
        return false;
      }

      return true;
    });
  }, [normalizedSearchTerm, profileFilter, userDirectoryRows, userGroupFilter]);
  const pendingById = useMemo(() => new Map(pendingRows.map((entry) => [entry.id, entry])), [pendingRows]);
  const visiblePendingIds = useMemo(() => filteredPendingRows.map((entry) => entry.id), [filteredPendingRows]);
  const areAllVisiblePendingSelected =
    visiblePendingIds.length > 0 && visiblePendingIds.every((id) => selectedPendingIds.includes(id));

  const selectedCreatedUser = useMemo(
    () => createdUsers.find((entry) => entry.id === selectedUserId) ?? null,
    [createdUsers, selectedUserId]
  );
  const selectedCreatedUserSessions = useMemo(() => {
    if (!selectedCreatedUser?.id) {
      return [];
    }
    return sessionsByUserId.get(selectedCreatedUser.id) ?? [];
  }, [selectedCreatedUser?.id, sessionsByUserId]);
  const showEmailField = selectedCreatedUser?.basePermissionLevel !== 'STANDARD';

  const canCreateUser =
    userForm.firstName.trim().length > 0 &&
    userForm.lastName.trim().length > 0 &&
    userForm.username.trim().length > 0 &&
    userForm.password.trim().length > 0 &&
    (userForm.basePermissionLevel === 'ADMIN' || userForm.groupIds.length > 0);

  const canCreateInvestigator =
    investigatorForm.firstName.trim().length > 0 &&
    investigatorForm.lastName.trim().length > 0 &&
    investigatorForm.email.trim().length > 0 &&
    investigatorForm.groupIds.length > 0 &&
    investigatorForm.hospital.trim().length > 0;

  const canOpenCreateHospitalDialog = (groupIds: string[]) => groupIds.length > 0;
  const canCreateHospital = (groupIds: string[]) => hospitalForm.name.trim().length > 0 && groupIds.length > 0;
  const canSavePendingDialog =
    pendingDialogForm.firstName.trim().length > 0 &&
    pendingDialogForm.lastName.trim().length > 0 &&
    pendingDialogForm.email.trim().length > 0 &&
    pendingDialogForm.groupIds.length > 0 &&
    pendingDialogForm.hospital.trim().length > 0;

  const canSaveCreatedUserDialog =
    createdUserDialogForm.firstName.trim().length > 0 &&
    createdUserDialogForm.lastName.trim().length > 0 &&
    createdUserDialogForm.username.trim().length > 0;

  const isBusy =
    createUserMutation.isPending ||
    createPendingMutation.isPending ||
    updatePendingMutation.isPending ||
    updateGroupMutation.isPending ||
    promotePendingMutation.isPending ||
    deletePendingMutation.isPending;

  const isPendingDialogBusy =
    updatePendingMutation.isPending || promotePendingMutation.isPending || deletePendingMutation.isPending;

  const isCreatedUserDialogBusy = updateUserMutation.isPending;
  const isCreatedUserDeleteBusy = deleteUserMutation.isPending;

  const toggleGroups = (current: string[], groupId: string) =>
    current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId];

  const openPendingDialog = (entry: PendingInvestigator) => {
    setSelectedPendingId(entry.id);
    setPendingDialogForm(buildPendingForm(entry));
    setIsPendingDialogOpen(true);
  };

  const closePendingDialog = () => {
    setIsPendingDialogOpen(false);
    setIsSignedPromotionConfirmOpen(false);
    setIsBulkSignedPromotionConfirmOpen(false);
    setSelectedPendingId(null);
    setPendingDialogForm(DEFAULT_INVESTIGATOR_FORM);
  };

  const openCreatedUserDialog = (entry: User) => {
    setSelectedUserId(entry.id);
    setCreatedUserDialogForm(buildUserEditForm(entry));
    setIsCreatedUserDialogOpen(true);
  };

  const closeCreatedUserDialog = () => {
    setIsCreatedUserDialogOpen(false);
    setSelectedUserId(null);
    setCreatedUserDialogForm(DEFAULT_CREATED_USER_FORM);
    setIsCreatedUserDeleteConfirmOpen(false);
  };

  const resetUserDialog = () => {
    setUserForm(DEFAULT_USER_FORM);
    setIsUserDialogOpen(false);
  };

  const resetInvestigatorDialog = () => {
    setInvestigatorForm(DEFAULT_INVESTIGATOR_FORM);
    setIsInvestigatorDialogOpen(false);
  };

  const resetHospitalDialog = () => {
    setHospitalForm(DEFAULT_HOSPITAL_FORM);
    setIsHospitalDialogOpen(false);
    setHospitalDialogTarget('create');
  };

  const buildPendingUpdateData = (form: InvestigatorFormState, signed: boolean) => ({
    basePermissionLevel: 'STANDARD' as const,
    email: form.email.trim(),
    firstName: form.firstName.trim(),
    groupIds: form.groupIds,
    hospital: form.hospital,
    lastName: form.lastName.trim(),
    notes: form.notes.trim() || undefined,
    signed
  });

  const handleCreateUser = async () => {
    if (!canCreateUser) {
      return;
    }
    try {
      await createUserMutation.mutateAsync({
        data: {
          basePermissionLevel: userForm.basePermissionLevel as BasePermissionLevel,
          firstName: userForm.firstName.trim(),
          groupIds: userForm.groupIds,
          lastName: userForm.lastName.trim(),
          password: userForm.password,
          username: userForm.username.trim()
        }
      });
      resetUserDialog();
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateInvestigator = async () => {
    if (!canCreateInvestigator) {
      return;
    }
    try {
      const createdPending = await createPendingMutation.mutateAsync({
        data: {
          basePermissionLevel: 'STANDARD',
          email: investigatorForm.email.trim(),
          firstName: investigatorForm.firstName.trim(),
          groupIds: investigatorForm.groupIds,
          hospital: investigatorForm.hospital,
          lastName: investigatorForm.lastName.trim(),
          notes: investigatorForm.notes.trim() || undefined,
          signed: investigatorForm.signed
        },
        suppressSuccessNotification: investigatorForm.signed
      });

      if (investigatorForm.signed) {
        await promotePendingMutation.mutateAsync({ id: createdPending.id });
      }

      resetInvestigatorDialog();
    } catch (error) {
      console.error(error);
    }
  };

  const handleSavePendingDialog = async (signedOverride?: boolean) => {
    if (!selectedPendingId || !canSavePendingDialog) {
      return;
    }

    await updatePendingMutation.mutateAsync({
      data: buildPendingUpdateData(pendingDialogForm, signedOverride ?? pendingDialogForm.signed),
      id: selectedPendingId
    });
  };

  const handleConfirmSignedPromotion = async () => {
    if (!selectedPendingId || !canSavePendingDialog) {
      return;
    }

    try {
      await handleSavePendingDialog(true);
      await promotePendingMutation.mutateAsync({ id: selectedPendingId });
      setIsSignedPromotionConfirmOpen(false);
      closePendingDialog();
    } catch (error) {
      console.error(error);
    }
  };

  const handleSavePendingDialogAction = async () => {
    if (!selectedPendingId || !canSavePendingDialog) {
      return;
    }

    if (pendingDialogForm.signed) {
      setIsSignedPromotionConfirmOpen(true);
      return;
    }

    try {
      await handleSavePendingDialog(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeletePendingDialog = async () => {
    if (!selectedPendingId) {
      return;
    }

    try {
      await deletePendingMutation.mutateAsync({ id: selectedPendingId });
      closePendingDialog();
    } catch (error) {
      console.error(error);
    }
  };

  const togglePendingBulkSelection = (id: string) => {
    setSelectedPendingIds((current) =>
      current.includes(id) ? current.filter((pendingId) => pendingId !== id) : [...current, id]
    );
  };

  const handleToggleAllVisiblePending = () => {
    setSelectedPendingIds((current) => {
      if (areAllVisiblePendingSelected) {
        return current.filter((id) => !visiblePendingIds.includes(id));
      }
      return Array.from(new Set([...current, ...visiblePendingIds]));
    });
  };

  const handleMarkSelectedPendingAsSigned = async () => {
    if (!selectedPendingIds.length) {
      return;
    }

    try {
      for (const id of selectedPendingIds) {
        const pending = pendingById.get(id);
        if (!pending) {
          continue;
        }

        if (!pending.signed) {
          await updatePendingMutation.mutateAsync({
            data: { signed: true },
            id
          });
        }

        await promotePendingMutation.mutateAsync({ id });
      }
      setSelectedPendingIds([]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleConfirmBulkSignedPromotion = async () => {
    await handleMarkSelectedPendingAsSigned();
    setIsBulkSignedPromotionConfirmOpen(false);
  };

  const handleSaveCreatedUserDialog = async () => {
    if (!selectedUserId || !canSaveCreatedUserDialog) {
      return;
    }

    try {
      await updateUserMutation.mutateAsync({
        data: {
          firstName: createdUserDialogForm.firstName.trim(),
          groupIds: createdUserDialogForm.groupIds,
          lastName: createdUserDialogForm.lastName.trim(),
          username: createdUserDialogForm.username.trim()
        },
        id: selectedUserId
      });
      closeCreatedUserDialog();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteCreatedUser = async () => {
    if (!selectedCreatedUser) {
      return;
    }

    if (selectedCreatedUser.username === currentUser?.username) {
      return;
    }

    try {
      await deleteUserMutation.mutateAsync({ id: selectedCreatedUser.id });
      closeCreatedUserDialog();
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpenUserDirectoryEntry = (entry: UserDirectoryRow) => {
    if (entry.kind === 'pending') {
      const pending = pendingById.get(entry.id);
      if (pending) {
        openPendingDialog(pending);
      }
      return;
    }

    const user = createdUsers.find((candidate) => candidate.id === entry.id);
    if (user) {
      openCreatedUserDialog(user);
    }
  };

  const handleCreateHospital = async () => {
    const targetGroupIds = hospitalDialogTarget === 'edit' ? pendingDialogForm.groupIds : investigatorForm.groupIds;
    if (!canCreateHospital(targetGroupIds)) {
      return;
    }

    const serializedHospital = serializeHospital(hospitalForm);
    if (!serializedHospital) {
      return;
    }

    try {
      const selectedGroups = groupOptions.filter((group) => targetGroupIds.includes(group.id));
      for (const group of selectedGroups) {
        const nextHospitals = Array.from(new Set([...group.hospitals, serializedHospital]));
        await updateGroupMutation.mutateAsync({
          data: { hospitals: nextHospitals },
          id: group.id
        });
      }

      if (hospitalDialogTarget === 'edit') {
        setPendingDialogForm((current) => ({ ...current, hospital: serializedHospital }));
      } else {
        setInvestigatorForm((current) => ({ ...current, hospital: serializedHospital }));
      }
      resetHospitalDialog();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader>
        <Heading className="text-center" variant="h2">
          {t({
            en: "Gestio d'usuaris",
            fr: 'Gestión de usuarios'
          })}
        </Heading>
      </PageHeader>

      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              className="bg-violet-600 text-white hover:bg-violet-700"
              type="button"
              variant="primary"
              onClick={() => setIsUserDialogOpen(true)}
            >
              {t({ en: 'Afegir usuari', fr: 'Añadir usuario' })}
            </Button>
            <Button
              className="border-violet-600 bg-violet-100 text-violet-800 hover:bg-violet-200"
              type="button"
              variant="outline"
              onClick={() => setIsInvestigatorDialogOpen(true)}
            >
              {t({ en: 'Afegir investigador', fr: 'Añadir investigador' })}
            </Button>
          </div>
        </div>

        <UserDirectoryControls
          groupOptions={groupOptions.map((group) => ({ id: group.id, name: group.name }))}
          pendingGroupFilter={pendingGroupFilter}
          pendingTypeFilter={pendingTypeFilter}
          profileFilter={profileFilter}
          searchTerm={searchTerm}
          setPendingGroupFilter={setPendingGroupFilter}
          setPendingTypeFilter={setPendingTypeFilter}
          setProfileFilter={setProfileFilter}
          setSearchTerm={setSearchTerm}
          setUserGroupFilter={setUserGroupFilter}
          setViewMode={setViewMode}
          userGroupFilter={userGroupFilter}
          viewMode={viewMode}
        />

        {viewMode === 'pending' ? (
          <div className="space-y-3">
            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Checkbox checked={areAllVisiblePendingSelected} onCheckedChange={handleToggleAllVisiblePending} />
                  <span>{t({ en: 'Seleccionar todos', fr: 'Seleccionar todos' })}</span>
                </label>
                <Button
                  disabled={!selectedPendingIds.length || isPendingDialogBusy}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => setIsBulkSignedPromotionConfirmOpen(true)}
                >
                  {selectedPendingIds.length <= 1
                    ? t({ en: 'Crear usuario', fr: 'Crear usuario' })
                    : t({ en: 'Crear usuarios', fr: 'Crear usuarios' })}
                </Button>
              </div>
            </div>

            <div className="bg-card text-muted-foreground shadow-xs rounded-md border tracking-tight">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Head className="text-foreground whitespace-nowrap">#</Table.Head>
                    <Table.Head className="text-foreground whitespace-nowrap">
                      {t({ en: 'Nom', fr: 'Nombre' })}
                    </Table.Head>
                    <Table.Head className="text-foreground whitespace-nowrap">
                      {t({ en: 'Correu', fr: 'Correo' })}
                    </Table.Head>
                    <Table.Head className="text-foreground whitespace-nowrap">
                      {t({ en: 'Hospital', fr: 'Hospital' })}
                    </Table.Head>
                    <Table.Head className="text-foreground whitespace-nowrap">
                      {t({ en: 'Signat', fr: 'Firmado' })}
                    </Table.Head>
                    <Table.Head className="text-foreground whitespace-nowrap">
                      {t({ en: 'Mail enviat', fr: 'Mail enviado' })}
                    </Table.Head>
                    <Table.Head className="text-foreground whitespace-nowrap">
                      {t({ en: 'Grups', fr: 'Grupos' })}
                    </Table.Head>
                    <Table.Head className="text-foreground whitespace-nowrap">
                      {t({ en: 'Comentaris', fr: 'Comentarios' })}
                    </Table.Head>
                    <Table.Head className="text-foreground whitespace-nowrap">
                      {t({ en: 'Creat', fr: 'Creado' })}
                    </Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredPendingRows.map((entry) => (
                    <Table.Row className="cursor-pointer" key={entry.id} onClick={() => openPendingDialog(entry)}>
                      <Table.Cell
                        className="w-10"
                        onClick={(event) => {
                          event.stopPropagation();
                        }}
                      >
                        <Checkbox
                          checked={selectedPendingIds.includes(entry.id)}
                          onCheckedChange={() => togglePendingBulkSelection(entry.id)}
                        />
                      </Table.Cell>
                      <Table.Cell>{`${entry.firstName} ${entry.lastName}`}</Table.Cell>
                      <Table.Cell>{entry.email}</Table.Cell>
                      <Table.Cell>{formatHospitalLabel(entry.hospital)}</Table.Cell>
                      <Table.Cell>{entry.signed ? t({ en: 'Sí', fr: 'Sí' }) : t({ en: 'No', fr: 'No' })}</Table.Cell>
                      <Table.Cell>{formatDate(entry.mailSentAt)}</Table.Cell>
                      <Table.Cell>{summarizeGroups(entry.groupIds)}</Table.Cell>
                      <Table.Cell>{ellipsize(entry.notes?.trim() || '-')}</Table.Cell>
                      <Table.Cell>{formatDate(entry.createdAt)}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <ClientTable<UserDirectoryRow>
              columns={[
                {
                  field: (entry) => `${entry.firstName} ${entry.lastName}`,
                  label: t({
                    en: 'Nom',
                    fr: 'Nombre'
                  })
                },
                {
                  field: ({ email }) => email,
                  label: t({ en: 'Correu', fr: 'Correo' })
                },
                {
                  field: ({ username }) => username,
                  label: t({
                    en: 'Usuari',
                    fr: 'Usuario'
                  })
                },
                {
                  field: ({ profileLabel }) => profileLabel,
                  label: t({ en: 'Perfil', fr: 'Perfil' })
                },
                {
                  field: ({ groupIds }) => summarizeGroups(groupIds),
                  label: t({
                    en: 'Grups',
                    fr: 'Grupos'
                  })
                },
                {
                  field: ({ lastConnectionLabel }) => lastConnectionLabel,
                  label: t({
                    en: 'Última connexió',
                    fr: 'Última conexión'
                  })
                },
                {
                  field: ({ notes }) => ellipsize(notes),
                  label: t({ en: 'Comentaris', fr: 'Comentarios' })
                }
              ]}
              data={filteredUserDirectoryRows}
              entriesPerPage={10}
              minRows={10}
              onEntryClick={handleOpenUserDirectoryEntry}
            />
          </div>
        )}
      </div>

      <Dialog
        open={isCreatedUserDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeCreatedUserDialog();
          }
        }}
      >
        <Dialog.Content className="max-h-[90vh] overflow-y-auto">
          <Dialog.Header>
            <Dialog.Title>{t({ en: 'Editar usuari', fr: 'Editar usuario' })}</Dialog.Title>
            <Dialog.Description>
              {t({
                en: "Podeu editar dades bàsiques de l'usuari.",
                fr: 'Puedes editar datos básicos del usuario.'
              })}
            </Dialog.Description>
          </Dialog.Header>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="created-user-first-name">{t({ en: 'Nom', fr: 'Nombre' })}</Label>
              <Input
                id="created-user-first-name"
                value={createdUserDialogForm.firstName}
                onChange={(event) =>
                  setCreatedUserDialogForm((current) => ({ ...current, firstName: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="created-user-last-name">{t({ en: 'Cognoms', fr: 'Apellidos' })}</Label>
              <Input
                id="created-user-last-name"
                value={createdUserDialogForm.lastName}
                onChange={(event) =>
                  setCreatedUserDialogForm((current) => ({ ...current, lastName: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="created-user-username">{t({ en: "Nom d'usuari", fr: 'Nombre de usuario' })}</Label>
              <Input
                id="created-user-username"
                value={createdUserDialogForm.username}
                onChange={(event) =>
                  setCreatedUserDialogForm((current) => ({ ...current, username: event.target.value }))
                }
              />
            </div>
            {showEmailField ? (
              <div className="grid gap-2">
                <Label htmlFor="created-user-email">{t({ en: 'Correu', fr: 'Correo' })}</Label>
                <Input id="created-user-email" disabled value={createdUserDialogForm.email || '-'} />
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label>{t('common.groups')}</Label>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                {groupOptions.map((group) => {
                  const checked = createdUserDialogForm.groupIds.includes(group.id);
                  return (
                    <label key={group.id} className="flex items-start gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() =>
                          setCreatedUserDialogForm((current) => ({
                            ...current,
                            groupIds: toggleGroups(current.groupIds, group.id)
                          }))
                        }
                      />
                      <span>{group.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            {selectedCreatedUser?.basePermissionLevel === 'STANDARD' ? (
              <div className="grid gap-2">
                <Label>{t({ en: 'Històric de sessions', fr: 'Histórico de sesiones' })}</Label>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3 text-sm">
                  {selectedCreatedUserSessions.length ? (
                    selectedCreatedUserSessions.map((session) => (
                      <div className="rounded border px-3 py-2" key={session.id}>
                        <p className="font-medium">{formatDate(session.createdAt)}</p>
                        <p className="text-muted-foreground">
                          {t({ en: 'Tipus', fr: 'Tipo' })}: {session.type}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">
                      {t({ en: 'Sense sessions registrades', fr: 'Sin sesiones registradas' })}
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <Dialog.Footer className="w-full justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeCreatedUserDialog}>
              {t('core.cancel')}
            </Button>
            <Button
              className="border-red-300 text-red-700 hover:bg-red-50"
              disabled={selectedCreatedUser?.username === currentUser?.username || isCreatedUserDeleteBusy}
              type="button"
              variant="outline"
              onClick={() => setIsCreatedUserDeleteConfirmOpen(true)}
            >
              {t({ en: 'Eliminar usuari', fr: 'Eliminar usuario' })}
            </Button>
            <Button
              className="ml-auto bg-violet-600 text-white hover:bg-violet-700 disabled:bg-violet-300 disabled:text-white"
              disabled={!canSaveCreatedUserDialog || isCreatedUserDialogBusy}
              type="button"
              variant="primary"
              onClick={() => void handleSaveCreatedUserDialog()}
            >
              {t('core.save')}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>

      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <Dialog.Content className="max-h-[90vh] overflow-y-auto">
          <Dialog.Header>
            <Dialog.Title>{t({ en: 'Afegir usuari', fr: 'Añadir usuario' })}</Dialog.Title>
            <Dialog.Description>
              {t({
                en: "Crea un usuari intern amb rol d'administrador o gestor de grup.",
                fr: 'Crea un usuario interno con rol de administrador o gestor de grupo.'
              })}
            </Dialog.Description>
          </Dialog.Header>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="user-first-name">{t({ en: 'Nom', fr: 'Nombre' })}</Label>
              <Input
                id="user-first-name"
                value={userForm.firstName}
                onChange={(event) => setUserForm((current) => ({ ...current, firstName: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="user-last-name">{t({ en: 'Cognoms', fr: 'Apellidos' })}</Label>
              <Input
                id="user-last-name"
                value={userForm.lastName}
                onChange={(event) => setUserForm((current) => ({ ...current, lastName: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="user-username">{t('common.username')}</Label>
              <Input
                id="user-username"
                value={userForm.username}
                onChange={(event) => setUserForm((current) => ({ ...current, username: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="user-password">{t('common.password')}</Label>
              <Input
                id="user-password"
                type="password"
                value={userForm.password}
                onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('common.basePermissionLevel')}</Label>
              <Select
                value={userForm.basePermissionLevel}
                onValueChange={(value) =>
                  setUserForm((current) => ({ ...current, basePermissionLevel: value as 'ADMIN' | 'GROUP_MANAGER' }))
                }
              >
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="ADMIN">{t('common.admin')}</Select.Item>
                  <Select.Item value="GROUP_MANAGER">{t('common.groupManager')}</Select.Item>
                </Select.Content>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t('common.groups')}</Label>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                {groupOptions.map((group) => {
                  const checked = userForm.groupIds.includes(group.id);
                  return (
                    <label key={group.id} className="flex items-start gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() =>
                          setUserForm((current) => ({ ...current, groupIds: toggleGroups(current.groupIds, group.id) }))
                        }
                      />
                      <span>{group.name}</span>
                    </label>
                  );
                })}
              </div>
              {userForm.basePermissionLevel === 'GROUP_MANAGER' ? (
                <p className="text-muted-foreground text-xs">
                  {t({
                    en: "Els gestors de grup han d'estar assignats com a mínim a un grup.",
                    fr: 'Los gestores de grupo deben estar asignados al menos a un grupo.'
                  })}
                </p>
              ) : null}
            </div>
          </div>

          <Dialog.Footer>
            <Button type="button" variant="outline" onClick={resetUserDialog}>
              {t('core.cancel')}
            </Button>
            <Button
              className="bg-violet-600 text-white hover:bg-violet-700 disabled:bg-violet-300 disabled:text-white"
              disabled={!canCreateUser || isBusy}
              type="button"
              variant="primary"
              onClick={() => void handleCreateUser()}
            >
              {t({ en: 'Afegir usuari', fr: 'Añadir usuario' })}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>

      <Dialog open={isInvestigatorDialogOpen} onOpenChange={setIsInvestigatorDialogOpen}>
        <Dialog.Content className="max-h-[90vh] overflow-y-auto">
          <Dialog.Header>
            <Dialog.Title>{t({ en: 'Afegir investigador', fr: 'Añadir investigador' })}</Dialog.Title>
            <Dialog.Description>
              {t({
                en: "Els investigadors sempre es creen com a usuaris estàndard i han d'estar assignats a un grup.",
                fr: 'Los investigadores siempre se crean como usuarios estándar y deben estar asignados a un grupo.'
              })}
            </Dialog.Description>
          </Dialog.Header>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="investigator-first-name">{t({ en: 'Nom', fr: 'Nombre' })}</Label>
              <Input
                id="investigator-first-name"
                value={investigatorForm.firstName}
                onChange={(event) => setInvestigatorForm((current) => ({ ...current, firstName: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="investigator-last-name">{t({ en: 'Cognoms', fr: 'Apellidos' })}</Label>
              <Input
                id="investigator-last-name"
                value={investigatorForm.lastName}
                onChange={(event) => setInvestigatorForm((current) => ({ ...current, lastName: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="investigator-email">{t({ en: 'Correu', fr: 'Correo' })}</Label>
              <Input
                id="investigator-email"
                type="email"
                value={investigatorForm.email}
                onChange={(event) => setInvestigatorForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('common.groups')}</Label>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                {groupOptions.map((group) => {
                  const checked = investigatorForm.groupIds.includes(group.id);
                  return (
                    <label key={group.id} className="flex items-start gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() =>
                          setInvestigatorForm((current) => {
                            const nextGroupIds = toggleGroups(current.groupIds, group.id);
                            const nextHospitalOptions = Array.from(
                              new Set(
                                groupOptions
                                  .filter((entry) => nextGroupIds.includes(entry.id))
                                  .flatMap((entry) => entry.hospitals)
                                  .map((hospital) => hospital.trim())
                                  .filter(Boolean)
                              )
                            );
                            return {
                              ...current,
                              groupIds: nextGroupIds,
                              hospital: nextHospitalOptions.includes(current.hospital) ? current.hospital : ''
                            };
                          })
                        }
                      />
                      <span>{group.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t({ en: 'Hospital / Centre', fr: 'Hospital / Centro' })}</Label>
              <p className="text-muted-foreground text-xs">
                {t({
                  en: "L'hospital disponible depèn dels grups seleccionats. Si no hi és, el podeu crear directament des d'aquí.",
                  fr: 'El hospital disponible depende de los grupos seleccionados. Si no está, puedes crearlo directamente desde aquí.'
                })}
              </p>
              <Select
                value={investigatorForm.hospital}
                onValueChange={(value) => setInvestigatorForm((current) => ({ ...current, hospital: value }))}
              >
                <Select.Trigger disabled={investigatorHospitalOptions.length === 0}>
                  {investigatorForm.hospital ? (
                    formatHospitalLabel(investigatorForm.hospital)
                  ) : (
                    <Select.Value placeholder={t({ en: 'Selecciona un hospital', fr: 'Selecciona un hospital' })} />
                  )}
                </Select.Trigger>
                <Select.Content>
                  {investigatorHospitalOptions.map((hospital) => (
                    <Select.Item key={hospital} value={hospital}>
                      {formatHospitalLabel(hospital)}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
              <Button
                disabled={!canOpenCreateHospitalDialog(investigatorForm.groupIds) || isBusy}
                type="button"
                variant="outline"
                onClick={() => {
                  setHospitalDialogTarget('create');
                  setHospitalForm(DEFAULT_HOSPITAL_FORM);
                  setIsHospitalDialogOpen(true);
                }}
              >
                {t({ en: 'Crear hospital nou', fr: 'Crear hospital nuevo' })}
              </Button>
              {investigatorForm.groupIds.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  {t({
                    en: 'Selecciona primer un o més grups per carregar els hospitals disponibles.',
                    fr: 'Selecciona primero uno o más grupos para cargar los hospitales disponibles.'
                  })}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="investigator-notes">
                {t({ en: 'Comentaris (només pendent)', fr: 'Comentarios (solo pendiente)' })}
              </Label>
              <textarea
                className="bg-background min-h-24 rounded-md border px-3 py-2 text-sm"
                id="investigator-notes"
                placeholder={t({
                  en: 'Afegiu comentaris interns sobre aquest investigador pendent',
                  fr: 'Añade comentarios internos sobre este investigador pendiente'
                })}
                value={investigatorForm.notes}
                onChange={(event) => setInvestigatorForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>
            <div className="grid gap-2 rounded-md border p-3">
              <label className="flex items-start gap-3">
                <Checkbox
                  checked={investigatorForm.signed}
                  onCheckedChange={(checked) =>
                    setInvestigatorForm((current) => ({ ...current, signed: Boolean(checked) }))
                  }
                />
                <div>
                  <span className="text-sm font-medium">{t({ en: 'Signat', fr: 'Firmado' })}</span>
                  <p className="text-muted-foreground text-xs">
                    {t({
                      en: "Si marques aquesta casella, es crearà automàticament el compte d'usuari i s'enviarà el mail de benvinguda.",
                      fr: 'Si marcas esta casilla, se creará automáticamente la cuenta de usuario y se enviará el correo de bienvenida.'
                    })}
                  </p>
                </div>
              </label>
            </div>
          </div>

          <Dialog.Footer>
            <Button type="button" variant="outline" onClick={resetInvestigatorDialog}>
              {t('core.cancel')}
            </Button>
            <Button
              className="bg-violet-600 text-white hover:bg-violet-700 disabled:bg-violet-300 disabled:text-white"
              disabled={!canCreateInvestigator || isBusy}
              type="button"
              variant="primary"
              onClick={() => void handleCreateInvestigator()}
            >
              {t({ en: 'Afegir investigador', fr: 'Añadir investigador' })}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>

      <Dialog
        open={isPendingDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closePendingDialog();
          }
        }}
      >
        <Dialog.Content className="max-h-[90vh] overflow-y-auto">
          <Dialog.Header>
            <Dialog.Title>{t({ en: 'Editar investigador pendent', fr: 'Editar investigador pendiente' })}</Dialog.Title>
            <Dialog.Description>
              {t({
                en: "Modifica les dades abans de crear l'usuari o d'enviar el mail de benvinguda.",
                fr: 'Modifica los datos antes de crear el usuario o enviar el correo de bienvenida.'
              })}
            </Dialog.Description>
          </Dialog.Header>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="pending-first-name">{t({ en: 'Nom', fr: 'Nombre' })}</Label>
              <Input
                id="pending-first-name"
                value={pendingDialogForm.firstName}
                onChange={(event) => setPendingDialogForm((current) => ({ ...current, firstName: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pending-last-name">{t({ en: 'Cognoms', fr: 'Apellidos' })}</Label>
              <Input
                id="pending-last-name"
                value={pendingDialogForm.lastName}
                onChange={(event) => setPendingDialogForm((current) => ({ ...current, lastName: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pending-email">{t({ en: 'Correu', fr: 'Correo' })}</Label>
              <Input
                id="pending-email"
                type="email"
                value={pendingDialogForm.email}
                onChange={(event) => setPendingDialogForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('common.groups')}</Label>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                {groupOptions.map((group) => {
                  const checked = pendingDialogForm.groupIds.includes(group.id);
                  return (
                    <label key={group.id} className="flex items-start gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() =>
                          setPendingDialogForm((current) => {
                            const nextGroupIds = toggleGroups(current.groupIds, group.id);
                            const nextHospitalOptions = getHospitalOptions(nextGroupIds);
                            return {
                              ...current,
                              groupIds: nextGroupIds,
                              hospital: nextHospitalOptions.includes(current.hospital) ? current.hospital : ''
                            };
                          })
                        }
                      />
                      <span>{group.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t({ en: 'Hospital / Centre', fr: 'Hospital / Centro' })}</Label>
              <p className="text-muted-foreground text-xs">
                {t({
                  en: "L'hospital disponible depèn dels grups seleccionats. Si no hi és, el podeu crear directament des d'aquí.",
                  fr: 'El hospital disponible depende de los grupos seleccionados. Si no está, puedes crearlo directamente desde aquí.'
                })}
              </p>
              <Select
                value={pendingDialogForm.hospital}
                onValueChange={(value) => setPendingDialogForm((current) => ({ ...current, hospital: value }))}
              >
                <Select.Trigger disabled={pendingDialogHospitalOptions.length === 0}>
                  {pendingDialogForm.hospital ? (
                    formatHospitalLabel(pendingDialogForm.hospital)
                  ) : (
                    <Select.Value placeholder={t({ en: 'Selecciona un hospital', fr: 'Selecciona un hospital' })} />
                  )}
                </Select.Trigger>
                <Select.Content>
                  {pendingDialogHospitalOptions.map((hospital) => (
                    <Select.Item key={hospital} value={hospital}>
                      {formatHospitalLabel(hospital)}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
              <Button
                disabled={!canOpenCreateHospitalDialog(pendingDialogForm.groupIds) || isBusy}
                type="button"
                variant="outline"
                onClick={() => {
                  setHospitalDialogTarget('edit');
                  setHospitalForm(DEFAULT_HOSPITAL_FORM);
                  setIsHospitalDialogOpen(true);
                }}
              >
                {t({ en: 'Crear hospital nou', fr: 'Crear hospital nuevo' })}
              </Button>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pending-notes">{t({ en: 'Comentaris', fr: 'Comentarios' })}</Label>
              <textarea
                className="bg-background min-h-24 rounded-md border px-3 py-2 text-sm"
                id="pending-notes"
                placeholder={t({ en: 'Afegiu comentaris interns', fr: 'Añade comentarios internos' })}
                value={pendingDialogForm.notes}
                onChange={(event) => setPendingDialogForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>
            <div className="grid gap-2 rounded-md border p-3">
              <label className="flex items-start gap-3">
                <Checkbox
                  checked={pendingDialogForm.signed}
                  onCheckedChange={(checked) =>
                    setPendingDialogForm((current) => ({ ...current, signed: Boolean(checked) }))
                  }
                />
                <div>
                  <span className="text-sm font-medium">{t({ en: 'Signat', fr: 'Firmado' })}</span>
                  <p className="text-muted-foreground text-xs">
                    {t({
                      en: "Si marques aquesta casella, es crearà automàticament el compte d'usuari i s'enviarà el mail de benvinguda.",
                      fr: 'Si marcas esta casilla, se creará automáticamente la cuenta de usuario y se enviará el correo de bienvenida.'
                    })}
                  </p>
                </div>
              </label>
            </div>
          </div>

          <Dialog.Footer>
            <div className="flex flex-wrap gap-2">
              <Button
                className="bg-violet-600 text-white hover:bg-violet-700 disabled:bg-violet-300 disabled:text-white"
                disabled={!canSavePendingDialog || isPendingDialogBusy}
                type="button"
                variant="primary"
                onClick={() => void handleSavePendingDialogAction()}
              >
                {t('core.save')}
              </Button>
              <Button
                disabled={isPendingDialogBusy}
                type="button"
                variant="danger"
                onClick={() => void handleDeletePendingDialog()}
              >
                {t('core.delete')}
              </Button>
            </div>
            <Button type="button" variant="ghost" onClick={closePendingDialog}>
              {t('core.cancel')}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>

      <Dialog open={isHospitalDialogOpen} onOpenChange={setIsHospitalDialogOpen}>
        <Dialog.Content className="max-h-[90vh] overflow-y-auto">
          <Dialog.Header>
            <Dialog.Title>{t({ en: 'Crear hospital nou', fr: 'Crear hospital nuevo' })}</Dialog.Title>
            <Dialog.Description>
              {t({
                en: "Aquest hospital s'afegirà als grups seleccionats actualment i quedarà disponible immediatament en aquest formulari.",
                fr: 'Este hospital se añadirá a los grupos seleccionados actualmente y quedará disponible inmediatamente en este formulario.'
              })}
            </Dialog.Description>
          </Dialog.Header>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="new-hospital-name">
                {t({ en: 'Nom del centre sanitari', fr: 'Nombre del centro sanitario' })}
              </Label>
              <Input
                id="new-hospital-name"
                value={hospitalForm.name}
                onChange={(event) => setHospitalForm((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <div className="grid gap-2">
                <Label htmlFor="new-hospital-locality">
                  {t({ en: 'Ciutat / localitat (opcional)', fr: 'Ciudad / localidad (opcional)' })}
                </Label>
                <Input
                  id="new-hospital-locality"
                  value={hospitalForm.locality ?? ''}
                  onChange={(event) => setHospitalForm((current) => ({ ...current, locality: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-hospital-province">
                  {t({ en: 'Província (opcional)', fr: 'Provincia (opcional)' })}
                </Label>
                <Input
                  id="new-hospital-province"
                  value={hospitalForm.province ?? ''}
                  onChange={(event) => setHospitalForm((current) => ({ ...current, province: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-hospital-state">{t({ en: 'País (opcional)', fr: 'País (opcional)' })}</Label>
              <Input
                id="new-hospital-state"
                value={hospitalForm.state ?? ''}
                onChange={(event) => setHospitalForm((current) => ({ ...current, state: event.target.value }))}
              />
            </div>
          </div>

          <Dialog.Footer>
            <Button type="button" variant="outline" onClick={resetHospitalDialog}>
              {t('core.cancel')}
            </Button>
            <Button
              className="bg-violet-600 text-white hover:bg-violet-700 disabled:bg-violet-300 disabled:text-white"
              disabled={
                !canCreateHospital(
                  hospitalDialogTarget === 'edit' ? pendingDialogForm.groupIds : investigatorForm.groupIds
                ) || isBusy
              }
              type="button"
              variant="primary"
              onClick={() => void handleCreateHospital()}
            >
              {t({ en: 'Afegir hospital', fr: 'Añadir hospital' })}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>

      <AlertDialog open={isSignedPromotionConfirmOpen} onOpenChange={setIsSignedPromotionConfirmOpen}>
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>
              {t({ en: 'Confirm signed investigator', fr: 'Confirmar investigador firmado' })}
            </AlertDialog.Title>
            <AlertDialog.Description>
              {t({
                en: 'If you confirm that the investigator has signed, the platform will automatically create the user account, generate a real password, and send the welcome email.',
                fr: 'Si confirmas que el investigador ha firmado, la plataforma creará automáticamente la cuenta de usuario, generará una contraseña real y enviará el correo de bienvenida.'
              })}
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>{t('core.cancel')}</AlertDialog.Cancel>
            <AlertDialog.Action
              className="bg-violet-600 text-white hover:bg-violet-700"
              onClick={() => void handleConfirmSignedPromotion()}
            >
              {t({ en: 'Confirm and continue', fr: 'Confirmar y continuar' })}
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>

      <AlertDialog open={isBulkSignedPromotionConfirmOpen} onOpenChange={setIsBulkSignedPromotionConfirmOpen}>
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>{t({ en: 'Confirmar acció massiva', fr: 'Confirmar acción masiva' })}</AlertDialog.Title>
            <AlertDialog.Description>
              {t({
                en: `Aquesta acció marcarà ${selectedPendingIds.length} investigadors com signats, crearà els seus usuaris i enviarà el mail de benvinguda. Vols continuar?`,
                fr: `Esta acción marcará ${selectedPendingIds.length} investigadores como firmados, creará sus usuarios y enviará el correo de bienvenida. ¿Deseas continuar?`
              })}
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>{t('core.cancel')}</AlertDialog.Cancel>
            <AlertDialog.Action
              className="bg-violet-600 text-white hover:bg-violet-700"
              onClick={() => void handleConfirmBulkSignedPromotion()}
            >
              {t({ en: 'Confirmar i executar', fr: 'Confirmar y ejecutar' })}
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>

      <AlertDialog open={isCreatedUserDeleteConfirmOpen} onOpenChange={setIsCreatedUserDeleteConfirmOpen}>
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>
              {selectedCreatedUser?.basePermissionLevel === 'ADMIN'
                ? t({ en: 'Delete admin user?', fr: '¿Eliminar usuario administrador?' })
                : t({ en: 'Delete user?', fr: '¿Eliminar usuario?' })}
            </AlertDialog.Title>
            <AlertDialog.Description>
              {selectedCreatedUser?.basePermissionLevel === 'ADMIN'
                ? t({
                    en: 'This account has administrator permissions. Deleting it can affect platform management. This action cannot be undone.',
                    fr: 'Esta cuenta tiene permisos de administrador. Eliminarla puede afectar a la gestión de la plataforma. Esta acción no se puede deshacer.'
                  })
                : t({
                    en: 'This action will permanently delete the user account and cannot be undone.',
                    fr: 'Esta acción eliminará permanentemente la cuenta de usuario y no se puede deshacer.'
                  })}
            </AlertDialog.Description>
            {selectedCreatedUser?.username === currentUser?.username ? (
              <p className="text-sm font-medium text-red-700">
                {t({
                  en: 'You cannot delete your own active account from this screen.',
                  fr: 'No puedes eliminar tu propia cuenta activa desde esta pantalla.'
                })}
              </p>
            ) : null}
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>{t('core.cancel')}</AlertDialog.Cancel>
            <AlertDialog.Action
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={selectedCreatedUser?.username === currentUser?.username || isCreatedUserDeleteBusy}
              onClick={() => void handleDeleteCreatedUser()}
            >
              {t({ en: 'Yes, delete user', fr: 'Sí, eliminar usuario' })}
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
    </div>
  );
};

export const Route = createFileRoute('/_app/admin/users/create')({
  component: RouteComponent,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(groupsQueryOptions());
    await context.queryClient.ensureQueryData(pendingInvestigatorsQueryOptions());
    await context.queryClient.ensureQueryData(usersQueryOptions());
  }
});
