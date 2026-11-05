import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { wipeLocalJournal } from '@/database/queries';
import { supabase } from '@/services/supabase';
import { syncEntries } from '@/services/sync';

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error';

type SyncContextValue = {
  /** False when the build has no Supabase keys — the app then runs without an account. */
  available: boolean;
  /** True once the stored session has been checked, so the login screen does not flash. */
  ready: boolean;
  email: string | null;
  /** Name shown in the app; lives in the Supabase profile and can be changed in Settings. */
  displayName: string;
  status: SyncStatus;
  lastSyncAt: Date | null;
  /** Bumps whenever a sync changed local data, so screens know to reload. */
  version: number;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, displayName: string) => Promise<string | null>;
  /** Re-sends the sign-up confirmation email. */
  resendConfirmation: (email: string) => Promise<string | null>;
  /** True from the moment a reset code is accepted until the new password is set; the app stays locked meanwhile. */
  recovering: boolean;
  /** Emails a one-time code for resetting the password. */
  requestPasswordReset: (email: string) => Promise<string | null>;
  /** Accepts the emailed code (this signs the user in). */
  recoverWithCode: (email: string, code: string) => Promise<string | null>;
  /** Sets the new password after a code was accepted and lets the user into the app. */
  completeRecovery: (password: string) => Promise<string | null>;
  /** Abandons a reset that was started: signs out again. */
  cancelRecovery: () => Promise<void>;
  /** Checks the current password, then sets the new one. Returns an error code or message, null on success. */
  changePassword: (current: string, next: string) => Promise<string | null>;
  updateDisplayName: (name: string) => Promise<string | null>;
  /** Uploads pending changes, then signs out and clears this device. Returns an error if the upload failed; `force` skips the upload. */
  signOut: (force?: boolean) => Promise<string | null>;
  syncNow: () => Promise<void>;
  /** Debounced sync after a local edit; does nothing when signed out. */
  requestSync: () => void;
};

const SyncContext = createContext<SyncContextValue | null>(null);
const MIN_INTERVAL_MS = 15_000;

