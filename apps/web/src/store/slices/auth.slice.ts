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
  }
});
