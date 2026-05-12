import { useGoBack } from '@/lib/useGoBack';
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
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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
  const { t } = useTranslation();
  const goBack = useGoBack('/more');
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
              onClick={goBack}
            >
              {t('admin.back')}
            </Button>
          </Group>
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {t('admin.denied')}
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
      title: currentlyBanned ? t('admin.ban.titleUnban') : t('admin.ban.titleBan'),
      message: currentlyBanned
        ? t('admin.ban.messageUnban', { email: target.email })
        : t('admin.ban.messageBan', { email: target.email }),
      confirmLabel: currentlyBanned ? t('admin.ban.confirmUnban') : t('admin.ban.confirmBan'),
      onConfirm: async () => {
        try {
          await ban.mutateAsync({ userId: target.user_id, ban: !currentlyBanned });
          notifications.show({
            message: currentlyBanned ? t('admin.ban.doneUnban') : t('admin.ban.doneBan'),
            color: 'green',
            autoClose: 1500,
          });
        } catch (err) {
          notifications.show({
            message: err instanceof Error ? err.message : t('admin.error'),
            color: 'red',
          });
        }
      },
    });
  }

  function handleDelete(target: AdminUser) {
    confirmDelete({
      title: t('admin.delete.title'),
      message: t('admin.delete.message', { email: target.email }),
      confirmLabel: t('admin.delete.confirm'),
      onConfirm: async () => {
        try {
          await del.mutateAsync(target.user_id);
          notifications.show({
            message: t('admin.delete.done', { email: target.email }),
            color: 'gray',
            autoClose: 2000,
          });
        } catch (err) {
          notifications.show({
            message: err instanceof Error ? err.message : t('admin.error'),
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
        message: t('admin.resetPasswordSent', { email: target.email }),
        color: 'green',
        autoClose: 2500,
      });
    } catch (err) {
      notifications.show({
        message: err instanceof Error ? err.message : t('admin.error'),
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
            {t('admin.back')}
          </Button>
        </Group>

        <Group gap="xs" align="center">
          <IconShieldCheck size={24} color="var(--mantine-primary-color-filled)" />
          <Title order={2}>{t('admin.title')}</Title>
        </Group>

        <Group gap="xs" grow>
          <StatCard label={t('admin.statTotal')} value={totalUsers} />
          <StatCard label={t('admin.statBanned')} value={bannedUsers} color="red" />
          <StatCard label={t('admin.statRecent')} value={recentSignups} />
        </Group>
        <Paper withBorder radius="md" p="sm">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {t('admin.totalExpenses')}
            </Text>
            <Text fw={700}>{totalExpenses.toLocaleString()}</Text>
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
              <Text c="dimmed">{t('admin.empty')}</Text>
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
                t={t}
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
  t,
}: {
  user: AdminUser;
  isCurrent: boolean;
  onBan: () => void;
  onDelete: () => void;
  onResetPw: () => void;
  isPending: boolean;
  t: TFunction;
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
              {user.profile_name ?? t('admin.noProfile')}
            </Text>
            {user.is_admin_flag && (
              <Badge size="xs" color="accent" variant="light">
                {t('admin.badgeAdmin')}
              </Badge>
            )}
            {isCurrent && (
              <Badge size="xs" color="gray" variant="light">
                {t('admin.badgeYou')}
              </Badge>
            )}
            {banned && (
              <Badge size="xs" color="red" variant="light">
                {t('admin.badgeBanned')}
              </Badge>
            )}
            {!user.email_confirmed_at && (
              <Badge size="xs" color="yellow" variant="light">
                {t('admin.badgeUnverified')}
              </Badge>
            )}
          </Group>
          <Text size="xs" c="dimmed" truncate>
            {user.email ?? '?'}
          </Text>
          <Text size="xs" c="dimmed">
            {t('admin.row.expenseCount', { count: user.expense_count })} ·{' '}
            {t('admin.row.registeredAt', { date: dayjs(user.user_created_at).format('D MMM YYYY') })}
            {user.last_sign_in_at &&
              ` · ${t('admin.row.lastSignIn', { date: dayjs(user.last_sign_in_at).format('D MMM HH:mm') })}`}
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
                {t('admin.actions.resetPassword')}
              </Menu.Item>
              <Menu.Item
                leftSection={<IconBan size={14} />}
                color={banned ? 'green' : 'orange'}
                onClick={onBan}
              >
                {banned ? t('admin.actions.unban') : t('admin.actions.ban')}
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={onDelete}>
                {t('admin.actions.delete')}
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
