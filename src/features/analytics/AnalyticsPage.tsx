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
import { useCategories, useSubcategories } from '@/features/categories/api';
import { formatRon } from '@/lib/money';
import { splitMonthIntoWeeks } from '@/lib/dates';
import { useExpensesInRange, useMonthlyTotals } from './api';
import classes from './AnalyticsPage.module.css';

/** Compact axis tick: 1234 → "1.2k", 12345 → "12k", 234 → "234" */
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
      return { startDate: s.format('YYYY-MM-DD'), endDate: e.format('YYYY-MM-DD'), label: 'Ultimele 3 luni' };
    }
    const s = dayjs().startOf('year');
    const e = dayjs().endOf('day');
    return { startDate: s.format('YYYY-MM-DD'), endDate: e.format('YYYY-MM-DD'), label: s.format('YYYY') };
  }, [range, month]);

  const expenses = useExpensesInRange(startDate, endDate);
  const monthly = useMonthlyTotals(6, {
    categoryId: filterCategory,
    subcategoryId: filterSubcategory,
    // When filtering, include company-card expenses so Work & Business etc. show up.
    excludeCompanyCard: !filterCategory && !filterSubcategory,
  });
  const cats = useCategories();
  const subs = useSubcategories();
  const catById = useMemo(() => new Map((cats.data ?? []).map((c) => [c.id, c])), [cats.data]);
  const subById = useMemo(() => new Map((subs.data ?? []).map((s) => [s.id, s])), [subs.data]);

  const isFiltered = Boolean(filterCategory || filterSubcategory);

  /** Expenses after category/subcategory filter (subcategory wins if both set), separated
   *  into "personal" (no `company-card` tag) and "company-card" buckets. The personal
   *  set drives all charts/totals by default; the company-card total is shown as a
   *  secondary line so the user knows it exists without polluting their personal stats.
   *
   *  When the user explicitly filters by a category/subcategory (e.g. Munca & Business),
   *  they're drilling into a specific scope — show ALL matching expenses, no exclusion,
   *  otherwise filtering Work & Business would be empty since most are company-card. */
  const { personalExpenses, companyCardExpenses } = useMemo(() => {
    let all = expenses.data ?? [];
    if (filterSubcategory) all = all.filter((e) => e.subcategory_id === filterSubcategory);
    else if (filterCategory) all = all.filter((e) => e.category_id === filterCategory);
    const filterActive = Boolean(filterCategory || filterSubcategory);
    if (filterActive) return { personalExpenses: all, companyCardExpenses: [] };
    const personal = [];
    const cc = [];
    for (const e of all) {
      if (e.tags?.includes('company-card')) cc.push(e);
      else personal.push(e);
    }
    return { personalExpenses: personal, companyCardExpenses: cc };
  }, [expenses.data, filterCategory, filterSubcategory]);

  const filteredExpenses = personalExpenses;
  const totalSpent = filteredExpenses.reduce((s, e) => s + Number(e.amount_ron), 0);
  const expenseCount = filteredExpenses.length;
  const avgPerExpense = expenseCount > 0 ? totalSpent / expenseCount : 0;
  const companyCardTotal = companyCardExpenses.reduce((s, e) => s + Number(e.amount_ron), 0);

  /** Subcategory options scoped to the selected category (when one is selected). */
  const subcategoryOptions = useMemo(() => {
    const all = subs.data ?? [];
    const filtered = filterCategory
      ? all.filter((s) => s.parent_category_id === filterCategory)
      : all;
    return filtered.map((s) => {
      const parent = catById.get(s.parent_category_id);
      return {
        value: s.id,
        label: filterCategory ? s.name : `${parent?.name ?? '—'} › ${s.name}`,
      };
    });
  }, [subs.data, filterCategory, catById]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filteredExpenses) {
      if (!e.category_id) continue;
      map.set(e.category_id, (map.get(e.category_id) ?? 0) + Number(e.amount_ron));
    }
    return Array.from(map.entries())
      .map(([id, value]) => {
        const c = catById.get(id);
        return { id, name: c?.name ?? 'Necategorizat', color: c?.color ?? '#888', value };
      })
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses, catById]);

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
          name: s?.name ?? '—',
          parent: c?.name ?? '',
          color: s?.color ?? c?.color ?? '#888',
          value,
        };
      })
      .sort((a, b) => b.value - a.value);
    // When unfiltered, keep the page tidy with top 8. When filtered, show all so small
    // categories (e.g. bilete loto) become visible.
    return isFiltered ? arr : arr.slice(0, 8);
  }, [filteredExpenses, subById, catById, isFiltered]);

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
        label: `S${w.index + 1}`,
        total: inWeek.reduce((s, e) => s + Number(e.amount_ron), 0),
      };
    });
  }, [range, month, filteredExpenses]);

  const isCurrentMonth = dayjs(month).isSame(dayjs(), 'month');

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Title order={2}>Analytics</Title>

        <Group gap="xs" wrap="nowrap">
          <Select
            placeholder="Toate categoriile"
            data={(cats.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
            value={filterCategory}
            onChange={(v) => {
              setFilterCategory(v);
              // Clear subcategory if it no longer belongs to the chosen category.
              const sub = (subs.data ?? []).find((s) => s.id === filterSubcategory);
              if (sub && v && sub.parent_category_id !== v) setFilterSubcategory(null);
            }}
            searchable
            clearable
            flex={1}
            size="sm"
          />
          <Select
            placeholder="Toate subcategoriile"
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
            { label: 'Lună', value: 'month' },
            { label: '3 luni', value: 'last3' },
            { label: 'An', value: 'year' },
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
              <Text c="dimmed">Nicio cheltuială în {label}</Text>
            </Stack>
          </Center>
        ) : (
          <>
            <Paper withBorder radius="md" p="md">
              <div className={classes.totalRow}>
                <Box>
                  <Text size="xs" c="dimmed">
                    Total {label}
                  </Text>
                  <Text fw={800} size="2rem" lh={1.1}>
                    {formatRon(totalSpent)}
                  </Text>
                  {companyCardTotal > 0 && (
                    <Text size="xs" c="dimmed" mt={2}>
                      + {formatRon(companyCardTotal)} cu cardul firmei (excluse din total)
                    </Text>
                  )}
                </Box>
                <Box className={classes.totalRowRight}>
                  <Text size="xs" c="dimmed">
                    {expenseCount} {expenseCount === 1 ? 'cheltuială' : 'cheltuieli'}
                  </Text>
                  <Text size="sm" fw={500}>
                    medie {formatRon(avgPerExpense)}
                  </Text>
                </Box>
              </div>
            </Paper>

            {/* Monthly trend (last 6 months, always shown) */}
            <Paper withBorder radius="md" p="md">
              <Text fw={600} mb="sm">
                Trend lunar (6 luni)
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

            {/* Weekly within month (only for month range) */}
            {range === 'month' && weeklyForMonth.length > 0 && (
              <Paper withBorder radius="md" p="md">
                <Text fw={600} mb="sm">
                  Cheltuieli pe săptămâni
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

            {/* Category donut — hidden when scoped to one category/subcategory (single slice is meaningless) */}
            {!isFiltered && byCategory.length > 0 && (
              <Paper withBorder radius="md" p="md">
                <Text fw={600} mb="sm">
                  Cheltuieli pe categorii
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

            {/* Subcategories breakdown — top 8 by default, full list when filtered */}
            {bySubcategory.length > 0 && (
              <Paper withBorder radius="md" p="md">
                <Text fw={600} mb="sm">
                  {isFiltered ? 'Cheltuieli pe subcategorii' : 'Top subcategorii'}
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
