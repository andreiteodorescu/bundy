import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoBack } from '@/lib/useGoBack';
import {
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  PasswordInput,
  PinInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import {
  IconAlertCircle,
  IconArrowLeft,
  IconBriefcase,
  IconCheck,
  IconCoin,
  IconKey,
  IconLock,
  IconLockOff,
  IconTrash,
} from '@tabler/icons-react';
import { Trans, useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n';
import { CURRENCIES } from '@/lib/money';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  DEFAULT_HIDDEN_PIN_TTL_MIN,
  HIDDEN_PIN_TTL_OPTIONS,
  isValidPin,
} from '@/lib/pin';
import { confirmDelete } from '@/lib/confirm';
import { AnimalIconPicker } from '@/components/AnimalIconPicker';
import { getIcon } from '@/data/icons.registry';
import {
  readSettings,
  useDeleteAccount,
  useProfile,
  useSetHiddenPin,
  useUpdateProfileIcon,
  useUpdateProfileName,
  useUpdateProfileSettings,
} from './api';
import { supabase } from '@/lib/supabase';

export function SettingsPage() {
  const navigate = useNavigate();
  const goBack = useGoBack('/more');
  const { user } = useAuth();
  const profile = useProfile();
  const updateName = useUpdateProfileName();
  const updateIcon = useUpdateProfileIcon();
  const setPin = useSetHiddenPin();
  const updateSettings = useUpdateProfileSettings();
  const deleteAccount = useDeleteAccount();
  const { updatePassword } = useAuth();
  const { t, i18n } = useTranslation();
  const currentLang: SupportedLanguage = (SUPPORTED_LANGUAGES as readonly string[]).includes(
    i18n.language,
  )
    ? (i18n.language as SupportedLanguage)
    : 'en';

  function openDeleteAccount() {
    confirmDelete({
      title: t('settings.danger.modalTitle'),
      message: t('settings.danger.modalMessage'),
      confirmLabel: t('settings.danger.modalConfirm'),
      onConfirm: async () => {
        try {
          await deleteAccount.mutateAsync();
          notifications.show({
            message: t('settings.danger.deleted'),
            color: 'gray',
            autoClose: 2500,
          });
          await supabase.auth.signOut().catch(() => {});
          window.location.href = '/login';
        } catch (err) {
          notifications.show({
            message: err instanceof Error ? err.message : t('settings.danger.deleteError'),
            color: 'red',
          });
        }
      },
    });
  }

  const [name, setName] = useState('');
  useEffect(() => {
    if (profile.data?.name) setName(profile.data.name);
  }, [profile.data?.name]);

  if (profile.isLoading) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );
  }

  const hasPin = Boolean(profile.data?.hidden_pin_hash);
  const settings = readSettings(profile.data);
  const ttl = settings.hidden_pin_ttl_min ?? DEFAULT_HIDDEN_PIN_TTL_MIN;
  const companyCardEnabled = settings.company_card_enabled === true;
  const defaultCurrency = settings.default_currency ?? 'RON';

  function handleDefaultCurrencyChange(next: string) {
    updateSettings.mutate({ default_currency: next });
  }

  function applyCompanyCardChange(next: boolean) {
    updateSettings.mutate(
      { company_card_enabled: next },
      {
        onSuccess: () => {
          notifications.show({
            message: next
              ? t('settings.features.companyCardEnabled')
              : t('settings.features.companyCardDisabled'),
            color: next ? 'green' : 'gray',
            autoClose: 1500,
          });
        },
        onError: (err) => {
          notifications.show({
            message: err instanceof Error ? err.message : t('common.error'),
            color: 'red',
          });
        },
      },
    );
  }

  function handleCompanyCardToggle(next: boolean) {
    if (!next && companyCardEnabled) {
      // Confirm before disabling — datele rămân, dar UI-ul le ascunde.
      confirmDelete({
        title: t('settings.features.companyCardWarningTitle'),
        message: t('settings.features.companyCardWarning'),
        confirmLabel: t('settings.features.companyCardDisableConfirm'),
        onConfirm: () => applyCompanyCardChange(false),
      });
      return;
    }
    applyCompanyCardChange(next);
  }

  async function handleTtlChange(value: string) {
    const next = Number(value);
    try {
      await updateSettings.mutateAsync({ hidden_pin_ttl_min: next });
      notifications.show({
        message: t('settings.hidden.ttlUpdated', { value: ttlLabel(next, t) }),
        color: 'green',
        autoClose: 1500,
      });
    } catch (err) {
      notifications.show({
        message: err instanceof Error ? err.message : t('common.error'),
        color: 'red',
      });
    }
  }

  function openSetPin() {
    modals.open({
      title: hasPin ? t('settings.hidden.pinModalChange') : t('settings.hidden.pinModalSet'),
      centered: true,
      children: <PinSetupForm onClose={() => modals.closeAll()} />,
    });
  }

  function openDisablePin() {
    confirmDelete({
      title: t('settings.hidden.disablePinTitle'),
      message: t('settings.hidden.disablePinMessage'),
      confirmLabel: t('settings.hidden.disablePinConfirm'),
      onConfirm: async () => {
        try {
          await setPin.mutateAsync(null);
          notifications.show({ message: t('settings.hidden.pinDisabled'), color: 'gray', autoClose: 1800 });
        } catch (err) {
          notifications.show({
            message: err instanceof Error ? err.message : t('common.error'),
            color: 'red',
          });
        }
      },
    });
  }

  async function handleSaveName() {
    try {
      await updateName.mutateAsync(name);
      notifications.show({ message: t('settings.profile.nameUpdated'), color: 'green', autoClose: 1500 });
    } catch (err) {
      notifications.show({
        message: err instanceof Error ? err.message : t('common.error'),
        color: 'red',
      });
    }
  }

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Group gap="xs">
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
            onClick={goBack}
          >
            {t('settings.back')}
          </Button>
        </Group>

        <Title order={2}>{t('settings.title')}</Title>

        <Divider label={t('settings.profile.divider')} labelPosition="left" />

        <Stack gap="xs">
          <Group gap="md" align="center">
            <Box
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: 'var(--mantine-primary-color-light)',
                color: 'var(--mantine-primary-color-filled)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: '0 0 auto',
              }}
            >
              {(() => {
                const Icon = getIcon(profile.data?.icon ?? 'IconCat');
                return <Icon size={28} stroke={2} />;
              })()}
            </Box>
            <Stack gap={2} flex={1} miw={0}>
              <Text fw={600} truncate>
                {profile.data?.name ?? '...'}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {user?.email}
              </Text>
            </Stack>
          </Group>

          <TextInput
            label={t('settings.profile.nameLabel')}
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
          <Button
            onClick={handleSaveName}
            loading={updateName.isPending}
            disabled={!name.trim() || name === profile.data?.name}
            size="sm"
          >
            {t('settings.profile.saveName')}
          </Button>

          <Box mt="sm">
            <Text size="sm" fw={500} mb={6}>
              {t('settings.profile.avatar')}
            </Text>
            <AnimalIconPicker
              value={profile.data?.icon ?? 'IconCat'}
              onChange={async (icon) => {
                try {
                  await updateIcon.mutateAsync(icon);
                  notifications.show({ message: t('settings.profile.avatarUpdated'), color: 'green', autoClose: 1200 });
                } catch (err) {
                  notifications.show({
                    message: err instanceof Error ? err.message : t('common.error'),
                    color: 'red',
                  });
                }
              }}
              color="var(--mantine-primary-color-filled)"
            />
          </Box>
        </Stack>

        <Divider label={t('settings.language.label')} labelPosition="left" mt="md" />

        <Stack gap={6}>
          <Text size="xs" c="dimmed">
            {t('settings.language.description')}
          </Text>
          <SegmentedControl
            fullWidth
            value={currentLang}
            onChange={(value) => {
              void i18n.changeLanguage(value);
            }}
            data={SUPPORTED_LANGUAGES.map((lng) => ({
              value: lng,
              label: t(`language.${lng}`),
            }))}
          />
        </Stack>

        <Divider label={t('settings.features.divider')} labelPosition="left" mt="md" />

        <Group wrap="nowrap" align="flex-start" gap="sm">
          <Box pt={2}>
            <IconBriefcase size={20} color="var(--mantine-color-dimmed)" />
          </Box>
          <Box flex={1} miw={0}>
            <Group justify="space-between" wrap="nowrap" align="center" gap="sm">
              <Text size="sm" fw={500}>
                {t('settings.features.companyCardLabel')}
              </Text>
              <SegmentedControl
                value={companyCardEnabled ? 'on' : 'off'}
                onChange={(v) => handleCompanyCardToggle(v === 'on')}
                size="xs"
                data={[
                  { value: 'off', label: t('common.no') },
                  { value: 'on', label: t('common.yes') },
                ]}
                disabled={updateSettings.isPending}
              />
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              {t('settings.features.companyCardDescription')}
            </Text>
          </Box>
        </Group>

        <Group wrap="nowrap" align="flex-start" gap="sm">
          <Box pt={2}>
            <IconCoin size={20} color="var(--mantine-color-dimmed)" />
          </Box>
          <Box flex={1} miw={0}>
            <Group justify="space-between" wrap="nowrap" align="center" gap="sm">
              <Text size="sm" fw={500}>
                {t('settings.features.defaultCurrencyLabel')}
              </Text>
              <Select
                value={defaultCurrency}
                onChange={(v) => v && handleDefaultCurrencyChange(v)}
                data={CURRENCIES}
                size="xs"
                w={100}
                allowDeselect={false}
                disabled={updateSettings.isPending}
              />
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              {t('settings.features.defaultCurrencyDescription')}
            </Text>
          </Box>
        </Group>

        <Divider label={t('settings.security.divider')} labelPosition="left" mt="md" />

        <Button
          variant="light"
          leftSection={<IconKey size={16} />}
          onClick={() =>
            modals.open({
              title: t('settings.security.passwordModalTitle'),
              centered: true,
              children: <ChangePasswordForm onClose={() => modals.closeAll()} updatePassword={updatePassword} />,
            })
          }
        >
          {t('settings.security.changePassword')}
        </Button>

        <Divider label={t('settings.hidden.divider')} labelPosition="left" mt="md" />

        <Group gap="sm" wrap="wrap" align="center">
          {hasPin ? (
            <Badge color="green" leftSection={<IconLock size={12} />} style={{ flexShrink: 0 }}>
              {t('settings.hidden.pinSet')}
            </Badge>
          ) : (
            <Badge color="gray" leftSection={<IconLockOff size={12} />} style={{ flexShrink: 0 }}>
              {t('settings.hidden.noPin')}
            </Badge>
          )}
          <Text size="sm" c="dimmed">
            {hasPin ? t('settings.hidden.hasPinHint') : t('settings.hidden.noPinHint')}
          </Text>
        </Group>

        <Group gap="xs">
          <Button variant="light" onClick={openSetPin} loading={setPin.isPending} size="sm">
            {hasPin ? t('settings.hidden.changePin') : t('settings.hidden.setPin')}
          </Button>
          {hasPin && (
            <Button
              variant="subtle"
              color="red"
              onClick={openDisablePin}
              loading={setPin.isPending}
              size="sm"
            >
              {t('settings.hidden.disablePin')}
            </Button>
          )}
        </Group>

        {hasPin && (
          <Stack gap={6} mt="sm">
            <Text size="sm" fw={500}>
              {t('settings.hidden.ttlLabel')}
            </Text>
            <Text size="xs" c="dimmed">
              {t('settings.hidden.ttlDescription')}
            </Text>
            <SegmentedControl
              fullWidth
              value={String(ttl)}
              onChange={handleTtlChange}
              data={HIDDEN_PIN_TTL_OPTIONS.map((m) => ({
                value: String(m),
                label: ttlLabel(m, t),
              }))}
              disabled={updateSettings.isPending}
            />
          </Stack>
        )}

        <Button
          variant="subtle"
          mt="md"
          onClick={() => navigate('/hidden-expenses')}
          disabled={!hasPin}
        >
          {t('settings.hidden.openHiddenPage')}
        </Button>

        <Divider label={t('settings.danger.divider')} labelPosition="left" mt="xl" color="red" />

        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          <Trans i18nKey="settings.danger.warning" components={{ strong: <b /> }} />
        </Alert>

        <Button
          variant="light"
          color="red"
          leftSection={<IconTrash size={16} />}
          onClick={openDeleteAccount}
          loading={deleteAccount.isPending}
        >
          {t('settings.danger.deleteButton')}
        </Button>
      </Stack>
    </Container>
  );
}

