import { createMongoAbility, PureAbility } from '@casl/ability';
import type { TokenPayload } from '@opendatacapture/schemas/auth';
import type { AppAction, AppSubjectName } from '@opendatacapture/schemas/core';
import { jwtDecode } from 'jwt-decode';

import type { AuthSlice, SliceCreator } from '../types';

export const createAuthSlice: SliceCreator<AuthSlice> = (set) => ({
  accessToken: null,
  changeGroup: (group) => {
    set({ currentGroup: group, currentSession: null });
  },
  currentGroup: null,
  currentUser: null,
  login: (accessToken) => {
    const decoded = jwtDecode<TokenPayload & { exp?: number; id?: string; sub: string }>(accessToken);

    // Check if token is expired
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      set({ accessToken: null, currentGroup: null, currentUser: null });
      throw new Error('Token expired');
    }

    const { groups, id, permissions, sub, ...rest } = decoded;
    const ability = createMongoAbility<PureAbility<[AppAction, AppSubjectName], any>>(permissions);
    set({
      accessToken,
      currentSession: null,
      currentGroup: groups[0],
      currentUser: { ability, groups, id: id || sub, ...rest }
    });
  },
  logout: () => {
    set({ accessToken: null, currentGroup: null, currentUser: null });
    localStorage.removeItem('lastActivityTimestamp');
    window.location.reload();
  },
  syncCurrentUserFromProfile: (profile) => {
    set((state) => {
      if (!state.currentUser) {
        return;
      }

      const nextGroups = profile.groups ?? [];
      const hasCurrentGroup = state.currentGroup
        ? nextGroups.some((group) => group.id === state.currentGroup?.id)
        : false;
      const previousResetAt = state.currentGroup?.dataResetAt
        ? new Date(state.currentGroup.dataResetAt).getTime()
        : null;

      state.currentUser = {
        ...state.currentUser,
        basePermissionLevel: profile.basePermissionLevel,
        firstName: profile.firstName,
        groups: nextGroups,
        id: profile.id,
        lastName: profile.lastName,
        username: profile.username,
        studyHospitals: profile.studyHospitals,
        studyNumbers: profile.studyNumbers,
        professionalTitle: profile.professionalTitle
      };

      // If membership changed, keep a valid selected group or fallback to the first one.
      state.currentGroup = hasCurrentGroup
        ? (nextGroups.find((group) => group.id === state.currentGroup?.id) ?? null)
        : (nextGroups[0] ?? null);
      const nextResetAt = state.currentGroup?.dataResetAt ? new Date(state.currentGroup.dataResetAt).getTime() : null;

      if (!hasCurrentGroup || previousResetAt !== nextResetAt) {
        state.currentSession = null;
      }
    });
  }
});
