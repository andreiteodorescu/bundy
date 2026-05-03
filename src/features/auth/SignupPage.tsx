import { FormEvent, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Anchor,
  Box,
  Button,
  Center,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconMailCheck } from '@tabler/icons-react';
import { useAuth } from './AuthProvider';
import { AnimalIconPicker } from '@/components/AnimalIconPicker';
import { CaptchaGate, HCAPTCHA_ENABLED, type CaptchaGateRef } from '@/components/CaptchaGate';
import { DEFAULT_PROFILE_ICON } from '@/data/animalIcons';

export function SignupPage() {
  const { status, signUp } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>(DEFAULT_PROFILE_ICON);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaGateRef>(null);

  if (status === 'authenticated') {
    const target = (location.state as { from?: string })?.from ?? '/home';
    return <Navigate to={target} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError('Te rog introdu un nume');
    if (!email.trim()) return setError('Te rog introdu un email');
    if (password.length < 6) return setError('Parola trebuie să aibă minim 6 caractere');
    if (password !== confirmPassword) return setError('Parolele nu se potrivesc');
    if (HCAPTCHA_ENABLED && !captchaToken) {
      return setError('Te rog completează verificarea anti-bot');
    }

    setLoading(true);
    try {
      const { requiresConfirmation } = await signUp({
        email: email.trim(),
        password,
        name: name.trim(),
        icon,
        captchaToken: captchaToken ?? undefined,
      });
      if (requiresConfirmation) {
        setEmailSent(true);
      } else {
        navigate('/home', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la înregistrare');
      // hCaptcha tokens are single-use; reset on error so user gets a fresh one
      captchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  }

  if (emailSent) {
    return (
      <Center h="100dvh" px="md">
        <Paper p="xl" radius="lg" withBorder w="100%" maw={420}>
          <Stack gap="md" align="center" ta="center">
            <Box
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--mantine-color-green-1)',
                color: 'var(--mantine-color-green-7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconMailCheck size={32} stroke={2} />
            </Box>
            <Title order={3}>Verifică email-ul</Title>
            <Text size="sm" c="dimmed">
              Ți-am trimis un link de confirmare la <b>{email}</b>. Dă click pe el pentru a-ți
              activa contul, apoi loghează-te.
            </Text>
            <Anchor component={Link} to="/login">
              Înapoi la login
            </Anchor>
          </Stack>
        </Paper>
      </Center>
    );
  }

  return (
    <Center h="100dvh" px="md" py="md">
      <Paper p="xl" radius="lg" withBorder w="100%" maw={460}>
        <form onSubmit={handleSubmit} noValidate>
          <Stack gap="md">
            <Stack gap={2} align="center">
              <Title order={2}>Cont nou</Title>
              <Text size="sm" c="dimmed">
                Bundy — gestionare cheltuieli personale
              </Text>
            </Stack>

            <TextInput
              label="Nume profil"
              placeholder="ex: Andrei"
              required
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />

            <TextInput
              label="Email"
              placeholder="email@example.com"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />

            <PasswordInput
              label="Parolă"
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
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.currentTarget.value)}
            />

            <Box>
              <Text size="sm" fw={500} mb={6}>
                Avatar
              </Text>
              <Text size="xs" c="dimmed" mb="xs">
                Alege un animal ca avatar pentru profil.
              </Text>
              <AnimalIconPicker value={icon} onChange={setIcon} color="var(--mantine-primary-color-filled)" />
            </Box>

            <CaptchaGate
              ref={captchaRef}
              onVerify={setCaptchaToken}
              onExpire={() => setCaptchaToken(null)}
            />

            {error && (
              <Alert color="red" icon={<IconAlertCircle size={16} />} py={6}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              loading={loading}
              fullWidth
              leftSection={<IconCheck size={16} />}
              disabled={HCAPTCHA_ENABLED && !captchaToken}
            >
              Creează cont
            </Button>

            <Text size="xs" ta="center" c="dimmed">
              Ai deja cont?{' '}
              <Anchor component={Link} to="/login">
                Loghează-te
              </Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
