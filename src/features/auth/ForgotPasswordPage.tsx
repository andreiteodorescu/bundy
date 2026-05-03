import { FormEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Anchor,
  Box,
  Button,
  Center,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconMailCheck } from '@tabler/icons-react';
import { useAuth } from './AuthProvider';
import { CaptchaGate, HCAPTCHA_ENABLED, type CaptchaGateRef } from '@/components/CaptchaGate';

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaGateRef>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError('Introdu un email');
    if (HCAPTCHA_ENABLED && !captchaToken) {
      return setError('Te rog completează verificarea anti-bot');
    }
    setLoading(true);
    try {
      await requestPasswordReset(email.trim(), captchaToken ?? undefined);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare');
      captchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
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
              Dacă există un cont cu adresa <b>{email}</b>, ți-am trimis un link pentru resetarea
              parolei. Click-ul pe link te aduce direct înapoi în aplicație.
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
    <Center h="100dvh" px="md">
      <Paper p="xl" radius="lg" withBorder w="100%" maw={420}>
        <form onSubmit={handleSubmit} noValidate>
          <Stack gap="md">
            <Stack gap={2}>
              <Title order={2}>Resetare parolă</Title>
              <Text size="sm" c="dimmed">
                Introdu email-ul contului tău. Îți trimitem un link de resetare.
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
              Trimite link
            </Button>
            <Text size="xs" ta="center" c="dimmed">
              <Anchor component={Link} to="/login">
                Înapoi la login
              </Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
