import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Box,
  Center,
  Container,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { MonthPickerInput } from '@mantine/dates';
import dayjs from 'dayjs';
import {
  IconChevronLeft,
  IconChevronRight,
  IconReceiptOff,
  IconSparkles,
} from '@tabler/icons-react';
import { useCategories, useSubcategories } from '@/features/categories/api';
import { ActiveBudgetBanner } from '@/features/budgets/ActiveBudgetBanner';
import { cleanExpenseName } from '@/lib/text';
import { useExpensesByMonth } from './api';
import { splitMonthIntoWeeks } from '@/lib/dates';
import { formatRon } from '@/lib/money';
import { getIcon } from '@/data/icons.registry';
import type { Expense } from '@/types';

export function ExpensesListPage() {
  const navigate = useNavigate();
  const [month, setMonth] = useState<Date>(() => dayjs().startOf('month').toDate());
  const cats = useCategories();
  const subs = useSubcategories();
  const expensesQ = useExpensesByMonth(dayjs(month).format('YYYY-MM-DD'));

  const catById = useMemo(
    () => new Map((cats.data ?? []).map((c) => [c.id, c])),
    [cats.data],
  );
  const subById = useMemo(
    () => new Map((subs.data ?? []).map((s) => [s.id, s])),
    [subs.data],
  );

  const weeks = useMemo(() => splitMonthIntoWeeks(month), [month]);
  const expensesAll = expensesQ.data ?? [];
  // Hidden expenses don't show as items, but their amounts ARE included in the grand total
  // (so it matches the home widget). See /hidden-expenses (PIN-gated) to view them.
  const expensesVisible = useMemo(() => expensesAll.filter((e) => !e.hidden), [expensesAll]);

  const grouped = useMemo(() => {
    return weeks.map((w) => {
      const items = expensesVisible.filter((e) => {
        const d = dayjs(e.occurred_on);
        return (
          (d.isSame(w.start, 'day') || d.isAfter(w.start, 'day')) &&
          (d.isSame(w.end, 'day') || d.isBefore(w.end, 'day'))
        );
      });
      const total = items.reduce((sum, e) => sum + Number(e.amount_ron), 0);
      return { week: w, items, total };
    });
  }, [weeks, expensesVisible]);

  const grandTotal = expensesAll.reduce((s, e) => s + Number(e.amount_ron), 0);
  const totalCount = expensesAll.length;
  const isCurrentMonth = dayjs(month).isSame(dayjs(), 'month');

  function shiftMonth(delta: number) {
    setMonth(dayjs(month).add(delta, 'month').startOf('month').toDate());
  }

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <ActiveBudgetBanner />
        <Group justify="space-between" align="center">
          <ActionIcon variant="subtle" onClick={() => shiftMonth(-1)} aria-label="Luna anterioară">
            <IconChevronLeft size={18} />
          </ActionIcon>
          <MonthPickerInput
            value={month}
            onChange={(d) => d && setMonth(dayjs(d as unknown as Date).startOf('month').toDate())}
            valueFormat="MMMM YYYY"
            variant="unstyled"
            styles={{ input: { textAlign: 'center', fontWeight: 700, fontSize: 18 } }}
            popoverProps={{ position: 'bottom' }}
            w={180}
          />
          <ActionIcon
            variant="subtle"
            onClick={() => shiftMonth(1)}
            aria-label="Luna următoare"
            disabled={isCurrentMonth}
          >
            <IconChevronRight size={18} />
          </ActionIcon>
        </Group>

        <Paper withBorder radius="md" p="sm">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Total {isCurrentMonth ? 'până azi' : 'pe lună'}
            </Text>
            <Text fw={700} size="xl">
              {formatRon(grandTotal)}
            </Text>
          </Group>
        </Paper>

        {expensesQ.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : totalCount === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconReceiptOff size={36} stroke={1.5} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed">Nicio cheltuială în această lună</Text>
            </Stack>
          </Center>
        ) : (
          grouped.map((g) =>
            g.items.length === 0 ? null : (
              <Stack key={g.week.index} gap={6}>
                <Group justify="space-between" px={4}>
                  <Text size="sm" fw={600} c="dimmed">
                    {g.week.label}
                  </Text>
                  <Text size="sm" fw={600}>
                    {formatRon(g.total)}
                  </Text>
                </Group>
                <Stack gap={6}>
                  {g.items.map((exp) => (
                    <ExpenseRow
                      key={exp.id}
                      expense={exp}
                      category={catById.get(exp.category_id ?? '') ?? null}
                      subcategoryName={subById.get(exp.subcategory_id ?? '')?.name ?? null}
                      onClick={() => navigate(`/expenses/${exp.id}/edit`)}
                    />
                  ))}
                </Stack>
              </Stack>
            ),
          )
        )}
      </Stack>
    </Container>
  );
}

function ExpenseRow({
  expense,
  category,
  subcategoryName,
  onClick,
}: {
  expense: Expense;
  category: { id: string; color: string; icon: string; name: string } | null;
  subcategoryName: string | null;
  onClick: () => void;
}) {
  const Icon = getIcon(category?.icon);
  const color = category?.color ?? 'var(--mantine-color-gray-6)';

  return (
    <UnstyledButton onClick={onClick} w="100%">
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
            <Group gap={6} wrap="nowrap">
              <Text fw={500} truncate>
                {cleanExpenseName(expense.name)}
              </Text>
              {expense.quantity && expense.quantity > 1 && (
                <Text size="sm" fw={700} c="dimmed" style={{ flex: '0 0 auto' }}>
                  ×{expense.quantity}
                </Text>
              )}
            </Group>
            <Group gap={6}>
              <Text size="xs" c="dimmed">
                {dayjs(expense.occurred_on).format('D MMM')}
                {category ? ` · ${category.name}` : ''}
                {subcategoryName ? ` › ${subcategoryName}` : ''}
              </Text>
              {expense.source === 'subscription' && (
                <Badge size="xs" variant="light" leftSection={<IconSparkles size={10} />}>
                  sub
                </Badge>
              )}
              {expense.source === 'loan' && (
                <Badge size="xs" variant="light" color="orange">
                  rată
                </Badge>
              )}
              {expense.source === 'quick' && (
                <Badge size="xs" variant="light" color="yellow">
                  rapid
                </Badge>
              )}
            </Group>
          </Box>
          <Box ta="right">
            <Text fw={700}>{formatRon(Number(expense.amount_ron))}</Text>
            {expense.currency_original !== 'RON' && (
              <Text size="xs" c="dimmed">
                {expense.amount_original} {expense.currency_original}
              </Text>
            )}
          </Box>
        </Group>
      </Paper>
    </UnstyledButton>
  );
}
