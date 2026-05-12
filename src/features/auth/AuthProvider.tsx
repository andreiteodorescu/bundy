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
  signIn: (email: string, password: string, captchaToken?: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    name: string;
    icon: string;
    captchaToken?: string;
  }) => Promise<{ requiresConfirmation: boolean }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string, captchaToken?: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  verifySignupOtp: (email: string, token: string) => Promise<void>;
  resendSignupOtp: (email: string, captchaToken?: string) => Promise<void>;
  verifyPasswordResetOtp: (email: string, token: string) => Promise<void>;
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
    async signIn(email, password, captchaToken) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken },
      });
      if (error) throw error;
    },
    async signUp({ email, password, name, icon, captchaToken }) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // user_metadata.name + .profile_icon are read by ensureProfile() after first
          // sign-in to seed the profile row.
          data: { name, profile_icon: icon },
          emailRedirectTo: `${window.location.origin}/login`,
          captchaToken,
        },
      });
      if (error) throw error;
      // If email confirmation is enabled, session will be null until they verify.
      const requiresConfirmation = !data.session;
      return { requiresConfirmation };
    },
    async signOut() {
      bootstrappingFor.current = null;
      await supabase.auth.signOut();
    },
    async requestPasswordReset(email, captchaToken) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
        captchaToken,
      });
      if (error) throw error;
    },
    async updatePassword(newPassword) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    async verifySignupOtp(email, token) {
      // PWA-friendly alternative to the email confirmation link: user enters the
      // 6-digit code from the email directly in the app. Verifying it creates a
      // real Supabase session in *this* browser context (the PWA), rather than
      // in Safari where the link would have opened.
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
      if (error) throw error;
    },
    async resendSignupOtp(email, captchaToken) {
      // User lost the email / code expired (default 1h TTL). Resend a fresh one.
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { captchaToken },
      });
      if (error) throw error;
    },
    async verifyPasswordResetOtp(email, token) {
      // Same PWA-friendly pattern as signup OTP. Verifies the recovery code from
      // the password-reset email; success creates a recovery session in this PWA
      // context, after which updatePassword() can set the new password.
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' });
      if (error) throw error;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
