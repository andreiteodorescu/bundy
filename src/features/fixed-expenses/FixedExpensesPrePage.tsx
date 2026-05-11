import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Center,
  Container,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconPin, IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useCategories } from '@/features/categories/api';
import { useUpsertExpense } from '@/features/expenses/api';
import { todayIso } from '@/lib/dates';
import { formatMoney, formatRon } from '@/lib/money';
import { useFxRates } from '@/lib/useFxRates';
import { getIcon } from '@/data/icons.registry';
import { categoryDisplayName } from '@/i18n/displayName';
import { useFixedExpenses } from './api';
import type { FixedExpense } from '@/types';

export function FixedExpensesPrePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fixed = useFixedExpenses();
  const cats = useCategories();
  const upsert = useUpsertExpense();
  const catById = new Map((cats.data ?? []).map((c) => [c.id, c]));
  const fxRates = useFxRates((fixed.data ?? []).map((f) => f.currency));

  async function quickAdd(fx: FixedExpense) {
    try {
      await upsert.mutateAsync({
        name: fx.name,
        amount_original: Number(fx.amount),
        currency_original: fx.currency,
        occurred_on: todayIso(),
        category_id: fx.category_id,
        subcategory_id: fx.subcategory_id,
        source: 'fixed',
        source_ref_id: fx.id,
        tags: fx.tags ?? [],
      });
      notifications.show({
        message: t('templates.fixed.added', { name: fx.name }),
        color: 'green',
        autoClose: 1600,
      });
      navigate('/expenses');
    } catch (err) {
      notifications.show({
        message: err instanceof Error ? err.message : t('templates.fixed.addedError'),
        color: 'red',
      });
    }
  }

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Group gap="xs" justify="space-between">
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/home')}
          >
            {t('templates.back')}
          </Button>
          <Button
            size="compact-sm"
            leftSection={<IconPlus size={16} />}
            onClick={() => navigate('/fixed-expenses/new')}
          >
            {t('templates.fixed.newButton')}
          </Button>
        </Group>

        <Box>
          <Title order={2}>{t('templates.fixed.preTitle')}</Title>
          <Text size="sm" c="dimmed">
            {t('templates.fixed.preHint')}
          </Text>
        </Box>

        {fixed.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : (fixed.data ?? []).length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconPin size={36} stroke={1.5} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed">{t('templates.fixed.emptyPre')}</Text>
              <Button
                size="sm"
                variant="light"
                onClick={() => navigate('/fixed-expenses/new')}
                leftSection={<IconPlus size={16} />}
              >
                {t('templates.addFirst')}
              </Button>
            </Stack>
          </Center>
        ) : (
          <Stack gap="xs">
            {(fixed.data ?? []).map((fx) => {
              const category = catById.get(fx.category_id ?? '') ?? null;
              const Icon = getIcon(category?.icon);
              const color = category?.color ?? 'var(--mantine-color-gray-6)';
              const rate = fxRates.rateOf(fx.currency);
              const showRon = fx.currency !== 'RON' && rate !== null;
              const amountRon = showRon ? Number(fx.amount) * rate : null;
              const categoryName = category ? categoryDisplayName(category, t) : t('templates.noCategory');
              return (
                <UnstyledButton key={fx.id} onClick={() => quickAdd(fx)} disabled={upsert.isPending}>
                  <Paper withBorder radius="md" p="md">
                    <Group wrap="nowrap" gap="sm">
                      <Box
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          background: `${color}22`,
                          color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flex: '0 0 auto',
                        }}
                      >
                        <Icon size={20} stroke={2} />
                      </Box>
                      <Box flex={1} miw={0}>
                        <Text fw={600} truncate>
                          {fx.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {categoryName}
                        </Text>
                      </Box>
                      <Box ta="right">
                        <Text fw={700} size="lg">
                          {formatMoney(Number(fx.amount), fx.currency)}
                        </Text>
                        {showRon && amountRon !== null && (
                          <Text size="xs" c="dimmed">
                            ≈ {formatRon(amountRon)}
                          </Text>
                        )}
                      </Box>
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
