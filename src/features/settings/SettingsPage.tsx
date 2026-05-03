import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  IconCheck,
  IconKey,
  IconLock,
  IconLockOff,
  IconTrash,
} from '@tabler/icons-react';
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
  const { user } = useAuth();
  const profile = useProfile();
  const updateName = useUpdateProfileName();
  const updateIcon = useUpdateProfileIcon();
  const setPin = useSetHiddenPin();
  const updateSettings = useUpdateProfileSettings();
  const deleteAccount = useDeleteAccount();
  const { updatePassword } = useAuth();

  function openDeleteAccount() {
    confirmDelete({
      title: 'Șterge contul',
      message:
        'Toate datele tale (cheltuieli, bugete, subscripții, rate, șabloane, categorii) vor fi șterse PERMANENT. Contul va fi de-asemenea șters din sistem și nu te vei mai putea loga cu această adresă de email. Acțiunea NU poate fi inversată.',
      confirmLabel: 'Șterge definitiv',
      onConfirm: async () => {
        try {
          await deleteAccount.mutateAsync();
          notifications.show({
            message: 'Cont șters. La revedere!',
            color: 'gray',
            autoClose: 2500,
          });
          // Force a clean state regardless of what auth returns
          await supabase.auth.signOut().catch(() => {});
          window.location.href = '/login';
        } catch (err) {
          notifications.show({
            message: err instanceof Error ? err.message : 'Eroare la ștergere',
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

  async function handleTtlChange(value: string) {
    const next = Number(value);
    try {
      await updateSettings.mutateAsync({ hidden_pin_ttl_min: next });
      notifications.show({
        message: `Timpul de relogare setat la ${ttlLabel(next)}`,
        color: 'green',
        autoClose: 1500,
      });
    } catch (err) {
      notifications.show({
        message: err instanceof Error ? err.message : 'Eroare',
        color: 'red',
      });
    }
  }

  function openSetPin() {
    modals.open({
      title: hasPin ? 'Schimbă PIN' : 'Setează PIN',
      centered: true,
      children: <PinSetupForm onClose={() => modals.closeAll()} />,
    });
  }

  function openDisablePin() {
    confirmDelete({
      title: 'Dezactivează PIN',
      message:
        'Cheltuielile ascunse vor rămâne ascunse din liste, dar pagina de gestionare nu va mai cere PIN. Sigur?',
      confirmLabel: 'Dezactivează',
      onConfirm: async () => {
        try {
          await setPin.mutateAsync(null);
          notifications.show({ message: 'PIN dezactivat', color: 'gray', autoClose: 1800 });
        } catch (err) {
          notifications.show({
            message: err instanceof Error ? err.message : 'Eroare',
            color: 'red',
          });
        }
      },
    });
  }

  async function handleSaveName() {
    try {
      await updateName.mutateAsync(name);
      notifications.show({ message: 'Nume actualizat', color: 'green', autoClose: 1500 });
    } catch (err) {
      notifications.show({
        message: err instanceof Error ? err.message : 'Eroare',
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
            onClick={() => navigate('/more')}
          >
            Înapoi
          </Button>
        </Group>

        <Title order={2}>Setări</Title>

        <Divider label="Profil" labelPosition="left" />

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
            label="Nume profil"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
          <Button
            onClick={handleSaveName}
            loading={updateName.isPending}
            disabled={!name.trim() || name === profile.data?.name}
            size="sm"
          >
            Salvează nume
          </Button>

          <Box mt="sm">
            <Text size="sm" fw={500} mb={6}>
              Avatar
            </Text>
            <AnimalIconPicker
              value={profile.data?.icon ?? 'IconCat'}
              onChange={async (icon) => {
                try {
                  await updateIcon.mutateAsync(icon);
                  notifications.show({ message: 'Avatar actualizat', color: 'green', autoClose: 1200 });
                } catch (err) {
                  notifications.show({
                    message: err instanceof Error ? err.message : 'Eroare',
                    color: 'red',
                  });
                }
              }}
              color="var(--mantine-primary-color-filled)"
            />
          </Box>
        </Stack>

        <Divider label="Securitate" labelPosition="left" mt="md" />

        <Button
          variant="light"
          leftSection={<IconKey size={16} />}
          onClick={() =>
            modals.open({
              title: 'Schimbă parola',
              centered: true,
              children: <ChangePasswordForm onClose={() => modals.closeAll()} updatePassword={updatePassword} />,
            })
          }
        >
          Schimbă parola
        </Button>

        <Divider label="Cheltuieli ascunse" labelPosition="left" mt="md" />

        <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
          PIN-ul de 4 cifre e doar pentru privacy <b>din priviri rapide</b>. Nu protejează datele
          de un atacator determinat care are acces la baza de date.
        </Alert>

        <Group gap="sm" wrap="nowrap" align="center">
          {hasPin ? (
            <Badge color="green" leftSection={<IconLock size={12} />}>
              PIN setat
            </Badge>
          ) : (
            <Badge color="gray" leftSection={<IconLockOff size={12} />}>
              Niciun PIN
            </Badge>
          )}
          <Text size="sm" c="dimmed">
            {hasPin
              ? 'Pagina "Cheltuieli ascunse" cere PIN.'
              : 'Setează un PIN pentru a accesa cheltuielile ascunse.'}
          </Text>
        </Group>

        <Group gap="xs">
          <Button variant="light" onClick={openSetPin} loading={setPin.isPending} size="sm">
            {hasPin ? 'Schimbă PIN' : 'Setează PIN'}
          </Button>
          {hasPin && (
            <Button
              variant="subtle"
              color="red"
              onClick={openDisablePin}
              loading={setPin.isPending}
              size="sm"
            >
              Dezactivează PIN
            </Button>
          )}
        </Group>

        {hasPin && (
          <Stack gap={6} mt="sm">
            <Text size="sm" fw={500}>
              Timp re-prompt PIN
            </Text>
            <Text size="xs" c="dimmed">
              După cât timp de inactivitate (sau revenire din background) se cere PIN-ul din nou.
              Fereastra se reînnoiește la fiecare interacțiune cu pagina ascunsă.
            </Text>
            <SegmentedControl
              fullWidth
              value={String(ttl)}
              onChange={handleTtlChange}
              data={HIDDEN_PIN_TTL_OPTIONS.map((m) => ({
                value: String(m),
                label: ttlLabel(m),
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
          Deschide pagina cu cheltuielile ascunse →
        </Button>

        <Divider label="Zonă periculoasă" labelPosition="left" mt="xl" color="red" />

        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          Ștergerea contului e <b>permanentă și ireversibilă</b>. Toate cheltuielile, bugetele,
          subscripțiile, ratele și șabloanele tale vor fi șterse, iar contul va fi eliminat din
          sistem (nu te vei mai putea loga cu acest email).
        </Alert>

        <Button
          variant="light"
          color="red"
          leftSection={<IconTrash size={16} />}
          onClick={openDeleteAccount}
          loading={deleteAccount.isPending}
        >
          Șterge contul
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
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (next.length < 6) return setError('Parola trebuie să aibă minim 6 caractere');
    if (next !== confirm) return setError('Parolele nu se potrivesc');
    setLoading(true);
    try {
      await updatePassword(next);
      notifications.show({
        message: 'Parolă schimbată',
        color: 'green',
        autoClose: 1500,
        icon: <IconCheck size={14} />,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack gap="sm">
      <PasswordInput
        label="Parolă nouă"
        description="Minim 6 caractere"
        autoComplete="new-password"
        required
        value={next}
        onChange={(e) => setNext(e.currentTarget.value)}
      />
      <PasswordInput
        label="Confirmă parola nouă"
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
          Anulează
        </Button>
        <Button onClick={handleSubmit} loading={loading}>
          Salvează
        </Button>
      </Group>
    </Stack>
  );
}

function ttlLabel(min: number): string {
  if (min >= 60) return `${Math.round(min / 60)} ${min === 60 ? 'oră' : 'ore'}`;
  return `${min} min`;
}

function PinSetupForm({ onClose }: { onClose: () => void }) {
  const setPin = useSetHiddenPin();
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!isValidPin(pin1)) return setError('PIN-ul trebuie să aibă exact 4 cifre');
    if (pin1 !== pin2) return setError('Cele două PIN-uri nu se potrivesc');
    try {
      await setPin.mutateAsync(pin1);
      notifications.show({
        message: 'PIN setat',
        color: 'green',
        autoClose: 1500,
        icon: <IconCheck size={14} />,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare');
    }
  }

  return (
    <Stack gap="sm">
      <Text size="sm">Introdu un PIN de 4 cifre:</Text>
      <Center>
        <PinInput length={4} type="number" value={pin1} onChange={setPin1} mask />
      </Center>
      <Text size="sm" mt="xs">
        Confirmă PIN-ul:
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
        Salvează
      </Button>
    </Stack>
  );
}
