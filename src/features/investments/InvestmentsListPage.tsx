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
  IconChartLine,
  IconPlus,
  IconSearch,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { formatMoney, formatRon } from '@/lib/money';
import { instrumentTypeDisplayName } from '@/i18n/displayName';
import { INVESTMENT_TYPES, useInvestments } from './api';
import type { InvestmentInstrumentType, InvestmentTransaction } from '@/types';

const PAGE_SIZE = 20;

export function InvestmentsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const goBack = useGoBack('/more');
  const investments = useInvestments();

  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'in' | 'out'>('all');
  const [instrumentFilter, setInstrumentFilter] = useState<InvestmentInstrumentType | null>(null);
  const [brokerFilter, setBrokerFilter] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [page, setPage] = useState(1);

  const all = investments.data ?? [];

  const brokerOptions = useMemo(() => {
    const set = new Set<string>();
    for (const i of all) if (i.broker) set.add(i.broker);
    return Array.from(set).sort().map((b) => ({ value: b, label: b }));
  }, [all]);

  const filtered = useMemo(() => {
    let arr = all;
    const q = search.trim().toLowerCase();
    if (q) arr = arr.filter((i) => i.name.toLowerCase().includes(q));
    if (directionFilter !== 'all') arr = arr.filter((i) => i.direction === directionFilter);
    if (instrumentFilter) arr = arr.filter((i) => i.instrument_type === instrumentFilter);
    if (brokerFilter) arr = arr.filter((i) => i.broker === brokerFilter);
    if (startDate) {
      const sd = dayjs(startDate).format('YYYY-MM-DD');
      arr = arr.filter((i) => i.occurred_on >= sd);
    }
    if (endDate) {
      const ed = dayjs(endDate).format('YYYY-MM-DD');
      arr = arr.filter((i) => i.occurred_on <= ed);
    }
    return arr;
  }, [all, search, directionFilter, instrumentFilter, brokerFilter, startDate, endDate]);

  useEffect(() => {
    setPage(1);
  }, [search, directionFilter, instrumentFilter, brokerFilter, startDate, endDate]);

  const { totalIn, totalOut, byInstrument } = useMemo(() => {
    let tIn = 0;
    let tOut = 0;
    const map = new Map<InvestmentInstrumentType, number>();
    for (const i of filtered) {
      const amt = Number(i.amount_ron);
      if (i.direction === 'in') tIn += amt;
      else tOut += amt;
      const signed = i.direction === 'in' ? amt : -amt;
      map.set(i.instrument_type, (map.get(i.instrument_type) ?? 0) + signed);
    }
    return { totalIn: tIn, totalOut: tOut, byInstrument: map };
  }, [filtered]);
  const net = totalIn - totalOut;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters =
    search.trim() !== '' ||
    directionFilter !== 'all' ||
    instrumentFilter !== null ||
    brokerFilter !== null ||
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
            {t('investments.back')}
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            size="sm"
            onClick={() => navigate('/investments/new')}
          >
            {t('investments.addShort')}
          </Button>
        </Group>

        <Group gap="xs" align="center">
          <IconChartLine size={22} />
          <Title order={2}>{t('investments.title')}</Title>
        </Group>

        <Paper withBorder radius="md" p="sm">
          <Stack gap={4}>
            <Group justify="space-between" wrap="nowrap">
              <Text size="sm" c="dimmed">
                {hasFilters ? t('investments.netFiltered') : t('investments.net')}
              </Text>
              <Text fw={700} size="xl" c={net >= 0 ? undefined : 'red'}>
                {formatRon(net)}
              </Text>
            </Group>
            {(totalIn > 0 || totalOut > 0) && (
              <Text size="xs" c="dimmed">
                {t('investments.buysSellsLine', {
                  buys: formatRon(totalIn),
                  sells: formatRon(totalOut),
                })}
              </Text>
            )}
            {byInstrument.size > 0 && (
              <Stack gap={2} mt={6}>
                {Array.from(byInstrument.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, amount]) => (
                    <Group key={type} justify="space-between" wrap="nowrap" gap="xs">
                      <Text size="xs" c="dimmed" truncate>
                        {instrumentTypeDisplayName(type, t)}
                      </Text>
                      <Text size="xs" fw={500}>
                        {formatRon(amount)}
                      </Text>
                    </Group>
                  ))}
              </Stack>
            )}
          </Stack>
        </Paper>

        <Stack gap="xs">
          <TextInput
            placeholder={t('investments.searchPlaceholder')}
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
              { label: t('investments.directionAll'), value: 'all' },
              { label: t('investments.directionIn'), value: 'in' },
              { label: t('investments.directionOut'), value: 'out' },
            ]}
            size="sm"
          />
          <Select
            placeholder={t('investments.instrumentFilterPlaceholder')}
            data={INVESTMENT_TYPES.map((v) => ({ value: v, label: instrumentTypeDisplayName(v, t) }))}
            value={instrumentFilter}
            onChange={(v) => setInstrumentFilter(v as InvestmentInstrumentType | null)}
            clearable
            searchable
            size="sm"
          />
          {brokerOptions.length > 0 && (
            <Select
              placeholder={t('investments.brokerFilterPlaceholder')}
              data={brokerOptions}
              value={brokerFilter}
              onChange={setBrokerFilter}
              clearable
              searchable
              size="sm"
            />
          )}
          <Group gap="xs" grow>
            <DatePickerInput
              placeholder={t('investments.fromPlaceholder')}
              value={startDate}
              onChange={(d) => setStartDate(d ? new Date(d as unknown as string) : null)}
              clearable
              size="sm"
              valueFormat="D MMM YYYY"
            />
            <DatePickerInput
              placeholder={t('investments.toPlaceholder')}
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
                  setInstrumentFilter(null);
                  setBrokerFilter(null);
                  setStartDate(null);
                  setEndDate(null);
                }}
              >
                {t('investments.resetFilters')}
              </Button>
            </Group>
          )}
        </Stack>

        <Text size="xs" c="dimmed">
          {t('investments.txCount', { count: filtered.length })}
          {hasFilters && all.length !== filtered.length ? t('investments.outOfTotal', { total: all.length }) : ''}
        </Text>

        {investments.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : pageItems.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconChartLine size={36} stroke={1.5} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed">
                {all.length === 0 ? t('investments.empty') : t('investments.noMatch')}
              </Text>
              {all.length === 0 && (
                <Button
                  size="sm"
                  variant="light"
                  onClick={() => navigate('/investments/new')}
                  leftSection={<IconPlus size={16} />}
                >
                  {t('investments.addFirst')}
                </Button>
              )}
            </Stack>
          </Center>
        ) : (
          <Stack gap="xs">
            {pageItems.map((i) => (
              <InvestmentRow
                key={i.id}
                tx={i}
                onClick={() => navigate(`/investments/${i.id}/edit`)}
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

function InvestmentRow({
  tx,
  onClick,
  t,
}: {
  tx: InvestmentTransaction;
  onClick: () => void;
  t: TFunction;
}) {
  const isIn = tx.direction === 'in';
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
                ? 'var(--mantine-color-blue-light, rgba(59,130,246,0.15))'
                : 'var(--mantine-color-orange-light, rgba(249,115,22,0.15))',
              color: isIn
                ? 'var(--mantine-color-blue-7, #1d4ed8)'
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
              <Badge size="xs" variant="light" color={isIn ? 'blue' : 'orange'}>
                {isIn ? t('investments.badgeIn') : t('investments.badgeOut')}
              </Badge>
            </Group>
            <Text size="xs" c="dimmed">
              {dayjs(tx.occurred_on).format('D MMM YYYY')} · {instrumentTypeDisplayName(tx.instrument_type, t)}
              {tx.broker ? ` · ${tx.broker}` : ''}
            </Text>
          </Box>
          <Box ta="right">
            <Text fw={700} c={isIn ? 'blue' : 'orange'}>
              {isIn ? '+' : '−'}
              {formatMoney(Number(tx.amount), tx.currency)}
            </Text>
            {tx.currency !== 'RON' && (
              <Text size="xs" c="dimmed">
                ≈ {formatRon(Number(tx.amount_ron))}
              </Text>
            )}
          </Box>
        </Group>
      </Paper>
    </UnstyledButton>
  );
}
