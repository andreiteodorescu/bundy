import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Anchor,
  Button,
  Center,
  Loader,
  Paper,
  PasswordInput,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';

/**
 * Landing page for password reset email links.
 *
 * Supabase sends emails with a link like:
 *   https://bundy.ro/reset-password#access_token=...&refresh_token=...&type=recovery
 *
 * Supabase JS automatically picks up these tokens (via detectSessionInUrl) and creates
 * a "recovery session" — a partial auth state that allows updateUser() to set a new
 * password but isn't a full login session. So we wait for the auth state to settle,
 * then show the new-password form.
 */
export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [phase, setPhase] = useState<'init' | 'ready' | 'invalid' | 'done'>('init');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timer: number | undefined;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
        if (mounted) setPhase('ready');
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        setPhase('ready');
      } else {
        timer = window.setTimeout(() => {
          if (mounted && phase === 'init') setPhase('invalid');
        }, 2000);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      if (timer) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError(t('validation.passwordTooShort', { min: 6 }));
    if (password !== confirm) return setError(t('validation.passwordsDontMatch'));
    setLoading(true);
    try {
      await updatePassword(password);
      setPhase('done');
      // Sign out the recovery session so the user logs in fresh with the new password
      await supabase.auth.signOut();
      setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.reset.error'));
    } finally {
      setLoading(false);
    }
  }

  if (phase === 'init') {
    return (
      <Center h="100dvh">
        <Loader />
      </Center>
    );
  }

  if (phase === 'invalid') {
    return (
      <Center h="100dvh" px="md">
        <Paper p="xl" radius="lg" withBorder w="100%" maw={420}>
          <Stack gap="md">
            <Title order={3}>{t('auth.reset.invalidTitle')}</Title>
            <Text size="sm" c="dimmed">
              {t('auth.reset.invalidMessage')}
            </Text>
            <Anchor component={Link} to="/forgot-password">
              {t('auth.reset.requestNew')}
            </Anchor>
            <Anchor component={Link} to="/login">
              {t('auth.reset.backToLogin')}
            </Anchor>
          </Stack>
        </Paper>
      </Center>
    );
  }

  if (phase === 'done') {
    return (
      <Center h="100dvh" px="md">
        <Paper p="xl" radius="lg" withBorder w="100%" maw={420}>
          <Stack gap="md" align="center" ta="center">
            <IconCheck size={48} color="var(--mantine-color-green-6)" stroke={2} />
            <Title order={3}>{t('auth.reset.doneTitle')}</Title>
            <Text size="sm" c="dimmed">
              {t('auth.reset.doneMessage')}
            </Text>
          </Stack>
        </Paper>
      </Center>
    );
  }

  return (
    <Center h="100dvh" px="md">
      <Paper p="xl" radius="lg" withBorder w="100%" maw={420}>
        <form onSubmit={handleSubmit} noValidate>
          <Stack gap="md">
            <Title order={2}>{t('auth.reset.title')}</Title>
            <PasswordInput
              label={t('auth.reset.newPassword')}
              description={t('auth.reset.newPasswordHint')}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
            <PasswordInput
              label={t('auth.reset.confirmPassword')}
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.currentTarget.value)}
            />
            {error && (
              <Alert color="red" icon={<IconAlertCircle size={16} />} py={6}>
                {error}
              </Alert>
            )}
            <Button type="submit" loading={loading} fullWidth>
              {t('auth.reset.submit')}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
