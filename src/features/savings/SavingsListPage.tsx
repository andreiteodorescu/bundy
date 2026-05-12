import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoBack } from '@/lib/useGoBack';
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
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import dayjs from 'dayjs';
import {
  IconArrowLeft,
  IconArrowDownLeft,
  IconArrowUpRight,
  IconPigMoney,
  IconPlus,
  IconSearch,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { formatMoney, formatRon } from '@/lib/money';
import { useTodayDisplayRate } from '@/lib/displayCurrency';
import { useFxRates } from '@/lib/useFxRates';
import { useSavings } from './api';
import type { SavingsTransaction } from '@/types';

const PAGE_SIZE = 20;

export function SavingsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const goBack = useGoBack('/more');
  const savings = useSavings();

  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'in' | 'out'>('all');
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [page, setPage] = useState(1);

  const all = savings.data ?? [];

  const accountOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of all) if (s.account_name) set.add(s.account_name);
    return Array.from(set).sort().map((a) => ({ value: a, label: a }));
  }, [all]);

  const filtered = useMemo(() => {
    let arr = all;
    const q = search.trim().toLowerCase();
    if (q) arr = arr.filter((s) => s.name.toLowerCase().includes(q));
    if (directionFilter !== 'all') arr = arr.filter((s) => s.direction === directionFilter);
    if (accountFilter) arr = arr.filter((s) => s.account_name === accountFilter);
    if (startDate) {
      const sd = dayjs(startDate).format('YYYY-MM-DD');
      arr = arr.filter((s) => s.occurred_on >= sd);
    }
    if (endDate) {
      const ed = dayjs(endDate).format('YYYY-MM-DD');
      arr = arr.filter((s) => s.occurred_on <= ed);
    }
    return arr;
  }, [all, search, directionFilter, accountFilter, startDate, endDate]);

  useEffect(() => {
    setPage(1);
  }, [search, directionFilter, accountFilter, startDate, endDate]);

  const fx = useFxRates(['EUR', 'USD']);
  const eurRate = fx.rateOf('EUR');
  const usdRate = fx.rateOf('USD');

  const { totalInEur, totalOutEur } = filtered.reduce(
    (acc, s) => {
      const amt = Number(s.amount);
      let inEur: number | null = null;
      if (s.currency === 'EUR') inEur = amt;
      else if (s.currency === 'RON' && eurRate) inEur = amt / eurRate;
      else if (s.currency === 'USD' && usdRate && eurRate) inEur = (amt * usdRate) / eurRate;
      if (inEur === null) return acc;
      if (s.direction === 'in') acc.totalInEur += inEur;
      else acc.totalOutEur += inEur;
      return acc;
    },
    { totalInEur: 0, totalOutEur: 0 },
  );
  const netEur = totalInEur - totalOutEur;
  const netRon = eurRate ? netEur * eurRate : null;
  const totalInRon = eurRate ? totalInEur * eurRate : null;
  const totalOutRon = eurRate ? totalOutEur * eurRate : null;
  const ronFallback = filtered.reduce(
    (acc, s) => {
      const amt = Number(s.amount_ron);
      if (s.direction === 'in') acc.totalIn += amt;
      else acc.totalOut += amt;
      return acc;
    },
    { totalIn: 0, totalOut: 0 },
  );
  const ronFallbackNet = ronFallback.totalIn - ronFallback.totalOut;
  const showEur = eurRate !== null;

  // Secondary "in your local currency" line beneath the main EUR sum. Shows
  // the RON / GBP / etc. equivalent of the savings, using today's rate. Hidden
  // when display currency === EUR (would be redundant — main is already EUR).
  const today = useTodayDisplayRate();
  const subDisplayValue =
    today.displayCurrency === 'EUR'
      ? null
      : netRon !== null
        ? today.convertFromRon(netRon)
        : null;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters =
    search.trim() !== '' ||
    directionFilter !== 'all' ||
    accountFilter !== null ||
    startDate !== null ||
    endDate !== null;

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
            onClick={goBack}
          >
            {t('savings.back')}
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            size="sm"
            onClick={() => navigate('/savings/new')}
          >
            {t('savings.addShort')}
          </Button>
        </Group>

        <Group gap="xs" align="center">
          <IconPigMoney size={22} />
          <Title order={2}>{t('savings.title')}</Title>
        </Group>

        <Paper withBorder radius="md" p="sm">
          <Stack gap={4}>
            <Group justify="space-between" wrap="nowrap" gap="sm">
              <Text size="sm" c="dimmed">
                {hasFilters ? t('savings.netFiltered') : t('savings.net')}
              </Text>
              <Box ta="right" miw={0}>
                <Text
                  fw={700}
                  size="xl"
                  c={(showEur ? netEur : ronFallbackNet) >= 0 ? undefined : 'red'}
                >
                  {showEur ? formatMoney(netEur, 'EUR') : formatRon(ronFallbackNet)}
                </Text>
                {showEur && subDisplayValue !== null && (
                  <Text size="xs" c="dimmed" lh={1.1}>
                    {today.formatInDisplay(subDisplayValue)}
                  </Text>
                )}
              </Box>
            </Group>
            {(showEur ? totalInEur > 0 || totalOutEur > 0 : ronFallback.totalIn > 0 || ronFallback.totalOut > 0) && (
              <Text size="xs" c="dimmed">
                {showEur && totalInRon !== null && totalOutRon !== null
                  ? t('savings.depositsWithdrawalsLine', {
                      deposits: formatMoney(totalInEur, 'EUR'),
                      withdrawals: formatMoney(totalOutEur, 'EUR'),
                    })
                  : t('savings.depositsWithdrawalsLine', {
                      deposits: formatRon(ronFallback.totalIn),
                      withdrawals: formatRon(ronFallback.totalOut),
                    })}
              </Text>
            )}
          </Stack>
        </Paper>

        <Stack gap="xs">
          <TextInput
            placeholder={t('savings.searchPlaceholder')}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            size="sm"
          />
          <SegmentedControl
            fullWidth
            value={directionFilter}
            onChange={(v) => setDirectionFilter(v as typeof directionFilter)}
            data={[
              { label: t('savings.directionAll'), value: 'all' },
              { label: t('savings.directionIn'), value: 'in' },
              { label: t('savings.directionOut'), value: 'out' },
            ]}
            size="sm"
          />
          {accountOptions.length > 0 && (
            <Select
              placeholder={t('savings.accountFilterPlaceholder')}
              data={accountOptions}
              value={accountFilter}
              onChange={setAccountFilter}
              clearable
              searchable
              size="sm"
            />
          )}
          <Group gap="xs" grow>
            <DatePickerInput
              placeholder={t('savings.fromPlaceholder')}
              value={startDate}
              onChange={(d) => setStartDate(d ? new Date(d as unknown as string) : null)}
              clearable
              size="sm"
              valueFormat="D MMM YYYY"
            />
            <DatePickerInput
              placeholder={t('savings.toPlaceholder')}
              value={endDate}
              onChange={(d) => setEndDate(d ? new Date(d as unknown as string) : null)}
              clearable
              size="sm"
              valueFormat="D MMM YYYY"
            />
          </Group>
          {hasFilters && (
            <Group justify="flex-end">
              <Button
                variant="subtle"
                size="compact-xs"
                color="gray"
                onClick={() => {
                  setSearch('');
                  setDirectionFilter('all');
                  setAccountFilter(null);
                  setStartDate(null);
                  setEndDate(null);
                }}
              >
                {t('savings.resetFilters')}
              </Button>
            </Group>
          )}
        </Stack>

        <Text size="xs" c="dimmed">
          {t('savings.txCount', { count: filtered.length })}
          {hasFilters && all.length !== filtered.length ? t('savings.outOfTotal', { total: all.length }) : ''}
        </Text>

        {savings.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : pageItems.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconPigMoney size={36} stroke={1.5} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed">
                {all.length === 0 ? t('savings.empty') : t('savings.noMatch')}
              </Text>
              {all.length === 0 && (
                <Button
                  size="sm"
                  variant="light"
                  onClick={() => navigate('/savings/new')}
                  leftSection={<IconPlus size={16} />}
                >
                  {t('savings.addFirst')}
                </Button>
              )}
            </Stack>
          </Center>
        ) : (
          <Stack gap="xs">
            {pageItems.map((s) => (
              <SavingsRow
                key={s.id}
                tx={s}
                onClick={() => navigate(`/savings/${s.id}/edit`)}
                t={t}
              />
            ))}
          </Stack>
        )}

        {totalPages > 1 && (
          <Center>
            <Pagination total={totalPages} value={page} onChange={setPage} size="sm" siblings={1} />
          </Center>
        )}
      </Stack>
    </Container>
  );
}

