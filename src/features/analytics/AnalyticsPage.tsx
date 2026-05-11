import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Box,
  Center,
  Container,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { MonthPickerInput } from '@mantine/dates';
import { BarChart, DonutChart } from '@mantine/charts';
import dayjs from 'dayjs';
import { IconChevronLeft, IconChevronRight, IconReceiptOff } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useCategories, useSubcategories } from '@/features/categories/api';
import { useCompanyCardEnabled } from '@/features/settings/api';
import { categoryDisplayName, subcategoryDisplayName } from '@/i18n/displayName';
import { formatRon } from '@/lib/money';
import { splitMonthIntoWeeks } from '@/lib/dates';
import { useExpensesInRange, useMonthlyTotals } from './api';
import classes from './AnalyticsPage.module.css';

function compactRon(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1000) {
    const k = v / 1000;
    return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1)}k`;
  }
  return `${Math.round(v)}`;
}

type RangeKind = 'month' | 'last3' | 'year';

export function AnalyticsPage() {
  const { t } = useTranslation();
  const companyCardEnabled = useCompanyCardEnabled();
  const [range, setRange] = useState<RangeKind>('month');
  const [month, setMonth] = useState<Date>(() => dayjs().startOf('month').toDate());
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterSubcategory, setFilterSubcategory] = useState<string | null>(null);

  const { startDate, endDate, label } = useMemo(() => {
    if (range === 'month') {
      const s = dayjs(month).startOf('month');
      const e = dayjs(month).endOf('month');
      return { startDate: s.format('YYYY-MM-DD'), endDate: e.format('YYYY-MM-DD'), label: s.format('MMMM YYYY') };
    }
    if (range === 'last3') {
      const s = dayjs().subtract(2, 'month').startOf('month');
      const e = dayjs().endOf('day');
      return { startDate: s.format('YYYY-MM-DD'), endDate: e.format('YYYY-MM-DD'), label: t('analytics.rangeLast3Label') };
    }
    const s = dayjs().startOf('year');
    const e = dayjs().endOf('day');
    return { startDate: s.format('YYYY-MM-DD'), endDate: e.format('YYYY-MM-DD'), label: s.format('YYYY') };
  }, [range, month, t]);

  const expenses = useExpensesInRange(startDate, endDate);
  const monthly = useMonthlyTotals(6, {
    categoryId: filterCategory,
    subcategoryId: filterSubcategory,
    // Only exclude company-card from the trend when the feature is enabled AND
    // no specific filter is active. With the feature off, all expenses are personal.
    excludeCompanyCard: companyCardEnabled && !filterCategory && !filterSubcategory,
  });
  const cats = useCategories();
  const subs = useSubcategories();
  const catById = useMemo(() => new Map((cats.data ?? []).map((c) => [c.id, c])), [cats.data]);
  const subById = useMemo(() => new Map((subs.data ?? []).map((s) => [s.id, s])), [subs.data]);

  const isFiltered = Boolean(filterCategory || filterSubcategory);

  const { personalExpenses, companyCardExpenses } = useMemo(() => {
    let all = expenses.data ?? [];
    if (filterSubcategory) all = all.filter((e) => e.subcategory_id === filterSubcategory);
    else if (filterCategory) all = all.filter((e) => e.category_id === filterCategory);
    const filterActive = Boolean(filterCategory || filterSubcategory);
    if (filterActive || !companyCardEnabled) {
      // Either drilling into a specific scope, or the company-card feature is off:
      // treat everything as personal so the user sees the full picture.
      return { personalExpenses: all, companyCardExpenses: [] };
    }
    const personal = [];
    const cc = [];
    for (const e of all) {
      if (e.tags?.includes('company-card')) cc.push(e);
      else personal.push(e);
    }
    return { personalExpenses: personal, companyCardExpenses: cc };
  }, [expenses.data, filterCategory, filterSubcategory, companyCardEnabled]);

  const filteredExpenses = personalExpenses;
  const totalSpent = filteredExpenses.reduce((s, e) => s + Number(e.amount_ron), 0);
  const expenseCount = filteredExpenses.length;
  const avgPerExpense = expenseCount > 0 ? totalSpent / expenseCount : 0;
  const companyCardTotal = companyCardExpenses.reduce((s, e) => s + Number(e.amount_ron), 0);

  const subcategoryOptions = useMemo(() => {
    const all = subs.data ?? [];
    const filteredSubs = filterCategory
      ? all.filter((s) => s.parent_category_id === filterCategory)
      : all;
    return filteredSubs.map((s) => {
      const parent = catById.get(s.parent_category_id);
      const subName = subcategoryDisplayName(s, t);
      const parentName = parent ? categoryDisplayName(parent, t) : '—';
      return {
        value: s.id,
        label: filterCategory ? subName : `${parentName} › ${subName}`,
      };
    });
  }, [subs.data, filterCategory, catById, t]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filteredExpenses) {
      if (!e.category_id) continue;
      map.set(e.category_id, (map.get(e.category_id) ?? 0) + Number(e.amount_ron));
    }
    return Array.from(map.entries())
      .map(([id, value]) => {
        const c = catById.get(id);
        return {
          id,
          name: c ? categoryDisplayName(c, t) : t('analytics.uncategorized'),
          color: c?.color ?? '#888',
          value,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses, catById, t]);

  const bySubcategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filteredExpenses) {
      if (!e.subcategory_id) continue;
      map.set(e.subcategory_id, (map.get(e.subcategory_id) ?? 0) + Number(e.amount_ron));
    }
    const arr = Array.from(map.entries())
      .map(([id, value]) => {
        const s = subById.get(id);
        const c = s ? catById.get(s.parent_category_id) : null;
        return {
          id,
          name: s ? subcategoryDisplayName(s, t) : '—',
          parent: c ? categoryDisplayName(c, t) : '',
          color: s?.color ?? c?.color ?? '#888',
          value,
        };
      })
      .sort((a, b) => b.value - a.value);
    return isFiltered ? arr : arr.slice(0, 8);
  }, [filteredExpenses, subById, catById, isFiltered, t]);

  const weeklyForMonth = useMemo(() => {
    if (range !== 'month') return [];
    const weeks = splitMonthIntoWeeks(month);
    return weeks.map((w) => {
      const inWeek = filteredExpenses.filter((e) => {
        const d = dayjs(e.occurred_on);
        return (
          (d.isSame(w.start, 'day') || d.isAfter(w.start, 'day')) &&
          (d.isSame(w.end, 'day') || d.isBefore(w.end, 'day'))
        );
      });
      return {
        label: t('analytics.weekShort', { n: w.index + 1 }),
        total: inWeek.reduce((s, e) => s + Number(e.amount_ron), 0),
      };
    });
  }, [range, month, filteredExpenses, t]);

  const isCurrentMonth = dayjs(month).isSame(dayjs(), 'month');

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Title order={2}>{t('analytics.title')}</Title>

        <Group gap="xs" wrap="nowrap">
          <Select
            placeholder={t('analytics.filterCategoryPlaceholder')}
            data={(cats.data ?? []).map((c) => ({ value: c.id, label: categoryDisplayName(c, t) }))}
            value={filterCategory}
            onChange={(v) => {
              setFilterCategory(v);
              const sub = (subs.data ?? []).find((s) => s.id === filterSubcategory);
              if (sub && v && sub.parent_category_id !== v) setFilterSubcategory(null);
            }}
            searchable
            clearable
            flex={1}
            size="sm"
          />
          <Select
            placeholder={t('analytics.filterSubcategoryPlaceholder')}
            data={subcategoryOptions}
            value={filterSubcategory}
            onChange={setFilterSubcategory}
            searchable
            clearable
            flex={1}
            size="sm"
          />
        </Group>

        <SegmentedControl
          fullWidth
          value={range}
          onChange={(v) => setRange(v as RangeKind)}
          data={[
            { label: t('analytics.rangeMonth'), value: 'month' },
            { label: t('analytics.rangeLast3'), value: 'last3' },
            { label: t('analytics.rangeYear'), value: 'year' },
          ]}
        />

        {range === 'month' && (
          <Group justify="space-between" align="center">
            <ActionIcon
              variant="subtle"
              onClick={() => setMonth(dayjs(month).subtract(1, 'month').toDate())}
            >
              <IconChevronLeft size={18} />
            </ActionIcon>
            <MonthPickerInput
              value={month}
              onChange={(d) => d && setMonth(dayjs(d as unknown as Date).startOf('month').toDate())}
              valueFormat="MMMM YYYY"
              variant="unstyled"
              styles={{ input: { textAlign: 'center', fontWeight: 700, fontSize: 18 } }}
              w={180}
            />
            <ActionIcon
              variant="subtle"
              onClick={() => setMonth(dayjs(month).add(1, 'month').toDate())}
              disabled={isCurrentMonth}
            >
              <IconChevronRight size={18} />
            </ActionIcon>
          </Group>
        )}

        {expenses.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : expenseCount === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconReceiptOff size={36} stroke={1.5} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed">{t('analytics.empty', { period: label })}</Text>
            </Stack>
          </Center>
        ) : (
          <>
            <Paper withBorder radius="md" p="md">
              <div className={classes.totalRow}>
                <Box>
                  <Text size="xs" c="dimmed">
                    {t('analytics.totalLabel', { label })}
                  </Text>
                  <Text fw={800} size="2rem" lh={1.1}>
                    {formatRon(totalSpent)}
                  </Text>
                  {companyCardTotal > 0 && (
                    <Text size="xs" c="dimmed" mt={2}>
                      {t('analytics.companyCardSuffix', { amount: formatRon(companyCardTotal) })}
                    </Text>
                  )}
                </Box>
                <Box className={classes.totalRowRight}>
                  <Text size="xs" c="dimmed">
                    {t('analytics.expenseCount', { count: expenseCount })}
                  </Text>
                  <Text size="sm" fw={500}>
                    {t('analytics.average', { amount: formatRon(avgPerExpense) })}
                  </Text>
                </Box>
              </div>
            </Paper>

            <Paper withBorder radius="md" p="md">
              <Text fw={600} mb="sm">
                {t('analytics.monthlyTrend')}
              </Text>
              <BarChart
                h={200}
                data={monthly.monthlyTotals}
                dataKey="label"
                series={[{ name: 'total', color: 'accent.5' }]}
                tickLine="y"
                gridAxis="y"
                valueFormatter={(v) => formatRon(v)}
                withTooltip
                tooltipAnimationDuration={150}
                yAxisProps={{ width: 48, tickFormatter: compactRon }}
              />
            </Paper>

            {range === 'month' && weeklyForMonth.length > 0 && (
              <Paper withBorder radius="md" p="md">
                <Text fw={600} mb="sm">
                  {t('analytics.weeklyTitle')}
                </Text>
                <BarChart
                  h={180}
                  data={weeklyForMonth}
                  dataKey="label"
                  series={[{ name: 'total', color: 'accent.6' }]}
                  tickLine="y"
                  gridAxis="y"
                  valueFormatter={(v) => formatRon(v)}
                  withTooltip
                  yAxisProps={{ width: 48, tickFormatter: compactRon }}
                />
              </Paper>
            )}

            {!isFiltered && byCategory.length > 0 && (
              <Paper withBorder radius="md" p="md">
                <Text fw={600} mb="sm">
                  {t('analytics.byCategory')}
                </Text>
                <div className={classes.donutLayout}>
                  <DonutChart
                    data={byCategory.map((c) => ({ name: c.name, value: c.value, color: c.color }))}
                    size={160}
                    thickness={28}
                    paddingAngle={2}
                    withTooltip
                    tooltipDataSource="segment"
                    chartLabel={formatRon(totalSpent)}
                    valueFormatter={(v) => formatRon(v)}
                  />
                  <Stack gap={6} flex={1} miw={0} className={classes.donutLegend}>
                    {byCategory.slice(0, 6).map((c) => (
                      <Group key={c.id} justify="space-between" wrap="nowrap" gap={6}>
                        <Group gap={6} wrap="nowrap" miw={0}>
                          <Box w={10} h={10} bg={c.color} style={{ borderRadius: 3, flex: '0 0 auto' }} />
                          <Text size="xs" truncate>
                            {c.name}
                          </Text>
                        </Group>
                        <Text size="xs" fw={600} ta="right">
                          {formatRon(c.value)}
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                </div>
              </Paper>
            )}

            {bySubcategory.length > 0 && (
              <Paper withBorder radius="md" p="md">
                <Text fw={600} mb="sm">
                  {isFiltered ? t('analytics.subcategoryBreakdown') : t('analytics.topSubcategories')}
                </Text>
                <Stack gap="xs">
                  {bySubcategory.map((s) => {
                    const pct = totalSpent > 0 ? (s.value / totalSpent) * 100 : 0;
                    return (
                      <Box key={s.id}>
                        <Group justify="space-between" mb={4} gap={4}>
                          <Text size="sm" truncate>
                            {s.name}{' '}
                            <Text component="span" size="xs" c="dimmed">
                              · {s.parent}
                            </Text>
                          </Text>
                          <Text size="sm" fw={600}>
                            {formatRon(s.value)}
                          </Text>
                        </Group>
                        <Box
                          h={6}
                          bg="var(--mantine-color-default-hover)"
                          style={{ borderRadius: 999, position: 'relative', overflow: 'hidden' }}
                        >
                          <Box
                            h="100%"
                            bg={s.color}
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              borderRadius: 999,
                              transition: 'width 200ms ease',
                            }}
                          />
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Paper>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
}
