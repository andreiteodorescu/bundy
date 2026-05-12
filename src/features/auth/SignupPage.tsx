import { FormEvent, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Alert,
  Anchor,
  Box,
  Button,
  Center,
  Group,
  Image,
  Paper,
  PasswordInput,
  PinInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconCheck, IconMailCheck } from '@tabler/icons-react';
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from './AuthProvider';
import { AnimalIconPicker } from '@/components/AnimalIconPicker';
import { CaptchaGate, HCAPTCHA_ENABLED, type CaptchaGateRef } from '@/components/CaptchaGate';
import { LanguageToggle } from '@/components/LanguageToggle';
import { DEFAULT_PROFILE_ICON } from '@/data/animalIcons';

export function SignupPage() {
  const { t } = useTranslation();
  const { status, signUp, verifySignupOtp, resendSignupOtp } = useAuth();
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
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaGateRef>(null);

  async function handleVerifyOtp(code: string) {
    setOtpError(null);
    setOtpVerifying(true);
    try {
      await verifySignupOtp(email.trim(), code);
      // verifyOtp creates the session → AuthProvider will pick it up and redirect.
      // We don't need to navigate manually — the `status === 'authenticated'`
      // check at the top of this component fires and <Navigate to="/home" />
      // takes over.
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : t('auth.signup.otpError'));
      setOtp('');
    } finally {
      setOtpVerifying(false);
    }
  }

  async function handleResendOtp() {
    setResending(true);
    setOtpError(null);
    try {
      await resendSignupOtp(email.trim());
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : t('auth.signup.otpError'));
    } finally {
      setResending(false);
    }
  }

  if (status === 'authenticated') {
    const target = (location.state as { from?: string })?.from ?? '/home';
    return <Navigate to={target} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError(t('auth.signup.nameRequired'));
    if (!email.trim()) return setError(t('auth.login.emailRequired'));
    if (password.length < 6) return setError(t('validation.passwordTooShort', { min: 6 }));
    if (password !== confirmPassword) return setError(t('validation.passwordsDontMatch'));
    if (HCAPTCHA_ENABLED && !captchaToken) {
      return setError(t('validation.captchaRequired'));
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
      setError(err instanceof Error ? err.message : t('auth.signup.error'));
      // hCaptcha tokens are single-use; reset on error so user gets a fresh one
      captchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  }

  if (emailSent) {
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
            <Title order={3}>{t('auth.signup.otpTitle')}</Title>
            <Text size="sm" c="dimmed">
              <Trans
                i18nKey="auth.signup.otpMessage"
                values={{ email }}
                components={{ bold: <b /> }}
              />
            </Text>
            <PinInput
              length={6}
              type="number"
              value={otp}
              onChange={setOtp}
              onComplete={handleVerifyOtp}
              disabled={otpVerifying}
              autoFocus
              oneTimeCode
            />
            {otpError && (
              <Alert color="red" icon={<IconAlertCircle size={16} />} w="100%">
                {otpError}
              </Alert>
            )}
            <Button
              fullWidth
              loading={otpVerifying}
              disabled={otp.length !== 6}
              onClick={() => handleVerifyOtp(otp)}
            >
              {t('auth.signup.otpVerify')}
            </Button>
            <Group gap="xs" justify="center">
              <Text size="sm" c="dimmed">{t('auth.signup.otpNoEmail')}</Text>
              <Anchor
                component="button"
                type="button"
                size="sm"
                onClick={handleResendOtp}
                disabled={resending}
              >
                {resending ? t('auth.signup.otpResending') : t('auth.signup.otpResend')}
              </Anchor>
            </Group>
            <Anchor component={Link} to="/login" size="sm">
              {t('auth.signup.backToLogin')}
            </Anchor>
          </Stack>
        </Paper>
      </Center>
    );
  }

  return (
    <>
      {/* Top bar with back + language toggle. Fixed to viewport so it always
          sits below the iPhone notch (via safe-area-inset-top padding),
          regardless of how tall the Paper grows. */}
      <Box
        pos="fixed"
        top={0}
        left={0}
        right={0}
        px="md"
        style={{
          zIndex: 10,
          paddingTop: 'calc(var(--safe-top) + 8px)',
          paddingBottom: 8,
          pointerEvents: 'none',
        }}
      >
        <Group justify="space-between" style={{ pointerEvents: 'auto' }}>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            onClick={() => navigate('/login')}
            aria-label={t('auth.signup.backToLogin')}
          >
            <IconArrowLeft size={20} />
          </ActionIcon>
          <LanguageToggle />
        </Group>
      </Box>

      <Center
        mih="100dvh"
        px="md"
        style={{
          paddingTop: 'calc(var(--safe-top) + 56px)',
          paddingBottom: 'calc(var(--safe-bottom) + var(--mantine-spacing-md))',
        }}
      >
        <Paper p="xl" radius="lg" withBorder w="100%" maw={460} pos="relative">
        <form onSubmit={handleSubmit} noValidate>
          <Stack gap="md">
            <Stack gap="xs" align="center">
              <Image
                src="/icons/icon-192.png"
                alt="Bundy"
                w={64}
                h={64}
                radius="md"
                fit="contain"
              />
              <Title order={2} mt={4}>
                {t('auth.signup.title')}
              </Title>
              <Text size="sm" c="dimmed">
                {t('auth.subtagline')}
              </Text>
            </Stack>

            <TextInput
              label={t('auth.signup.name')}
              placeholder={t('auth.signup.namePlaceholder')}
              required
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />

            <TextInput
              label={t('auth.signup.email')}
              placeholder={t('auth.signup.emailPlaceholder')}
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />

            <PasswordInput
              label={t('auth.signup.password')}
              description={t('auth.signup.passwordHint')}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />

            <PasswordInput
              label={t('auth.signup.confirmPassword')}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.currentTarget.value)}
            />

            <Box>
              <Text size="sm" fw={500} mb={6}>
                {t('auth.signup.avatar')}
              </Text>
              <Text size="xs" c="dimmed" mb="xs">
                {t('auth.signup.avatarHint')}
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
              {t('auth.signup.submit')}
            </Button>

            <Text size="xs" ta="center" c="dimmed">
              {t('auth.signup.haveAccount')}{' '}
              <Anchor component={Link} to="/login">
                {t('auth.signup.loginLink')}
              </Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
      </Center>
    </>
  );
}
