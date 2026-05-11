import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Center,
  Container,
  Group,
  Loader,
  Pagination,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import dayjs from 'dayjs';
import { IconArchive, IconArrowLeft, IconSearch } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { formatRon } from '@/lib/money';
import { useBudgets } from './api';
import { useCategories, useSubcategories } from '@/features/categories/api';
import { categoryDisplayName, subcategoryDisplayName } from '@/i18n/displayName';
import { BudgetProgressBar } from './BudgetProgressBar';
import type { Budget, Category, Subcategory } from '@/types';

export const ARCHIVE_THRESHOLD_DAYS = 7;
const PAGE_SIZE = 20;

export function BudgetsArchivePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const budgets = useBudgets();
  const cats = useCategories();
  const subs = useSubcategories();
  const catById = useMemo(() => new Map((cats.data ?? []).map((c) => [c.id, c])), [cats.data]);
  const subById = useMemo(() => new Map((subs.data ?? []).map((s) => [s.id, s])), [subs.data]);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [page, setPage] = useState(1);

  const today = dayjs().format('YYYY-MM-DD');
  const archiveCutoff = dayjs(today)
    .subtract(ARCHIVE_THRESHOLD_DAYS, 'day')
    .format('YYYY-MM-DD');

  const archived = useMemo(() => {
    return (budgets.data ?? []).filter((b) => {
      const lastDay = b.selected_days?.length
        ? b.selected_days[b.selected_days.length - 1]
        : b.period_end;
      return lastDay < archiveCutoff;
    });
  }, [budgets.data, archiveCutoff]);

  const filtered = useMemo(() => {
    let arr = archived;
    const q = search.trim().toLowerCase();
    if (q) arr = arr.filter((b) => b.name.toLowerCase().includes(q));
    if (categoryFilter) {
      arr = arr.filter((b) => (b.category_ids ?? []).includes(categoryFilter));
    }
    if (startDate) {
      const s = dayjs(startDate).format('YYYY-MM-DD');
      arr = arr.filter((b) => b.period_end >= s);
    }
    if (endDate) {
      const e = dayjs(endDate).format('YYYY-MM-DD');
      arr = arr.filter((b) => b.period_start <= e);
    }
    return arr;
  }, [archived, search, categoryFilter, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, startDate, endDate]);

  const hasFilters =
    search.trim() !== '' || categoryFilter !== null || startDate !== null || endDate !== null;

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Group gap="xs">
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/budgets')}
          >
            {t('budgets.archive.back')}
          </Button>
        </Group>

        <Group gap="xs" align="center">
          <IconArchive size={22} />
          <Title order={2}>{t('budgets.archive.title')}</Title>
        </Group>

        <Stack gap="xs">
          <TextInput
            placeholder={t('budgets.archive.searchPlaceholder')}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            size="sm"
          />
          <Select
            placeholder={t('budgets.archive.categoryFilterPlaceholder')}
            data={(cats.data ?? []).map((c) => ({ value: c.id, label: categoryDisplayName(c, t) }))}
            value={categoryFilter}
            onChange={setCategoryFilter}
            clearable
            searchable
            size="sm"
          />
          <Group gap="xs" grow>
            <DatePickerInput
              placeholder={t('budgets.archive.fromPlaceholder')}
              value={startDate}
              onChange={(d) => setStartDate(d ? new Date(d as unknown as string) : null)}
              clearable
              size="sm"
              valueFormat="D MMM YYYY"
            />
            <DatePickerInput
              placeholder={t('budgets.archive.toPlaceholder')}
              value={endDate}
              onChange={(d) => setEndDate(d ? new Date(d as unknown as string) : null)}
              clearable
              size="sm"
              valueFormat="D MMM YYYY"
            />
          </Group>
          {hasFilters && (
            <Group gap="xs" justify="flex-end">
              <Button
                variant="subtle"
                size="compact-xs"
                color="gray"
                onClick={() => {
                  setSearch('');
                  setCategoryFilter(null);
                  setStartDate(null);
                  setEndDate(null);
                }}
              >
                {t('budgets.archive.resetFilters')}
              </Button>
            </Group>
          )}
        </Stack>

        <Text size="xs" c="dimmed">
          {t('budgets.archive.count', { count: filtered.length })}
          {hasFilters && archived.length !== filtered.length
            ? t('budgets.archive.outOfTotal', { total: archived.length })
            : ''}
        </Text>

        {budgets.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : pageItems.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconArchive size={36} stroke={1.5} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed">
                {archived.length === 0 ? t('budgets.archive.empty') : t('budgets.archive.noMatch')}
              </Text>
            </Stack>
          </Center>
        ) : (
          <Stack gap="xs">
            {pageItems.map((b) => (
              <ArchivedBudgetRow
                key={b.id}
                budget={b}
                catById={catById}
                subById={subById}
                onOpen={() => navigate(`/budgets/${b.id}/edit`)}
                t={t}
              />
            ))}
          </Stack>
        )}

        {totalPages > 1 && (
          <Center>
            <Pagination
              total={totalPages}
              value={page}
              onChange={setPage}
              size="sm"
              siblings={1}
            />
          </Center>
        )}
      </Stack>
    </Container>
  );
}

function ArchivedBudgetRow({
  budget,
  catById,
  subById,
  onOpen,
  t,
}: {
  budget: Budget;
  catById: Map<string, Category>;
  subById: Map<string, Subcategory>;
  onOpen: () => void;
  t: TFunction;
}) {
  const b = budget;
  return (
    <UnstyledButton onClick={onOpen}>
      <Paper withBorder radius="md" p="md" style={{ opacity: 0.7 }}>
        <Box>
          <Group justify="space-between" mb={4}>
            <Text fw={600}>{b.name}</Text>
            <Text fw={700}>{formatRon(Number(b.amount_ron))}</Text>
          </Group>
          <Text size="xs" c="dimmed" mb={6}>
            {dayjs(b.period_start).format('D MMM YYYY')} –{' '}
            {dayjs(b.period_end).format('D MMM YYYY')}
            {b.selected_days?.length ? ` · ${t('budgets.daysSuffix', { count: b.selected_days.length })}` : ''}
          </Text>
          {(b.category_ids?.length ?? 0) + (b.subcategory_ids?.length ?? 0) > 0 && (
            <Group gap={4} mb="xs" wrap="wrap">
              {(b.category_ids ?? []).map((cid) => {
                const c = catById.get(cid);
                if (!c) return null;
                return (
                  <Badge
                    key={`c-${cid}`}
                    size="xs"
                    variant="light"
                    styles={{ root: { background: `${c.color}22`, color: c.color } }}
                  >
                    {categoryDisplayName(c, t)}
                  </Badge>
                );
              })}
              {(b.subcategory_ids ?? []).map((sid) => {
                const s = subById.get(sid);
                if (!s) return null;
                const parent = catById.get(s.parent_category_id);
                const color = s.color ?? parent?.color ?? 'gray';
                return (
                  <Badge
                    key={`s-${sid}`}
                    size="xs"
                    variant="dot"
                    styles={{ root: { borderColor: color, color } }}
                  >
                    {subcategoryDisplayName(s, t)}
                  </Badge>
                );
              })}
            </Group>
          )}
          <BudgetProgressBar budget={b} />
        </Box>
      </Paper>
    </UnstyledButton>
  );
}
