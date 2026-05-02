import { useEffect } from 'react';
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
import { IconArrowLeft, IconPlus } from '@tabler/icons-react';
import { useCategories } from '@/features/categories/api';
import { useUpsertExpense } from '@/features/expenses/api';
import { todayIso } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { getIcon } from '@/data/icons.registry';
import { useFixedExpenses } from './api';
import type { FixedExpense } from '@/types';

/**
 * Pre-page shown when the user clicks the (+) FAB on the bottom nav. If the user has any
 * fixed_expense templates, this page lists them as one-tap quick-adds. Tapping a template
 * inserts an expense for today using the template's amount/category.
 *
 * If no templates exist, BottomNav routes directly to /expenses/add and skips this page.
 */
export function FixedExpensesPrePage() {
  const navigate = useNavigate();
  const fixed = useFixedExpenses();
  const cats = useCategories();
  const upsert = useUpsertExpense();
  const catById = new Map((cats.data ?? []).map((c) => [c.id, c]));

  // Skip the pre-page entirely when there are no templates
  useEffect(() => {
    if (!fixed.isLoading && (fixed.data?.length ?? 0) === 0) {
      navigate('/expenses/add', { replace: true });
    }
  }, [fixed.isLoading, fixed.data, navigate]);

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
      });
      notifications.show({ message: `${fx.name} adăugat`, color: 'green', autoClose: 1600 });
      navigate('/expenses');
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
            onClick={() => navigate(-1)}
          >
            Înapoi
          </Button>
        </Group>

        <Title order={2}>Quick add</Title>
        <Text size="sm" c="dimmed">
          Tap pe un șablon pentru a adăuga instant cheltuiala pe ziua de azi.
        </Text>

        {fixed.isLoading ? (
          <Center py="md">
            <Loader />
          </Center>
        ) : (
          <Stack gap="xs">
            {(fixed.data ?? []).map((fx) => {
              const category = catById.get(fx.category_id ?? '') ?? null;
              const Icon = getIcon(category?.icon);
              const color = category?.color ?? 'var(--mantine-color-gray-6)';
              return (
                <UnstyledButton
                  key={fx.id}
                  onClick={() => quickAdd(fx)}
                  disabled={upsert.isPending}
                >
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
                          {category?.name ?? 'Fără categorie'}
                        </Text>
                      </Box>
                      <Text fw={700} size="lg">
                        {formatMoney(Number(fx.amount), fx.currency)}
                      </Text>
                    </Group>
                  </Paper>
                </UnstyledButton>
              );
            })}
          </Stack>
        )}

        <Button
          variant="light"
          leftSection={<IconPlus size={18} />}
          onClick={() => navigate('/expenses/add')}
          size="md"
        >
          Adaugă cheltuială nouă
        </Button>
      </Stack>
    </Container>
  );
}
