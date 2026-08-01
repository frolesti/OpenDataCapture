import { useEffect, useMemo, useState } from 'react';

import { estimatePasswordStrength } from '@douglasneuroinformatics/libpasswd';
import {
  AlertDialog,
  Button,
  Checkbox,
  Dialog,
  DropdownMenu,
  Heading,
  Input,
  Label,
  SearchBar,
  Select,
  Table
} from '@douglasneuroinformatics/libui/components';
import { ArrowsUpDownIcon, ChevronDownIcon, ClockIcon, UsersIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { BasePermissionLevel, PendingInvestigator, User } from '@opendatacapture/schemas/user';
import { createFileRoute } from '@tanstack/react-router';

import { PageHeader } from '@/components/PageHeader';
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

function toTimestamp(value?: Date | null | string) {
  if (!value) {
    return 0;
  }
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
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
  createdAtLabel: string;
  createdAtValue: number;
  email: string;
  firstName: string;
  groupIds: string[];
  id: string;
  kind: 'pending' | 'user';
  lastConnectionLabel: string;
  lastConnectionValue: number;
  lastName: string;
  notes: string;
  profileLabel: string;
  searchText: string;
  username: string;
};

type UserTypeFilter = 'ALL' | 'INVESTIGATOR' | 'PENDING_INVESTIGATOR' | 'USER';
type SortDirection = 'asc' | 'desc';
type PendingSortKey = 'createdAt' | 'email' | 'group' | 'hospital' | 'mailSentAt' | 'name' | 'notes';
type UserSortKey = 'createdAt' | 'email' | 'group' | 'lastConnection' | 'name' | 'notes' | 'profile' | 'username';

const ENTRIES_PER_PAGE = 10;

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
  const [userTypeFilter, setUserTypeFilter] = useState<UserTypeFilter>('ALL');
  const [userGroupFilter, setUserGroupFilter] = useState<string>('ALL');
  const [pendingGroupFilter, setPendingGroupFilter] = useState<string>('ALL');
  const [userSortKey, setUserSortKey] = useState<UserSortKey>('createdAt');
  const [userSortDirection, setUserSortDirection] = useState<SortDirection>('desc');
  const [pendingSortKey, setPendingSortKey] = useState<PendingSortKey>('createdAt');
  const [pendingSortDirection, setPendingSortDirection] = useState<SortDirection>('desc');
  const [userPage, setUserPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);
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
    const filtered = pendingRows.filter((entry) => {
      if (!buildPendingSearchText(entry).includes(normalizedSearchTerm)) {
        return false;
      }

      if (pendingGroupFilter !== 'ALL' && !entry.groupIds.includes(pendingGroupFilter)) {
        return false;
      }

      return true;
    });

    return filtered.sort((left, right) => {
      const comparator = (() => {
        switch (pendingSortKey) {
          case 'name':
            return `${left.firstName} ${left.lastName}`.localeCompare(`${right.firstName} ${right.lastName}`);
          case 'email':
            return left.email.localeCompare(right.email);
          case 'hospital':
            return left.hospital.localeCompare(right.hospital);
          case 'mailSentAt':
            return toTimestamp(left.mailSentAt) - toTimestamp(right.mailSentAt);
          case 'group':
            return summarizeGroups(left.groupIds).localeCompare(summarizeGroups(right.groupIds));
          case 'notes':
            return (left.notes?.trim() || '-').localeCompare(right.notes?.trim() || '-');
          case 'createdAt':
          default:
            return toTimestamp(left.createdAt) - toTimestamp(right.createdAt);
        }
      })();

      return pendingSortDirection === 'desc' ? -comparator : comparator;
    });
  }, [normalizedSearchTerm, pendingGroupFilter, pendingRows, pendingSortDirection, pendingSortKey]);

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
        createdAtLabel: formatDate(entry.createdAt),
        createdAtValue: toTimestamp(entry.createdAt),
        email: entry.email ?? '-',
        firstName: entry.firstName,
        groupIds: entry.groupIds,
        id: entry.id,
        kind: 'user',
        lastConnectionLabel: basePermissionLevel === 'STANDARD' ? getLastConnectionLabel(entry.id) : '-',
        lastConnectionValue:
          basePermissionLevel === 'STANDARD' ? toTimestamp((sessionsByUserId.get(entry.id) ?? [])[0]?.createdAt) : 0,
        lastName: entry.lastName,
        notes: '-',
        profileLabel,
        searchText: buildUserSearchText(entry),
        username: entry.username
      };
    });

    const pendingDirectoryRows: UserDirectoryRow[] = pendingRows.map((entry) => ({
      basePermissionLevel: 'PENDING',
      createdAtLabel: formatDate(entry.createdAt),
      createdAtValue: toTimestamp(entry.createdAt),
      email: entry.email,
      firstName: entry.firstName,
      groupIds: entry.groupIds,
      id: entry.id,
      kind: 'pending',
      lastConnectionLabel: '-',
      lastConnectionValue: 0,
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
      if (userTypeFilter === 'ALL') {
        return true;
      }
      if (userTypeFilter === 'PENDING_INVESTIGATOR') {
        return entry.kind === 'pending';
      }
      if (userTypeFilter === 'INVESTIGATOR') {
        return entry.kind === 'user' && entry.basePermissionLevel === 'STANDARD';
      }
      return entry.kind === 'user' && entry.basePermissionLevel !== 'STANDARD';
    });

    const filtered = profileFiltered.filter((entry) => {
      if (!entry.searchText.includes(normalizedSearchTerm)) {
        return false;
      }

      if (userGroupFilter !== 'ALL' && !entry.groupIds.includes(userGroupFilter)) {
        return false;
      }

      return true;
    });

    return filtered.sort((left, right) => {
      const comparator = (() => {
        switch (userSortKey) {
          case 'name':
            return `${left.firstName} ${left.lastName}`.localeCompare(`${right.firstName} ${right.lastName}`);
          case 'email':
            return left.email.localeCompare(right.email);
          case 'username':
            return left.username.localeCompare(right.username);
          case 'profile':
            return left.profileLabel.localeCompare(right.profileLabel);
          case 'group':
            return summarizeGroups(left.groupIds).localeCompare(summarizeGroups(right.groupIds));
          case 'lastConnection':
            return left.lastConnectionValue - right.lastConnectionValue;
          case 'notes':
            return left.notes.localeCompare(right.notes);
          case 'createdAt':
          default:
            return left.createdAtValue - right.createdAtValue;
        }
      })();

      return userSortDirection === 'desc' ? -comparator : comparator;
    });
  }, [normalizedSearchTerm, userDirectoryRows, userGroupFilter, userSortDirection, userSortKey, userTypeFilter]);
  const pendingById = useMemo(() => new Map(pendingRows.map((entry) => [entry.id, entry])), [pendingRows]);

  const handlePendingSort = (key: PendingSortKey) => {
    if (pendingSortKey === key) {
      setPendingSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setPendingSortKey(key);
    setPendingSortDirection('asc');
  };

  const handleUserSort = (key: UserSortKey) => {
    if (userSortKey === key) {
      setUserSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setUserSortKey(key);
    setUserSortDirection('asc');
  };

  const pendingTotalPages = Math.max(1, Math.ceil(filteredPendingRows.length / ENTRIES_PER_PAGE));
  const usersTotalPages = Math.max(1, Math.ceil(filteredUserDirectoryRows.length / ENTRIES_PER_PAGE));

  useEffect(() => {
    setPendingPage((current) => Math.min(current, pendingTotalPages));
  }, [pendingTotalPages]);

  useEffect(() => {
    setUserPage((current) => Math.min(current, usersTotalPages));
  }, [usersTotalPages]);

  useEffect(() => {
    setPendingPage(1);
  }, [pendingGroupFilter, pendingSortDirection, pendingSortKey, searchTerm, viewMode]);

  useEffect(() => {
    setUserPage(1);
  }, [searchTerm, userGroupFilter, userSortDirection, userSortKey, userTypeFilter, viewMode]);

  const paginatedPendingRows = useMemo(() => {
    const start = (pendingPage - 1) * ENTRIES_PER_PAGE;
    return filteredPendingRows.slice(start, start + ENTRIES_PER_PAGE);
  }, [filteredPendingRows, pendingPage]);

  const paginatedUserRows = useMemo(() => {
    const start = (userPage - 1) * ENTRIES_PER_PAGE;
    return filteredUserDirectoryRows.slice(start, start + ENTRIES_PER_PAGE);
  }, [filteredUserDirectoryRows, userPage]);

  const visiblePendingIds = useMemo(() => paginatedPendingRows.map((entry) => entry.id), [paginatedPendingRows]);
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

  const passwordStrength = useMemo(
    () =>
      estimatePasswordStrength(userForm.password, {
        feedbackLanguage: 'en'
      }),
    [userForm.password]
  );
  const isUserPasswordStrong = passwordStrength.success;

  const canCreateUser =
    userForm.firstName.trim().length > 0 &&
    userForm.lastName.trim().length > 0 &&
    userForm.username.trim().length > 0 &&
    userForm.password.trim().length > 0 &&
    isUserPasswordStrong &&
    (userForm.basePermissionLevel === 'ADMIN' || userForm.groupIds.length === 1);

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

  const toggleSingleGroup = (current: string[], groupId: string) => (current.includes(groupId) ? [] : [groupId]);

  const updateUserBasePermissionLevel = (basePermissionLevel: 'ADMIN' | 'GROUP_MANAGER') => {
    setUserForm((current) => ({
      ...current,
      basePermissionLevel,
      groupIds: basePermissionLevel === 'ADMIN' ? [] : current.groupIds.slice(0, 1)
    }));
  };

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
            en: "Gestió d'usuaris",
            fr: 'Gestión de usuarios'
          })}
        </Heading>
      </PageHeader>

      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
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

          <div className="flex items-center rounded-md border border-violet-300 bg-violet-100 p-1">
            <Button
              aria-label={t({ en: 'Tots els usuaris', fr: 'Todos los usuarios' })}
              className={
                viewMode === 'users'
                  ? 'h-9 w-9 bg-violet-600 text-white hover:bg-violet-700'
                  : 'h-9 w-9 text-violet-900 hover:bg-violet-200'
              }
              size="icon"
              title={t({ en: 'Tots els usuaris', fr: 'Todos los usuarios' })}
              type="button"
              variant={viewMode === 'users' ? 'primary' : 'ghost'}
              onClick={() => setViewMode('users')}
            >
              <UsersIcon className="h-4 w-4" />
            </Button>
            <Button
              aria-label={t({ en: 'Investigadors pendents', fr: 'Investigadores pendientes' })}
              className={
                viewMode === 'pending'
                  ? 'h-9 w-9 bg-violet-600 text-white hover:bg-violet-700'
                  : 'h-9 w-9 text-violet-900 hover:bg-violet-200'
              }
              size="icon"
              title={t({ en: 'Investigadors pendents', fr: 'Investigadores pendientes' })}
              type="button"
              variant={viewMode === 'pending' ? 'primary' : 'ghost'}
              onClick={() => setViewMode('pending')}
            >
              <ClockIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <SearchBar
          className="grow"
          placeholder={
            viewMode === 'pending'
              ? t({
                  en: 'Cerca investigadors pendents per nom o correu',
                  fr: 'Buscar investigadores pendientes por nombre o correo'
                })
              : t({
                  en: 'Cerca usuaris per nom, usuari o correu',
                  fr: 'Buscar usuarios por nombre, usuario o correo'
                })
          }
          value={searchTerm}
          onValueChange={setSearchTerm}
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
                      <button
                        className="inline-flex items-center gap-1"
                        type="button"
                        onClick={() => handlePendingSort('name')}
                      >
                        <span>{t({ en: 'Nom', fr: 'Nombre' })}</span>
                        <ArrowsUpDownIcon className="h-3.5 w-3.5" />
                      </button>
                    </Table.Head>
                    <Table.Head className="text-foreground whitespace-nowrap">
                      <button
                        className="inline-flex items-center gap-1"
                        type="button"
                        onClick={() => handlePendingSort('email')}
                      >
                        <span>{t({ en: 'Correu', fr: 'Correo' })}</span>
                        <ArrowsUpDownIcon className="h-3.5 w-3.5" />
                      </button>
                    </Table.Head>
                    <Table.Head className="text-foreground whitespace-nowrap">
                      <button
                        className="inline-flex items-center gap-1"
                        type="button"
                        onClick={() => handlePendingSort('hospital')}
                      >
                        <span>{t({ en: 'Hospital', fr: 'Hospital' })}</span>
                        <ArrowsUpDownIcon className="h-3.5 w-3.5" />
                      </button>
                    </Table.Head>
                    <Table.Head className="text-foreground whitespace-nowrap">
                      <button
                        className="inline-flex items-center gap-1"
                        type="button"
                        onClick={() => handlePendingSort('mailSentAt')}
                      >
                        <span>{t({ en: 'Mail enviat', fr: 'Mail enviado' })}</span>
                        <ArrowsUpDownIcon className="h-3.5 w-3.5" />
                      </button>
                    </Table.Head>
                    <Table.Head className="text-foreground whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          className="inline-flex items-center gap-1"
                          type="button"
                          onClick={() => handlePendingSort('group')}
                        >
                          <span>{t({ en: 'Grups', fr: 'Grupos' })}</span>
                          <ArrowsUpDownIcon className="h-3.5 w-3.5" />
                        </button>
                        <DropdownMenu>
                          <DropdownMenu.Trigger asChild>
                            <Button className="h-6 w-6 p-0" size="icon" type="button" variant="ghost">
                              <ChevronDownIcon className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Content align="end" className="w-48">
                            <DropdownMenu.Item onClick={() => setPendingGroupFilter('ALL')}>
                              {t({ en: 'Tots', fr: 'Todos' })}
                            </DropdownMenu.Item>
                            {groupOptions.map((group) => (
                              <DropdownMenu.Item key={group.id} onClick={() => setPendingGroupFilter(group.id)}>
                                {group.name}
                              </DropdownMenu.Item>
                            ))}
                          </DropdownMenu.Content>
                        </DropdownMenu>
                      </div>
                    </Table.Head>
                    <Table.Head className="text-foreground whitespace-nowrap">
                      <button
                        className="inline-flex items-center gap-1"
                        type="button"
                        onClick={() => handlePendingSort('notes')}
                      >
                        <span>{t({ en: 'Comentaris', fr: 'Comentarios' })}</span>
                        <ArrowsUpDownIcon className="h-3.5 w-3.5" />
                      </button>
                    </Table.Head>
                    <Table.Head className="text-foreground whitespace-nowrap">
                      <button
                        className="text-foreground inline-flex items-center gap-1"
                        type="button"
                        onClick={() => handlePendingSort('createdAt')}
                      >
                        <span>{t({ en: 'Creat', fr: 'Creado' })}</span>
                        <ArrowsUpDownIcon className="h-3.5 w-3.5" />
                      </button>
                    </Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {paginatedPendingRows.map((entry) => (
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
                      <Table.Cell>{formatDate(entry.mailSentAt)}</Table.Cell>
                      <Table.Cell>{summarizeGroups(entry.groupIds)}</Table.Cell>
                      <Table.Cell>{ellipsize(entry.notes?.trim() || '-')}</Table.Cell>
                      <Table.Cell>{formatDate(entry.createdAt)}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                {t({ en: 'Pàgina', fr: 'Página' })} {pendingPage} / {pendingTotalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  disabled={pendingPage <= 1}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => setPendingPage((current) => Math.max(1, current - 1))}
                >
                  {t({ en: 'Anterior', fr: 'Anterior' })}
                </Button>
                <Button
                  disabled={pendingPage >= pendingTotalPages}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => setPendingPage((current) => Math.min(pendingTotalPages, current + 1))}
                >
                  {t({ en: 'Següent', fr: 'Siguiente' })}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-card text-muted-foreground shadow-xs rounded-md border tracking-tight">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Head className="text-foreground whitespace-nowrap">
                      <button
                        className="inline-flex items-center gap-1"
                        type="button"
                        onClick={() => handleUserSort('name')}
                      >
                        <span>{t({ en: 'Nom', fr: 'Nombre' })}</span>
                        <ArrowsUpDownIcon className="h-3.5 w-3.5" />
                      </button>
                    </Table.Head>
                    <Table.Head className="text-foreground whitespace-nowrap">
                      <button
                        className="inline-flex items-center gap-1"
                        type="button"
                        onClick={() => handleUserSort('email')}
                      >
                        <span>{t({ en: 'Correu', fr: 'Correo' })}</span>
                        <ArrowsUpDownIcon className="h-3.5 w-3.5" />
                      </button>
                    </Table.Head>
                    <Table.Head className="text-foreground whitespace-nowrap">
                      <button
                        className="inline-flex items-center gap-1"
                        type="button"
                        onClick={() => handleUserSort('username')}
                      >
                        <span>{t({ en: 'Usuari', fr: 'Usuario' })}</span>
                        <ArrowsUpDownIcon className="h-3.5 w-3.5" />
                      </button>
                    </Table.Head>
                    <Table.Head className="text-foreground whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          className="inline-flex items-center gap-1"
                          type="button"
                          onClick={() => handleUserSort('profile')}
                        >
                          <span>{t({ en: 'Perfil', fr: 'Perfil' })}</span>
                          <ArrowsUpDownIcon className="h-3.5 w-3.5" />
                        </button>
                        <DropdownMenu>
                          <DropdownMenu.Trigger asChild>
                            <Button className="h-6 w-6 p-0" size="icon" type="button" variant="ghost">
                              <ChevronDownIcon className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Content align="end" className="w-56">
                            <DropdownMenu.Item onClick={() => setUserTypeFilter('ALL')}>
                              {t({ en: 'Tots', fr: 'Todos' })}
                            </DropdownMenu.Item>
                            <DropdownMenu.Item onClick={() => setUserTypeFilter('USER')}>
                              {t({ en: 'Usuari', fr: 'Usuario' })}
                            </DropdownMenu.Item>
                            <DropdownMenu.Item onClick={() => setUserTypeFilter('INVESTIGATOR')}>
                              {t({ en: 'Investigador', fr: 'Investigador' })}
                            </DropdownMenu.Item>
                            <DropdownMenu.Item onClick={() => setUserTypeFilter('PENDING_INVESTIGATOR')}>
                              {t({ en: 'Investigador (pendent)', fr: 'Investigador (pendiente)' })}
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu>
                      </div>
                    </Table.Head>
                    <Table.Head className="text-foreground whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          className="inline-flex items-center gap-1"
                          type="button"
                          onClick={() => handleUserSort('group')}
                        >
                          <span>{t({ en: 'Grups', fr: 'Grupos' })}</span>
                          <ArrowsUpDownIcon className="h-3.5 w-3.5" />
                        </button>
                        <DropdownMenu>
                          <DropdownMenu.Trigger asChild>
                            <Button className="h-6 w-6 p-0" size="icon" type="button" variant="ghost">
                              <ChevronDownIcon className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Content align="end" className="w-56">
                            <DropdownMenu.Item onClick={() => setUserGroupFilter('ALL')}>
                              {t({ en: 'Tots', fr: 'Todos' })}
                            </DropdownMenu.Item>
                            {groupOptions.map((group) => (
                              <DropdownMenu.Item key={group.id} onClick={() => setUserGroupFilter(group.id)}>
                                {group.name}
                              </DropdownMenu.Item>
                            ))}
                          </DropdownMenu.Content>
                        </DropdownMenu>
                      </div>
                    </Table.Head>
                    <Table.Head className="text-foreground whitespace-nowrap">
                      <button
                        className="text-foreground inline-flex items-center gap-1"
                        type="button"
                        onClick={() => handleUserSort('createdAt')}
                      >
                        <span>{t({ en: 'Creat', fr: 'Creado' })}</span>
                        <ArrowsUpDownIcon className="h-3.5 w-3.5" />
                      </button>
                    </Table.Head>
                    <Table.Head className="text-foreground whitespace-nowrap">
                      <button
                        className="inline-flex items-center gap-1"
                        type="button"
                        onClick={() => handleUserSort('lastConnection')}
                      >
                        <span>{t({ en: 'Última connexió', fr: 'Última conexión' })}</span>
                        <ArrowsUpDownIcon className="h-3.5 w-3.5" />
                      </button>
                    </Table.Head>
                    <Table.Head className="text-foreground whitespace-nowrap">
                      <button
                        className="inline-flex items-center gap-1"
                        type="button"
                        onClick={() => handleUserSort('notes')}
                      >
                        <span>{t({ en: 'Comentaris', fr: 'Comentarios' })}</span>
                        <ArrowsUpDownIcon className="h-3.5 w-3.5" />
                      </button>
                    </Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {paginatedUserRows.map((entry) => (
                    <Table.Row
                      className="cursor-pointer"
                      key={entry.id}
                      onClick={() => handleOpenUserDirectoryEntry(entry)}
                    >
                      <Table.Cell>{`${entry.firstName} ${entry.lastName}`}</Table.Cell>
                      <Table.Cell>{entry.email}</Table.Cell>
                      <Table.Cell>{entry.username}</Table.Cell>
                      <Table.Cell>{entry.profileLabel}</Table.Cell>
                      <Table.Cell>{summarizeGroups(entry.groupIds)}</Table.Cell>
                      <Table.Cell>{entry.createdAtLabel}</Table.Cell>
                      <Table.Cell>{entry.lastConnectionLabel}</Table.Cell>
                      <Table.Cell>{ellipsize(entry.notes)}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                {t({ en: 'Pàgina', fr: 'Página' })} {userPage} / {usersTotalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  disabled={userPage <= 1}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => setUserPage((current) => Math.max(1, current - 1))}
                >
                  {t({ en: 'Anterior', fr: 'Anterior' })}
                </Button>
                <Button
                  disabled={userPage >= usersTotalPages}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => setUserPage((current) => Math.min(usersTotalPages, current + 1))}
                >
                  {t({ en: 'Següent', fr: 'Siguiente' })}
                </Button>
              </div>
            </div>
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
        <Dialog.Content className="flex max-h-[90vh] flex-col overflow-hidden">
          <Dialog.Header>
            <Dialog.Title>{t({ en: 'Editar usuari', fr: 'Editar usuario' })}</Dialog.Title>
            <Dialog.Description>
              {t({
                en: "Podeu editar dades bàsiques de l'usuari.",
                fr: 'Puedes editar datos básicos del usuario.'
              })}
            </Dialog.Description>
          </Dialog.Header>

          <div className="min-h-0 flex-1 overflow-y-auto py-2 pr-1">
            <div className="grid gap-4">
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
        <Dialog.Content className="flex max-h-[90vh] flex-col overflow-hidden">
          <Dialog.Header>
            <Dialog.Title>{t({ en: 'Afegir usuari', fr: 'Añadir usuario' })}</Dialog.Title>
            <Dialog.Description>
              {t({
                en: "Crea un usuari intern amb rol d'administrador o gestor de grup.",
                fr: 'Crea un usuario interno con rol de administrador o gestor de grupo.'
              })}
            </Dialog.Description>
          </Dialog.Header>

          <div className="min-h-0 flex-1 overflow-y-auto py-2 pr-1">
            <div className="grid gap-4">
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
                {userForm.password.trim().length > 0 && !isUserPasswordStrong ? (
                  <p className="text-destructive text-xs">
                    {t({
                      en: 'La contrasenya no és prou segura. Inclou majúscules, minúscules, números i símbols.',
                      fr: 'La contraseña no es lo bastante segura. Incluye mayúsculas, minúsculas, números y símbolos.'
                    })}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label>{t('common.basePermissionLevel')}</Label>
                <Select
                  value={userForm.basePermissionLevel}
                  onValueChange={(value) => updateUserBasePermissionLevel(value as 'ADMIN' | 'GROUP_MANAGER')}
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
              {userForm.basePermissionLevel === 'GROUP_MANAGER' ? (
                <div className="grid gap-2">
                  <Label>{t('common.groups')}</Label>
                  <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
                    {groupOptions.map((group) => {
                      const checked = userForm.groupIds.includes(group.id);
                      return (
                        <label key={group.id} className="flex items-start gap-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() =>
                              setUserForm((current) => ({
                                ...current,
                                groupIds: toggleSingleGroup(current.groupIds, group.id)
                              }))
                            }
                          />
                          <span>{group.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {t({
                      en: 'Els gestors de grup només poden estar assignats a un grup.',
                      fr: 'Los gestores de grupo solo pueden estar asignados a un grupo.'
                    })}
                  </p>
                </div>
              ) : (
                <div className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
                  {t({
                    en: "Els administradors no necessiten assignació de grup en crear l'usuari.",
                    fr: 'Los administradores no necesitan asignación de grupo al crear el usuario.'
                  })}
                </div>
              )}
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
        <Dialog.Content className="flex max-h-[90vh] flex-col overflow-hidden">
          <Dialog.Header>
            <Dialog.Title>{t({ en: 'Afegir investigador', fr: 'Añadir investigador' })}</Dialog.Title>
            <Dialog.Description>
              {t({
                en: "Els investigadors sempre es creen com a usuaris estàndard i han d'estar assignats a un grup.",
                fr: 'Los investigadores siempre se crean como usuarios estándar y deben estar asignados a un grupo.'
              })}
            </Dialog.Description>
          </Dialog.Header>

          <div className="min-h-0 flex-1 overflow-y-auto py-2 pr-1">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="investigator-first-name">{t({ en: 'Nom', fr: 'Nombre' })}</Label>
                <Input
                  id="investigator-first-name"
                  value={investigatorForm.firstName}
                  onChange={(event) =>
                    setInvestigatorForm((current) => ({ ...current, firstName: event.target.value }))
                  }
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
        <Dialog.Content className="flex max-h-[90vh] flex-col overflow-hidden">
          <Dialog.Header>
            <Dialog.Title>{t({ en: 'Editar investigador pendent', fr: 'Editar investigador pendiente' })}</Dialog.Title>
            <Dialog.Description>
              {t({
                en: "Modifica les dades abans de crear l'usuari o d'enviar el mail de benvinguda.",
                fr: 'Modifica los datos antes de crear el usuario o enviar el correo de bienvenida.'
              })}
            </Dialog.Description>
          </Dialog.Header>

          <div className="min-h-0 flex-1 overflow-y-auto py-2 pr-1">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pending-first-name">{t({ en: 'Nom', fr: 'Nombre' })}</Label>
                <Input
                  id="pending-first-name"
                  value={pendingDialogForm.firstName}
                  onChange={(event) =>
                    setPendingDialogForm((current) => ({ ...current, firstName: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pending-last-name">{t({ en: 'Cognoms', fr: 'Apellidos' })}</Label>
                <Input
                  id="pending-last-name"
                  value={pendingDialogForm.lastName}
                  onChange={(event) =>
                    setPendingDialogForm((current) => ({ ...current, lastName: event.target.value }))
                  }
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
        <Dialog.Content className="flex max-h-[90vh] flex-col overflow-hidden">
          <Dialog.Header>
            <Dialog.Title>{t({ en: 'Crear hospital nou', fr: 'Crear hospital nuevo' })}</Dialog.Title>
            <Dialog.Description>
              {t({
                en: "Aquest hospital s'afegirà als grups seleccionats actualment i quedarà disponible immediatament en aquest formulari.",
                fr: 'Este hospital se añadirá a los grupos seleccionados actualmente y quedará disponible inmediatamente en este formulario.'
              })}
            </Dialog.Description>
          </Dialog.Header>

          <div className="min-h-0 flex-1 overflow-y-auto py-2 pr-1">
            <div className="grid gap-4">
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
