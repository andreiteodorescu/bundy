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

    // Listen for the PASSWORD_RECOVERY event from Supabase JS
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
        if (mounted) setPhase('ready');
      }
    });

    // If Supabase already had time to parse the URL hash before we mounted, check session
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        setPhase('ready');
      } else {
        // give it a bit, then if no session showed up, we treat link as invalid/expired
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
    if (password.length < 6) return setError('Parola trebuie să aibă minim 6 caractere');
    if (password !== confirm) return setError('Parolele nu se potrivesc');
    setLoading(true);
    try {
      await updatePassword(password);
      setPhase('done');
      // Sign out the recovery session so the user logs in fresh with the new password
      await supabase.auth.signOut();
      setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare');
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
            <Title order={3}>Link invalid sau expirat</Title>
            <Text size="sm" c="dimmed">
              Link-ul de resetare nu mai e valid. Cere unul nou de pe pagina de login.
            </Text>
            <Anchor component={Link} to="/forgot-password">
              Cere un link nou
            </Anchor>
            <Anchor component={Link} to="/login">
              Înapoi la login
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
            <Title order={3}>Parolă actualizată</Title>
            <Text size="sm" c="dimmed">
              Te redirecționăm către pagina de login...
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
            <Title order={2}>Setează parolă nouă</Title>
            <PasswordInput
              label="Parolă nouă"
              description="Minim 6 caractere"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
            <PasswordInput
              label="Confirmă parola"
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
              Salvează parola
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
