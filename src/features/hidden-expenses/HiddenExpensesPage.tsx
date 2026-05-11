import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Center,
  Container,
  Group,
  Loader,
  PinInput,
  Stack,
  Text,
  Title,
  UnstyledButton,
  Paper,
  Box,
  Badge,
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconEyeOff, IconLock } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import { readSettings, useProfile } from '@/features/settings/api';
import {
  DEFAULT_HIDDEN_PIN_TTL_MIN,
  isUnlocked,
  markUnlocked,
  verifyPin,
} from '@/lib/pin';
import { useCategories, useSubcategories } from '@/features/categories/api';
import { formatRon } from '@/lib/money';
import { cleanExpenseName } from '@/lib/text';
import { getIcon } from '@/data/icons.registry';
import { categoryDisplayName, subcategoryDisplayName } from '@/i18n/displayName';
import type { Expense } from '@/types';

export function HiddenExpensesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile = useProfile();
  const ttl = readSettings(profile.data).hidden_pin_ttl_min ?? DEFAULT_HIDDEN_PIN_TTL_MIN;
  const [unlocked, setUnlocked] = useState(() => isUnlocked(ttl));

  useEffect(() => {
    function onVis() {
      if (document.visibilityState === 'visible') {
        if (!isUnlocked(ttl)) setUnlocked(false);
      }
    }
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [ttl]);

  if (profile.isLoading) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );
  }

  if (!profile.data?.hidden_pin_hash) {
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
              {t('hidden.back')}
            </Button>
          </Group>
          <Title order={2}>{t('hidden.title')}</Title>
          <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
            {t('hidden.noPin')}
          </Alert>
          <Button onClick={() => navigate('/settings')}>{t('hidden.goToSettings')}</Button>
        </Stack>
      </Container>
    );
  }

  if (!unlocked) {
    return <PinPrompt onUnlock={() => setUnlocked(true)} storedHash={profile.data.hidden_pin_hash} />;
  }

  return <HiddenExpensesList />;
}

function PinPrompt({
  onUnlock,
  storedHash,
}: {
  onUnlock: () => void;
  storedHash: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  async function handleVerify(value: string) {
    if (value.length !== 4) return;
    setVerifying(true);
    setError(null);
    const ok = await verifyPin(value, storedHash);
    setVerifying(false);
    if (ok) {
      markUnlocked();
      onUnlock();
    } else {
      setAttempts((a) => a + 1);
      setError(t('hidden.wrongPin'));
      setPin('');
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
            {t('hidden.back')}
          </Button>
        </Group>

        <Stack align="center" gap="md" py="xl">
          <Box
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'var(--mantine-primary-color-light)',
              color: 'var(--mantine-primary-color-filled)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconLock size={32} stroke={2} />
          </Box>
          <Title order={3} ta="center">
            {t('hidden.title')}
          </Title>
          <Text c="dimmed" size="sm" ta="center">
            {t('hidden.enterPinHint')}
          </Text>
          <PinInput
            length={4}
            type="number"
            value={pin}
            onChange={(v) => {
              setPin(v);
              if (v.length === 4) handleVerify(v);
            }}
            mask
            disabled={verifying}
            autoFocus
            size="lg"
          />
          {error && (
            <Text c="red" size="sm">
              {error} {attempts > 1 ? t('hidden.attempts', { count: attempts }) : ''}
            </Text>
          )}
        </Stack>
      </Stack>
    </Container>
  );
}

function HiddenExpensesList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profileId } = useAuth();
  const cats = useCategories();
  const subs = useSubcategories();

  const expenses = useQuery({
    queryKey: ['hidden_expenses', profileId],
    enabled: Boolean(profileId),
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('hidden', true)
        .order('occurred_on', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Expense[];
    },
  });

  const catById = useMemo(
    () => new Map((cats.data ?? []).map((c) => [c.id, c])),
    [cats.data],
  );
  const subById = useMemo(
    () => new Map((subs.data ?? []).map((s) => [s.id, s])),
    [subs.data],
  );

  const total = (expenses.data ?? []).reduce((s, e) => s + Number(e.amount_ron), 0);

  useEffect(() => {
    const handler = () => markUnlocked();
    window.addEventListener('click', handler);
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('keydown', handler);
    };
  }, []);

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Group gap="xs" justify="space-between">
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/more')}
          >
            {t('hidden.back')}
          </Button>
          <Badge leftSection={<IconEyeOff size={12} />} color="gray">
            {t('hidden.badge')}
          </Badge>
        </Group>

        <Title order={2}>{t('hidden.title')}</Title>
        <Paper withBorder radius="md" p="sm">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {t('hidden.totalCount', { count: expenses.data?.length ?? 0 })}
            </Text>
            <Text fw={700} size="lg">
              {formatRon(total)}
            </Text>
          </Group>
        </Paper>

        {expenses.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : (expenses.data ?? []).length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconEyeOff size={36} stroke={1.5} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed">{t('hidden.empty')}</Text>
            </Stack>
          </Center>
        ) : (
          <Stack gap="xs">
            {(expenses.data ?? []).map((exp) => {
              const category = catById.get(exp.category_id ?? '') ?? null;
              const subcategory = subById.get(exp.subcategory_id ?? '') ?? null;
              const categoryName = category ? categoryDisplayName(category, t) : null;
              const subcategoryName = subcategory ? subcategoryDisplayName(subcategory, t) : null;
              const Icon = getIcon(category?.icon);
              const color = category?.color ?? 'var(--mantine-color-gray-6)';
              return (
                <UnstyledButton key={exp.id} onClick={() => navigate(`/expenses/${exp.id}/edit`)} w="100%">
                  <Paper withBorder radius="md" p="sm">
                    <Group wrap="nowrap" gap="sm">
                      <Box
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: `${color}22`,
                          color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flex: '0 0 auto',
                        }}
                      >
                        <Icon size={18} stroke={2} />
                      </Box>
                      <Box flex={1} miw={0}>
                        <Text fw={500} truncate>
                          {cleanExpenseName(exp.name)}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {dayjs(exp.occurred_on).format('D MMM YYYY')}
                          {categoryName ? ` · ${categoryName}` : ''}
                          {subcategoryName ? ` › ${subcategoryName}` : ''}
                        </Text>
                      </Box>
                      <Text fw={700}>{formatRon(Number(exp.amount_ron))}</Text>
                    </Group>
                  </Paper>
                </UnstyledButton>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
