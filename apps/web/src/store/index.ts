import { pick } from 'lodash-es';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { createAuthSlice } from './slices/auth.slice';
import { createDisclaimerSlice } from './slices/disclaimer.slice';
import { createSessionSlice } from './slices/session.slice';
import { createWalkthroughSlice } from './slices/walkthrough.slice';

import type { AppStore } from './types';

export const useAppStore = create(
  devtools(
    persist(
      immer<AppStore>((...a) => ({
        ...createAuthSlice(...a),
        ...createDisclaimerSlice(...a),
        ...createSessionSlice(...a),
        ...createWalkthroughSlice(...a)
      })),
      {
        name: 'app',
        onRehydrateStorage: () => (state) => {
          if (state?.accessToken) {
            try {
              const { currentGroup } = state;
              state.login(state.accessToken);
              if (currentGroup) {
                state.changeGroup(currentGroup);
              }
            } catch (error) {
              console.error('Failed to restore session:', error);
            }
          }
        },
        partialize: (state) =>
          pick(state, ['accessToken', 'currentGroup', 'isDisclaimerAccepted', 'isWalkthroughComplete']),
        storage: createJSONStorage(() => localStorage),
        version: 1
      }
    )
  )
);
