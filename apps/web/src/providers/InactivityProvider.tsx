import { useCallback, useEffect, useRef } from 'react';

import { useNotificationsStore, useTranslation } from '@douglasneuroinformatics/libui/hooks';

import { useAppStore } from '@/store';

/** Inactivity timeout in milliseconds (15 minutes — HIPAA/healthcare standard) */
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

/** Warning before logout in milliseconds (1 minute before expiry) */
const WARNING_BEFORE_MS = 60 * 1000;

const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
  'wheel'
];

/** Throttle interval for activity tracking to avoid excessive timer resets */
const THROTTLE_MS = 30_000;

const STORAGE_KEY = 'lastActivityTimestamp';

function getStoredLastActivity(): number {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? parseInt(stored, 10) : Date.now();
}

function setStoredLastActivity(timestamp: number): void {
  localStorage.setItem(STORAGE_KEY, timestamp.toString());
}

export const InactivityProvider = ({ children }: { children: React.ReactNode }) => {
  const logout = useAppStore((s) => s.logout);
  const accessToken = useAppStore((s) => s.accessToken);
  const notifications = useNotificationsStore();
  const { t } = useTranslation();

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(getStoredLastActivity());
  const warningShownRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
  }, []);

  const handleLogout = useCallback(() => {
    clearTimers();
    notifications.addNotification({
      message: t({
        en: 'La sessió ha caducat per inactivitat',
        fr: 'La sesión ha expirado por inactividad'
      } as any),
      type: 'warning'
    });
    logout();
  }, [clearTimers, logout, notifications, t]);

  const showWarning = useCallback(() => {
    if (!warningShownRef.current) {
      warningShownRef.current = true;
      notifications.addNotification({
        message: t({
          en: 'La sessió caducarà en 1 minut per inactivitat',
          fr: 'La sesión expirará en 1 minuto por inactividad'
        } as any),
        type: 'warning'
      });
    }
  }, [notifications, t]);

  const resetTimers = useCallback(() => {
    clearTimers();
    warningShownRef.current = false;

    warningRef.current = setTimeout(showWarning, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS);
    timeoutRef.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT_MS);
  }, [clearTimers, handleLogout, showWarning]);

  const handleActivity = useCallback(() => {
    const now = Date.now();
    // Throttle: only reset timers if enough time has passed since last activity
    if (now - lastActivityRef.current < THROTTLE_MS) {
      return;
    }
    lastActivityRef.current = now;
    setStoredLastActivity(now);
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    // Only track inactivity when logged in
    if (!accessToken) {
      clearTimers();
      return;
    }

    // Check if already expired (e.g. page was closed and reopened after timeout)
    const elapsed = Date.now() - lastActivityRef.current;
    if (elapsed >= INACTIVITY_TIMEOUT_MS) {
      handleLogout();
      return;
    }

    // Start timers with remaining time
    resetTimers();

    // Listen for user activity
    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, handleActivity, { passive: true });
    }

    // Also reset on visibility change (user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && accessToken) {
        // Check if we should have already logged out while tab was hidden
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= INACTIVITY_TIMEOUT_MS) {
          handleLogout();
        } else {
          handleActivity();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimers();
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, handleActivity);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [accessToken, clearTimers, handleActivity, handleLogout, resetTimers]);

  return <>{children}</>;
};
