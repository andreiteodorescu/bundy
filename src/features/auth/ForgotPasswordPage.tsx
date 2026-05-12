import { FormEvent, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Anchor,
  Box,
  Button,
  Center,
  Paper,
  PasswordInput,
  PinInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconMailCheck } from '@tabler/icons-react';
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from './AuthProvider';
import { CaptchaGate, HCAPTCHA_ENABLED, type CaptchaGateRef } from '@/components/CaptchaGate';

/**
 * Two-phase password reset, PWA-friendly:
 *   1. Email entry — user enters their email, Supabase sends a recovery email
 *      with a 6-digit code (and a fallback link).
 *   2. Code + new password — user types the code (potentially auto-filled by
 *      iOS Mail) and a new password. We verifyOtp({ type: 'recovery' }), then
 *      updateUser({ password }), then navigate home — the user is now signed in.
 *
 * No need to ever leave the PWA, unlike the link-based flow which opens Safari
 * and loses the standalone PWA session context.
 */
export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { requestPasswordReset, verifyPasswordResetOtp, updatePassword } = useAuth();
  const [phase, setPhase] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaGateRef>(null);

  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  async function handleRequestReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError(t('auth.forgot.emailRequired'));
    if (HCAPTCHA_ENABLED && !captchaToken) {
      return setError(t('validation.captchaRequired'));
    }
    setLoading(true);
    try {
      await requestPasswordReset(email.trim(), captchaToken ?? undefined);
      setPhase('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.forgot.error'));
      captchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (otp.length !== 6) return setError(t('auth.forgot.otpRequired'));
    if (password.length < 6) return setError(t('validation.passwordTooShort', { min: 6 }));
    if (password !== confirm) return setError(t('validation.passwordsDontMatch'));
    setLoading(true);
    try {
      await verifyPasswordResetOtp(email.trim(), otp);
      // Recovery session now exists in this PWA context. updatePassword uses it
      // to set the new password.
      await updatePassword(password);
      // AuthProvider's onAuthStateChange will pick up the new session and the
      // user is now signed in. Send them to /home.
      navigate('/home', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.reset.error'));
      setOtp('');
    } finally {
      setLoading(false);
    }
  }

  if (phase === 'reset') {
    return (
      <Center
        mih="100dvh"
        px="md"
        style={{
          paddingTop: 'calc(var(--safe-top) + var(--mantine-spacing-md))',
          paddingBottom: 'calc(var(--safe-bottom) + var(--mantine-spacing-md))',
        }}
      >
        <Paper p="xl" radius="lg" withBorder w="100%" maw={420}>
          <form onSubmit={handleResetSubmit} noValidate>
            <Stack gap="md">
              <Stack gap="xs" align="center" ta="center">
                <Box
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'var(--mantine-color-green-1)',
                    color: 'var(--mantine-color-green-7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconMailCheck size={28} stroke={2} />
                </Box>
                <Title order={3}>{t('auth.forgot.otpTitle')}</Title>
                <Text size="sm" c="dimmed">
                  <Trans
                    i18nKey="auth.forgot.otpMessage"
                    values={{ email }}
                    components={{ bold: <b /> }}
                  />
                </Text>
              </Stack>

              <Stack gap={4} align="center">
                <PinInput
                  length={6}
                  type="number"
                  value={otp}
                  onChange={setOtp}
                  autoFocus
                  oneTimeCode
                />
              </Stack>

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
              <Button
                type="submit"
                loading={loading}
                disabled={otp.length !== 6 || !password || !confirm}
                fullWidth
              >
                {t('auth.forgot.otpSubmit')}
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

  return (
    <Center
      mih="100dvh"
      px="md"
      style={{
        paddingTop: 'calc(var(--safe-top) + var(--mantine-spacing-md))',
        paddingBottom: 'calc(var(--safe-bottom) + var(--mantine-spacing-md))',
      }}
    >
      <Paper p="xl" radius="lg" withBorder w="100%" maw={420}>
        <form onSubmit={handleRequestReset} noValidate>
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
