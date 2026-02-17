import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';

import { useNotificationsStore, useTranslation } from '@douglasneuroinformatics/libui/hooks';
import { useLocation } from '@tanstack/react-router';

import { useAppStore } from '@/store';

/** Default inactivity timeout (15 minutes — HIPAA/healthcare standard) */
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

/** Extended timeout when actively filling a form (60 minutes) */
const FORM_TIMEOUT_MS = 60 * 60 * 1000;

/** Warning before logout in milliseconds (2 minutes before expiry) */
const WARNING_BEFORE_MS = 2 * 60 * 1000;

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
  const location = useLocation();

  const isOnFormPage = location.pathname.includes('/instruments/render/');
  const timeoutMs = isOnFormPage ? FORM_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
  const timeoutMsRef = useRef(timeoutMs);
  timeoutMsRef.current = timeoutMs;

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
    // Dispatch event so form pages can save drafts before logout
    window.dispatchEvent(new CustomEvent('session-expiring'));
    notifications.addNotification({
      message: t({
        en: "La sessió ha caducat per inactivitat. Les dades del formulari s'han desat com a esborrany.",
        fr: 'La sesión ha expirado por inactividad. Los datos del formulario se han guardado como borrador.'
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
          en: 'La sessió caducarà en 2 minuts per inactivitat',
          fr: 'La sesión expirará en 2 minutos por inactividad'
        } as any),
        type: 'warning'
      });
    }
  }, [notifications, t]);

  const resetTimers = useCallback(() => {
    clearTimers();
    warningShownRef.current = false;
    const ms = timeoutMsRef.current;

    warningRef.current = setTimeout(showWarning, ms - WARNING_BEFORE_MS);
    timeoutRef.current = setTimeout(handleLogout, ms);
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

  // Reset timers when navigating to/from form pages (timeout changes)
  useEffect(() => {
    if (accessToken) {
      resetTimers();
    }
  }, [isOnFormPage, accessToken, resetTimers]);

  useEffect(() => {
    // Only track inactivity when logged in
    if (!accessToken) {
      clearTimers();
      return;
    }

    // Check if already expired (e.g. page was closed and reopened after timeout)
    const elapsed = Date.now() - lastActivityRef.current;
    if (elapsed >= timeoutMsRef.current) {
      handleLogout();
      return;
    }

    // Start timers
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
        if (elapsed >= timeoutMsRef.current) {
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
