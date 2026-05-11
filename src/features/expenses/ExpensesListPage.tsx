import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Box,
  Center,
  Container,
  Group,
  Loader,
  Menu,
  Paper,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { MonthPickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import {
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconFileTypeCsv,
  IconFileTypePdf,
  IconReceiptOff,
  IconSparkles,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useCategories, useSubcategories } from '@/features/categories/api';
import { ActiveBudgetBanner } from '@/features/budgets/ActiveBudgetBanner';
import { useCompanyCardEnabled } from '@/features/settings/api';
import { cleanExpenseName } from '@/lib/text';
import { exportExpensesCsv, exportExpensesPdf } from './exportExpenses';
import { useExpensesByMonth } from './api';
import { splitMonthIntoWeeks } from '@/lib/dates';
import { formatRon } from '@/lib/money';
import { getIcon } from '@/data/icons.registry';
import { categoryDisplayName, subcategoryDisplayName } from '@/i18n/displayName';
import type { Category, Expense, Subcategory } from '@/types';

export function ExpensesListPage() {
  const { t } = useTranslation();
  const companyCardEnabled = useCompanyCardEnabled();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const monthParam = searchParams.get('month');
  const [month, setMonthState] = useState<Date>(() => {
    if (monthParam) {
      const parsed = dayjs(monthParam);
      if (parsed.isValid()) return parsed.startOf('month').toDate();
    }
    return dayjs().startOf('month').toDate();
  });

  function setMonth(next: Date) {
    setMonthState(next);
    const ym = dayjs(next).format('YYYY-MM-DD');
    if (searchParams.get('month') !== ym) {
      setSearchParams({ month: ym }, { replace: true });
    }
  }

  useEffect(() => {
    if (!monthParam) return;
    const parsed = dayjs(monthParam);
    if (!parsed.isValid()) return;
    if (!parsed.isSame(month, 'month')) {
      setMonthState(parsed.startOf('month').toDate());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthParam]);
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
  const expensesVisible = useMemo(() => expensesAll.filter((e) => !e.hidden), [expensesAll]);

  const grouped = useMemo(() => {
    return weeks.map((w) => {
      const items = expensesVisible
        .filter((e) => {
          const d = dayjs(e.occurred_on);
          return (
            (d.isSame(w.start, 'day') || d.isAfter(w.start, 'day')) &&
            (d.isSame(w.end, 'day') || d.isBefore(w.end, 'day'))
          );
        })
        .slice()
        .sort((a, b) => {
          const dateCmp = a.occurred_on.localeCompare(b.occurred_on);
          if (dateCmp !== 0) return dateCmp;
          return (a.created_at ?? '').localeCompare(b.created_at ?? '');
        });
      const total = items.reduce((sum, e) => sum + Number(e.amount_ron), 0);
      return { week: w, items, total };
    });
  }, [weeks, expensesVisible]);

  const { personalTotal, companyCardTotal } = expensesAll.reduce(
    (acc, e) => {
      const amt = Number(e.amount_ron);
      if (companyCardEnabled && e.tags?.includes('company-card')) {
        acc.companyCardTotal += amt;
      } else {
        acc.personalTotal += amt;
      }
      return acc;
    },
    { personalTotal: 0, companyCardTotal: 0 },
  );
  const totalCount = expensesAll.length;
  const isCurrentMonth = dayjs(month).isSame(dayjs(), 'month');

  function shiftMonth(delta: number) {
    setMonth(dayjs(month).add(delta, 'month').startOf('month').toDate());
  }

  function runExport(kind: 'csv' | 'pdf') {
    if (totalCount === 0) {
      notifications.show({
        message: t('expenses.export.toastEmpty'),
        color: 'gray',
        autoClose: 1800,
      });
      return;
    }
    const monthLabel = dayjs(month).format('YYYY-MM');
    const monthDisplay = dayjs(month).format('MMMM YYYY').replace(/^./, (c) => c.toUpperCase());
    const maps = {
      catById,
      subById,
      resolveCategoryName: (cat: typeof catById extends Map<string, infer V> ? V | null : never) =>
        cat
          ? cat.slug
            ? (t(`categories.names.${cat.slug}`, { defaultValue: cat.name }) as string)
            : cat.name
          : '',
      resolveSubcategoryName: (sub: typeof subById extends Map<string, infer V> ? V | null : never) =>
        sub
          ? sub.slug
            ? (t(`subcategories.names.${sub.slug}`, { defaultValue: sub.name }) as string)
            : sub.name
          : '',
    };
    if (kind === 'csv') {
      exportExpensesCsv({ expenses: expensesAll, monthLabel, maps, t });
    } else {
      exportExpensesPdf({
        expenses: expensesAll,
        monthLabel,
        monthDisplay,
        totals: { personalTotal, companyCardTotal },
        companyCardEnabled,
        maps,
        t,
      });
    }
    notifications.show({ message: t('expenses.export.toastDone'), color: 'green', autoClose: 1500 });
  }

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <ActiveBudgetBanner />
        <Group justify="space-between" align="center">
          <ActionIcon variant="subtle" onClick={() => shiftMonth(-1)} aria-label={t('expenses.previousMonth')}>
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
            aria-label={t('expenses.nextMonth')}
            disabled={isCurrentMonth}
          >
            <IconChevronRight size={18} />
          </ActionIcon>
        </Group>

        <Group justify="flex-end">
          <Menu shadow="md" position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="subtle" aria-label={t('expenses.export.menuLabel')}>
                <IconDownload size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconFileTypePdf size={14} />} onClick={() => runExport('pdf')}>
                {t('expenses.export.pdf')}
              </Menu.Item>
              <Menu.Item leftSection={<IconFileTypeCsv size={14} />} onClick={() => runExport('csv')}>
                {t('expenses.export.csv')}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>

        <Paper withBorder radius="md" p="sm">
          <Stack gap={4}>
            <Group justify="space-between" wrap="nowrap" gap="sm">
              <Text size="sm" c="dimmed">
                {isCurrentMonth ? t('expenses.totals.personalToToday') : t('expenses.totals.personalMonth')}
              </Text>
              <Text fw={700} size="xl">
                {formatRon(personalTotal)}
              </Text>
            </Group>
            {companyCardTotal > 0 && (
              <Group justify="space-between" wrap="nowrap" gap="sm">
                <Text size="xs" c="dimmed">
                  {t('expenses.totals.company')}
                </Text>
                <Text fw={600} size="sm" c="dimmed">
                  {formatRon(companyCardTotal)}
                </Text>
              </Group>
            )}
          </Stack>
        </Paper>

        {expensesQ.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : totalCount === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconReceiptOff size={36} stroke={1.5} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed">{t('expenses.emptyMonth')}</Text>
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
                      subcategory={subById.get(exp.subcategory_id ?? '') ?? null}
                      onClick={() => navigate(`/expenses/${exp.id}/edit`)}
                      t={t}
                      showCompanyBadge={companyCardEnabled}
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
  subcategory,
  onClick,
  t,
  showCompanyBadge,
}: {
  expense: Expense;
  category: Category | null;
  subcategory: Subcategory | null;
  onClick: () => void;
  t: TFunction;
  showCompanyBadge: boolean;
}) {
  const Icon = getIcon(category?.icon);
  const color = category?.color ?? 'var(--mantine-color-gray-6)';
  const categoryName = category ? categoryDisplayName(category, t) : null;
  const subcategoryName = subcategory ? subcategoryDisplayName(subcategory, t) : null;

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
                {categoryName ? ` · ${categoryName}` : ''}
                {subcategoryName ? ` › ${subcategoryName}` : ''}
              </Text>
              {expense.source === 'subscription' && (
                <Badge size="xs" variant="light" leftSection={<IconSparkles size={10} />}>
                  {t('expenses.badges.subscription')}
                </Badge>
              )}
              {expense.source === 'loan' && (
                <Badge size="xs" variant="light" color="orange">
                  {t('expenses.badges.loan')}
                </Badge>
              )}
              {expense.source === 'quick' && (
                <Badge size="xs" variant="light" color="yellow">
                  {t('expenses.badges.quick')}
                </Badge>
              )}
              {showCompanyBadge && expense.tags?.includes('company-card') && (
                <Badge size="xs" variant="light" color="gray">
                  {t('expenses.badges.company')}
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
