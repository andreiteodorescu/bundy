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
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from './AuthProvider';
import { CaptchaGate, HCAPTCHA_ENABLED, type CaptchaGateRef } from '@/components/CaptchaGate';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
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
    if (!email.trim()) return setError(t('auth.forgot.emailRequired'));
    if (HCAPTCHA_ENABLED && !captchaToken) {
      return setError(t('validation.captchaRequired'));
    }
    setLoading(true);
    try {
      await requestPasswordReset(email.trim(), captchaToken ?? undefined);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.forgot.error'));
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
            <Title order={3}>{t('auth.forgot.sentTitle')}</Title>
            <Text size="sm" c="dimmed">
              <Trans
                i18nKey="auth.forgot.sentMessage"
                values={{ email }}
                components={{ bold: <b /> }}
              />
            </Text>
            <Anchor component={Link} to="/login">
              {t('auth.forgot.backToLogin')}
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
              <Title order={2}>{t('auth.forgot.title')}</Title>
              <Text size="sm" c="dimmed">
                {t('auth.forgot.description')}
              </Text>
            </Stack>
            <TextInput
              label={t('auth.forgot.email')}
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
              {t('auth.forgot.submit')}
            </Button>
            <Text size="xs" ta="center" c="dimmed">
              <Anchor component={Link} to="/login">
                {t('auth.forgot.backToLogin')}
              </Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
