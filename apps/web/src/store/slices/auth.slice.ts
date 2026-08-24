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

      state.currentUser = {
        ...state.currentUser,
        basePermissionLevel: profile.basePermissionLevel,
        firstName: profile.firstName,
        groups: nextGroups,
        id: profile.id,
        lastName: profile.lastName,
        username: profile.username
      };

      // If membership changed, keep a valid selected group or fallback to the first one.
      state.currentGroup = hasCurrentGroup ? state.currentGroup : (nextGroups[0] ?? null);

      if (!state.currentGroup) {
        state.currentSession = null;
      }
    });
  }
});
