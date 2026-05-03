import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    '[bundy] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Auth will not work until these are set in .env.local.',
  );
}

/**
 * Custom storage adapter for Supabase Auth.
 *
 * iOS PWAs evict localStorage after ~7 days of inactivity (when "Add to Home Screen"
 * is used). We mirror the session into IndexedDB (more durable on iOS) so the user
 * stays logged in across long absences. Reads prefer localStorage (sync, fast) and
 * fall back to IndexedDB; writes hit both.
 */
const dualStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const local = window.localStorage.getItem(key);
      if (local !== null) return local;
    } catch {
      // localStorage may be disabled
    }
    try {
      const fromIdb = await idbGet<string>(key);
      if (fromIdb) {
        try {
          window.localStorage.setItem(key, fromIdb);
        } catch {
          /* noop */
        }
      }
      return fromIdb ?? null;
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* noop */
    }
    try {
      await idbSet(key, value);
    } catch {
      /* noop */
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* noop */
    }
    try {
      await idbDel(key);
    } catch {
      /* noop */
    }
  },
};

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL ?? 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY ?? 'placeholder',
  {
    auth: {
      storage: dualStorage,
      storageKey: 'bundy.auth.session',
      persistSession: true,
      autoRefreshToken: true,
      // Needed so the password-reset email link (https://bundy.ro/reset-password#access_token=...)
      // gets picked up automatically and a recovery session is created.
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      headers: { 'x-client-info': 'bundy@0.1.0' },
    },
  },
);

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      supabase.auth.refreshSession().catch(() => {
        /* network may be offline; subsequent requests will retry */
      });
    }
  });
}
