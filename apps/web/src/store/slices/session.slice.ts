import type { SessionSlice, SliceCreator } from '../types';

export const createSessionSlice: SliceCreator<SessionSlice> = (set) => ({
  currentSession: null,
  isCurrentSessionSubmitted: false,
  endSession() {
    set((state) => {
      state.currentSession = null;
      state.isCurrentSessionSubmitted = false;
    });
  },
  setIsCurrentSessionSubmitted(isCurrentSessionSubmitted) {
    set((state) => {
      state.isCurrentSessionSubmitted = isCurrentSessionSubmitted;
    });
  },
  startSession(session) {
    set((state) => {
      state.currentSession = session;
      state.isCurrentSessionSubmitted = false;
    });
  }
});
