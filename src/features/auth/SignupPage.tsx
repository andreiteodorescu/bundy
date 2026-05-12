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
            <Title order={3}>{t('auth.signup.checkEmailTitle')}</Title>
            <Text size="sm" c="dimmed">
              <Trans
                i18nKey="auth.signup.checkEmailMessage"
                values={{ email }}
                components={{ bold: <b /> }}
              />
            </Text>
            <Anchor component={Link} to="/login">
              {t('auth.signup.backToLogin')}
            </Anchor>
          </Stack>
        </Paper>
      </Center>
    );
  }

  return (
    <Center
      mih="100dvh"
      px="md"
      py="md"
      style={{
        paddingTop: 'calc(var(--safe-top) + var(--mantine-spacing-md))',
        paddingBottom: 'calc(var(--safe-bottom) + var(--mantine-spacing-md))',
      }}
    >
      <Paper p="xl" radius="lg" withBorder w="100%" maw={460} pos="relative">
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          pos="absolute"
          top={12}
          left={12}
          style={{ zIndex: 2 }}
          onClick={() => navigate('/login')}
          aria-label={t('auth.signup.backToLogin')}
        >
          <IconArrowLeft size={20} />
        </ActionIcon>
        <Group pos="absolute" top={12} right={12} style={{ zIndex: 2 }}>
          <LanguageToggle />
        </Group>
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
  );
}