/** True when the server says the session itself is no good (account deleted, token revoked…), not just that the network is down. */
function isAuthFailure(error: { status?: number; code?: string; message?: string }): boolean {
  if (error.status === 401 || error.status === 403 || error.status === 404) return true;
  if (['user_not_found', 'bad_jwt', 'session_not_found', 'refresh_token_not_found', 'no_authorization'].includes(error.code ?? '')) {
    return true;
  }
  return /jwt|not authenticated|user.*(not found|does not exist)|invalid.*(token|session)|refresh token/i.test(error.message ?? '');
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(supabase === null);
  const [displayName, setDisplayName] = useState('');
  const [recovering, setRecovering] = useState(false);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [version, setVersion] = useState(0);
  const running = useRef(false);
  const lastRun = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  /** Drops the session on this device without asking the server (it may no longer know the account) and clears local data. */
  const endSession = useCallback(async () => {
    await supabase?.auth.signOut({ scope: 'local' }).catch(() => {});
    await wipeLocalJournal(db);
    setVersion((v) => v + 1);
    setStatus('idle');
  }, [db]);

  const syncNow = useCallback(async () => {
    if (!supabase || !userId || running.current) return;
    running.current = true;
    lastRun.current = Date.now();
    setStatus('syncing');
    try {
      const result = await syncEntries(db, supabase, userId);
      if (result.pulled + result.removed > 0) setVersion((v) => v + 1);
      setLastSyncAt(new Date());
      setStatus('ok');
    } catch {
      setStatus('error');
      // If the failure is because the account or session is gone, go back to the sign-in screen
      // instead of leaving the user stuck with a broken sync.
      const { error: userError } = await supabase.auth.getUser();
      if (userError && isAuthFailure(userError)) await endSession();
    } finally {
      running.current = false;
    }
  }, [db, userId, endSession]);

  useEffect(() => {
    if (!supabase) return;
    const apply = (
      user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null | undefined
    ) => {
      setUserId(user?.id ?? null);
      setEmail(user?.email ?? null);
      const name = user?.user_metadata?.display_name;
      setDisplayName(typeof name === 'string' ? name : '');
      if (!user) setStatus('idle');
    };
    supabase.auth
      .getSession()
      .then(({ data }) => apply(data.session?.user))
      .catch(() => {})
      .finally(() => setReady(true));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => apply(session?.user));
    return () => data.subscription.unsubscribe();
  }, []);

  // Sync on sign-in and whenever the app comes back to the foreground.
  useEffect(() => {
    if (!userId) return;
    syncNow();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && Date.now() - lastRun.current > MIN_INTERVAL_MS) syncNow();
    });
    return () => subscription.remove();
  }, [userId, syncNow]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const requestSync = useCallback(() => {
    if (!userId) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(syncNow, 1500);
  }, [userId, syncNow]);

  const value = useMemo<SyncContextValue>(
    () => ({
      available: supabase !== null,
      ready,
      email,
      displayName,
      status,
      lastSyncAt,
      version,
      signIn: async (address, password) => {
        const { error } = await supabase!.auth.signInWithPassword({ email: address.trim(), password });
        return error?.message ?? null;
      },
      signUp: async (address, password, name) => {
        const { data, error } = await supabase!.auth.signUp({
          email: address.trim(),
          password,
          options: {
            data: { display_name: name.trim() },
            // On the web the confirmation link brings the user back to this very app.
            emailRedirectTo: Platform.OS === 'web' ? window.location.origin : undefined,
          },
        });
        if (error) return error.message;
        // With "Confirm email" on, Supabase returns a user but no session.
        return data.session ? null : 'confirm-email';
      },
      signOut: async (force = false) => {
        if (!supabase) return null;
        if (!force) {
          try {
            // Everything lives in the cloud once signed in; make sure it is there before wiping this device.
            if (userId) await syncEntries(db, supabase, userId);
          } catch (error) {
            // A dead account cannot receive an upload — that must not trap the user in the app.
            const { error: userError } = await supabase.auth.getUser();
            if (!(userError && isAuthFailure(userError))) {
              return error instanceof Error ? error.message : String(error);
            }
          }
        }
        await endSession();
        return null;
      },
      recovering,
      requestPasswordReset: async (address) => {
        const { error } = await supabase!.auth.resetPasswordForEmail(address.trim());
        return error?.message ?? null;
      },
      recoverWithCode: async (address, code) => {
        // Hold the login screen: the code signs the user in before the new password exists.
        setRecovering(true);
        const { error } = await supabase!.auth.verifyOtp({ email: address.trim(), token: code.trim(), type: 'recovery' });
        if (error) {
          setRecovering(false);
          return error.message;
        }
        return null;
      },
      completeRecovery: async (password) => {
        const { error } = await supabase!.auth.updateUser({ password });
        if (error) return /different|same/i.test(error.message) ? 'same-password' : error.message;
        setRecovering(false);
        return null;
      },
      cancelRecovery: async () => {
        setRecovering(false);
        await supabase?.auth.signOut();
      },
      changePassword: async (current, next) => {
        if (!email) return 'wrong-current';
        // Prove the person knows the current password before allowing the change.
        const check = await supabase!.auth.signInWithPassword({ email, password: current });
        if (check.error) return 'wrong-current';
        const { error } = await supabase!.auth.updateUser({ password: next });
        if (error) return /different|same/i.test(error.message) ? 'same-password' : error.message;
        return null;
      },
      resendConfirmation: async (address) => {
        const { error } = await supabase!.auth.resend({ type: 'signup', email: address.trim() });
        return error?.message ?? null;
      },
      updateDisplayName: async (name) => {
        const { error } = await supabase!.auth.updateUser({ data: { display_name: name.trim() } });
        if (error) return error.message;
        setDisplayName(name.trim());
        return null;
      },
      syncNow,
      requestSync,
    }),
    [db, userId, endSession, ready, email, displayName, recovering, status, lastSyncAt, version, syncNow, requestSync]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used inside SyncProvider');
  return context;
}