function ChangePasswordForm({
  updatePassword,
  onClose,
}: {
  updatePassword: (newPassword: string) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (next.length < 6) return setError(t('validation.passwordTooShort', { min: 6 }));
    if (next !== confirm) return setError(t('validation.passwordsDontMatch'));
    setLoading(true);
    try {
      await updatePassword(next);
      notifications.show({
        message: t('settings.security.passwordChanged'),
        color: 'green',
        autoClose: 1500,
        icon: <IconCheck size={14} />,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack gap="sm">
      <PasswordInput
        label={t('settings.security.newPassword')}
        description={t('settings.security.newPasswordHint')}
        autoComplete="new-password"
        required
        value={next}
        onChange={(e) => setNext(e.currentTarget.value)}
      />
      <PasswordInput
        label={t('settings.security.confirmNewPassword')}
        autoComplete="new-password"
        required
        value={confirm}
        onChange={(e) => setConfirm(e.currentTarget.value)}
      />
      {error && (
        <Alert color="red" icon={<IconAlertCircle size={14} />} py={6}>
          {error}
        </Alert>
      )}
      <Group justify="flex-end" mt="sm">
        <Button variant="subtle" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSubmit} loading={loading}>
          {t('common.save')}
        </Button>
      </Group>
    </Stack>
  );
}

function ttlLabel(min: number, t: TFunction): string {
  if (min >= 60) {
    const hours = Math.round(min / 60);
    return t('time.hour', { count: hours });
  }
  return t('time.minutes', { count: min });
}

function PinSetupForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const setPin = useSetHiddenPin();
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!isValidPin(pin1)) return setError(t('settings.hidden.pinRequired'));
    if (pin1 !== pin2) return setError(t('settings.hidden.pinsMismatch'));
    try {
      await setPin.mutateAsync(pin1);
      notifications.show({
        message: t('settings.hidden.pinEnabled'),
        color: 'green',
        autoClose: 1500,
        icon: <IconCheck size={14} />,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  return (
    <Stack gap="sm">
      <Text size="sm">{t('settings.hidden.enterPin')}</Text>
      <Center>
        <PinInput length={4} type="number" value={pin1} onChange={setPin1} mask />
      </Center>
      <Text size="sm" mt="xs">
        {t('settings.hidden.confirmPin')}
      </Text>
      <Center>
        <PinInput length={4} type="number" value={pin2} onChange={setPin2} mask />
      </Center>
      {error && (
        <Alert color="red" icon={<IconAlertCircle size={14} />} py={6}>
          {error}
        </Alert>
      )}
      <Button onClick={handleSubmit} loading={setPin.isPending} disabled={pin1.length !== 4 || pin2.length !== 4}>
        {t('common.save')}
      </Button>
    </Stack>
  );
}
