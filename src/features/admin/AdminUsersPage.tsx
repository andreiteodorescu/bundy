import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Container,
  Group,
  Loader,
  Menu,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import {
  IconAlertCircle,
  IconArrowLeft,
  IconBan,
  IconDots,
  IconKey,
  IconShieldCheck,
  IconTrash,
  IconUserOff,
} from '@tabler/icons-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { confirmDelete } from '@/lib/confirm';
import { getIcon } from '@/data/icons.registry';
import {
  useAdminBan,
  useAdminDelete,
  useAdminResetPassword,
  useAdminUsers,
  useIsAdmin,
  type AdminUser,
} from './api';

export function AdminUsersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const users = useAdminUsers();
  const ban = useAdminBan();
  const del = useAdminDelete();
  const resetPw = useAdminResetPassword();

  if (isAdmin.isLoading) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );
  }

  if (isAdmin.data !== true) {
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
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            Acces refuzat. Această pagină este disponibilă doar pentru administratori.
          </Alert>
        </Stack>
      </Container>
    );
  }

  const list = users.data ?? [];
  const totalUsers = list.length;
  const bannedUsers = list.filter((u) => isBanned(u)).length;
  const recentSignups = list.filter((u) =>
    dayjs(u.user_created_at).isAfter(dayjs().subtract(7, 'day')),
  ).length;
  const totalExpenses = list.reduce((s, u) => s + u.expense_count, 0);

  function handleBan(target: AdminUser, currentlyBanned: boolean) {
    confirmDelete({
      title: currentlyBanned ? 'Deblochează utilizatorul' : 'Blochează utilizatorul',
      message: currentlyBanned
        ? `Permite din nou ${target.email} să se logheze. Datele lui rămân intacte.`
        : `Blochează ${target.email}. Nu se va mai putea loga, dar datele rămân intacte. Poți debloca oricând.`,
      confirmLabel: currentlyBanned ? 'Deblochează' : 'Blochează',
      onConfirm: async () => {
        try {
          await ban.mutateAsync({ userId: target.user_id, ban: !currentlyBanned });
          notifications.show({
            message: currentlyBanned ? 'User deblocat' : 'User blocat',
            color: 'green',
            autoClose: 1500,
          });
        } catch (err) {
          notifications.show({
            message: err instanceof Error ? err.message : 'Eroare',
            color: 'red',
          });
        }
      },
    });
  }

  function handleDelete(target: AdminUser) {
    confirmDelete({
      title: 'Șterge utilizatorul',
      message: `Toate datele lui ${target.email} (cheltuieli, bugete, subscripții, rate, șabloane, categorii) vor fi șterse PERMANENT. Contul va fi eliminat din sistem. Acțiunea NU poate fi inversată.`,
      confirmLabel: 'Șterge definitiv',
      onConfirm: async () => {
        try {
          await del.mutateAsync(target.user_id);
          notifications.show({
            message: `${target.email} șters`,
            color: 'gray',
            autoClose: 2000,
          });
        } catch (err) {
          notifications.show({
            message: err instanceof Error ? err.message : 'Eroare',
            color: 'red',
          });
        }
      },
    });
  }

  async function handleResetPw(target: AdminUser) {
    if (!target.email) return;
    try {
      await resetPw.mutateAsync(target.email);
      notifications.show({
        message: `Email de resetare trimis către ${target.email}`,
        color: 'green',
        autoClose: 2500,
      });
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

        <Group gap="xs" align="center">
          <IconShieldCheck size={24} color="var(--mantine-primary-color-filled)" />
          <Title order={2}>Admin · Utilizatori</Title>
        </Group>

        {/* Stats */}
        <Group gap="xs" grow>
          <StatCard label="Total" value={totalUsers} />
          <StatCard label="Blocați" value={bannedUsers} color="red" />
          <StatCard label="Noi (7 zile)" value={recentSignups} />
        </Group>
        <Paper withBorder radius="md" p="sm">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Total cheltuieli în sistem
            </Text>
            <Text fw={700}>{totalExpenses.toLocaleString('ro-RO')}</Text>
          </Group>
        </Paper>

        {users.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : list.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconUserOff size={36} stroke={1.5} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed">Niciun utilizator</Text>
            </Stack>
          </Center>
        ) : (
          <Stack gap="xs">
            {list.map((u) => (
              <UserRow
                key={u.user_id}
                user={u}
                isCurrent={u.user_id === user?.id}
                onBan={() => handleBan(u, isBanned(u))}
                onDelete={() => handleDelete(u)}
                onResetPw={() => handleResetPw(u)}
                isPending={ban.isPending || del.isPending || resetPw.isPending}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <Paper withBorder radius="md" p="sm">
      <Stack gap={2}>
        <Text size="xs" c="dimmed">
          {label}
        </Text>
        <Text fw={800} size="xl" c={color}>
          {value}
        </Text>
      </Stack>
    </Paper>
  );
}

function UserRow({
  user,
  isCurrent,
  onBan,
  onDelete,
  onResetPw,
  isPending,
}: {
  user: AdminUser;
  isCurrent: boolean;
  onBan: () => void;
  onDelete: () => void;
  onResetPw: () => void;
  isPending: boolean;
}) {
  const banned = isBanned(user);
  const Icon = getIcon(user.profile_icon ?? 'IconCat');

  return (
    <Paper withBorder radius="md" p="sm" style={banned ? { opacity: 0.6 } : undefined}>
      <Group wrap="nowrap" gap="sm">
        <Box
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'var(--mantine-primary-color-light)',
            color: 'var(--mantine-primary-color-filled)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: '0 0 auto',
          }}
        >
          <Icon size={20} stroke={2} />
        </Box>
        <Box flex={1} miw={0}>
          <Group gap={6} wrap="nowrap">
            <Text fw={600} truncate>
              {user.profile_name ?? '(fără profil)'}
            </Text>
            {user.is_admin_flag && (
              <Badge size="xs" color="accent" variant="light">
                admin
              </Badge>
            )}
            {isCurrent && (
              <Badge size="xs" color="gray" variant="light">
                tu
              </Badge>
            )}
            {banned && (
              <Badge size="xs" color="red" variant="light">
                blocat
              </Badge>
            )}
            {!user.email_confirmed_at && (
              <Badge size="xs" color="yellow" variant="light">
                neconfirmat
              </Badge>
            )}
          </Group>
          <Text size="xs" c="dimmed" truncate>
            {user.email ?? '?'}
          </Text>
          <Text size="xs" c="dimmed">
            {user.expense_count} cheltuieli · înregistrat {dayjs(user.user_created_at).format('D MMM YYYY')}
            {user.last_sign_in_at &&
              ` · ultima logare ${dayjs(user.last_sign_in_at).format('D MMM HH:mm')}`}
          </Text>
        </Box>
        {!isCurrent && (
          <Menu shadow="md" position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" size="lg" disabled={isPending}>
                <IconDots size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconKey size={14} />} onClick={onResetPw}>
                Trimite reset parolă
              </Menu.Item>
              <Menu.Item
                leftSection={<IconBan size={14} />}
                color={banned ? 'green' : 'orange'}
                onClick={onBan}
              >
                {banned ? 'Deblochează' : 'Blochează'}
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={onDelete}>
                Șterge cont + date
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>
    </Paper>
  );
}

function isBanned(u: AdminUser): boolean {
  if (!u.banned_until) return false;
  return dayjs(u.banned_until).isAfter(dayjs());
}