function SavingsRow({ tx, onClick, t }: { tx: SavingsTransaction; onClick: () => void; t: TFunction }) {
  const isIn = tx.direction === 'in';
  const today = useTodayDisplayRate();
  return (
    <UnstyledButton onClick={onClick}>
      <Paper withBorder radius="md" p="sm">
        <Group wrap="nowrap" gap="sm" align="center">
          <Box
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: isIn
                ? 'var(--mantine-color-teal-light, rgba(20,184,166,0.15))'
                : 'var(--mantine-color-orange-light, rgba(249,115,22,0.15))',
              color: isIn
                ? 'var(--mantine-color-teal-7, #0d9488)'
                : 'var(--mantine-color-orange-7, #ea580c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: '0 0 auto',
            }}
          >
            {isIn ? <IconArrowDownLeft size={18} /> : <IconArrowUpRight size={18} />}
          </Box>
          <Box flex={1} miw={0}>
            <Group gap={6} wrap="nowrap">
              <Text fw={500} truncate>
                {tx.name}
              </Text>
              <Badge size="xs" variant="light" color={isIn ? 'teal' : 'orange'}>
                {isIn ? t('savings.badgeIn') : t('savings.badgeOut')}
              </Badge>
            </Group>
            <Text size="xs" c="dimmed">
              {dayjs(tx.occurred_on).format('D MMM YYYY')}
              {tx.account_name ? ` · ${tx.account_name}` : ''}
            </Text>
          </Box>
          <Box ta="right">
            <Text fw={700} c={isIn ? 'teal' : 'orange'}>
              {isIn ? '+' : '−'}
              {formatMoney(Number(tx.amount), tx.currency)}
            </Text>
            {tx.currency !== today.displayCurrency && (() => {
              const inDisplay = today.convertFromRon(Number(tx.amount_ron));
              if (inDisplay === null) return null;
              return (
                <Text size="xs" c="dimmed">
                  ≈ {today.formatInDisplay(inDisplay)}
                </Text>
              );
            })()}
          </Box>
        </Group>
      </Paper>
    </UnstyledButton>
  );
}
