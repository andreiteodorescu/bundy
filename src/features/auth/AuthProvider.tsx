import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { ensureProfile } from './bootstrap';
import { runSubscriptionGenerator } from '@/features/subscriptions/generator';
import { runLoanGenerator } from '@/features/loans/generator';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profileId: string | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const bootstrappingFor = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function applySession(next: Session | null) {
      if (!mounted) return;
      setSession(next);
      if (!next) {
        setProfileId(null);
        setStatus('unauthenticated');
        return;
      }
      if (bootstrappingFor.current === next.user.id) return;
      bootstrappingFor.current = next.user.id;
      try {
        const { profileId: pid } = await ensureProfile(next.user);
        if (!mounted) return;
        setProfileId(pid);
        setStatus('authenticated');
        runSubscriptionGenerator(pid).catch((err) => {
          // eslint-disable-next-line no-console
          console.warn('[bundy] subscription generator failed', err);
        });
        runLoanGenerator(pid).catch((err) => {
          // eslint-disable-next-line no-console
          console.warn('[bundy] loan generator failed', err);
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[bundy] ensureProfile failed', err);
        if (!mounted) return;
        setStatus('authenticated');
      }
    }

    supabase.auth.getSession().then(({ data }) => applySession(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profileId,
    status,
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signOut() {
      bootstrappingFor.current = null;
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
