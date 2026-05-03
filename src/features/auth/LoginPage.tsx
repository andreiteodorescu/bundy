import { FormEvent, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import {
  Alert,
  Anchor,
  Button,
  Center,
  Group,
  Image,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useAuth } from './AuthProvider';
import { CaptchaGate, HCAPTCHA_ENABLED, type CaptchaGateRef } from '@/components/CaptchaGate';

export function LoginPage() {
  const { status, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaGateRef>(null);

  if (status === 'authenticated') {
    const target = (location.state as { from?: string })?.from ?? '/home';
    return <Navigate to={target} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (HCAPTCHA_ENABLED && !captchaToken) {
      return setError('Te rog completează verificarea anti-bot');
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password, captchaToken ?? undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la autentificare');
      // hCaptcha tokens are single-use; reset on error so user gets a fresh one
      captchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Center h="100dvh" px="md">
      <Paper p="xl" radius="lg" withBorder w="100%" maw={420}>
        <form onSubmit={handleSubmit} noValidate>
          <Stack gap="md">
            <Stack gap="xs" align="center">
              <Image
                src="/icons/icon-192.png"
                alt="Bundy"
                w={80}
                h={80}
                radius="lg"
                fit="contain"
              />
              <Title order={2} mt={4}>
                Bundy
              </Title>
              <Text size="sm" c="dimmed">
                Gestionare cheltuieli personale
              </Text>
            </Stack>
            <TextInput
              label="Email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
            <PasswordInput
              label="Parolă"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
            <Group justify="flex-end">
              <Anchor component={Link} to="/forgot-password" size="xs">
                Am uitat parola
              </Anchor>
            </Group>
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
              disabled={HCAPTCHA_ENABLED && !captchaToken}
            >
              Intră în cont
            </Button>
            <Text size="xs" ta="center" c="dimmed">
              Nu ai cont?{' '}
              <Anchor component={Link} to="/signup">
                Înregistrează-te
              </Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
