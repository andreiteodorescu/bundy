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
import { formatMoney, formatRon } from '@/lib/money';
import { INSTRUMENT_TYPE_LABELS, useInvestments } from './api';
import type { InvestmentInstrumentType, InvestmentTransaction } from '@/types';

const PAGE_SIZE = 20;

export function InvestmentsListPage() {
  const navigate = useNavigate();
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

  // Net invested + per-instrument breakdown over the FILTERED set
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
            onClick={() => navigate('/more')}
          >
            Înapoi
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            size="sm"
            onClick={() => navigate('/investments/new')}
          >
            Adaugă
          </Button>
        </Group>

        <Group gap="xs" align="center">
          <IconChartLine size={22} />
          <Title order={2}>Investiții</Title>
        </Group>

        <Paper withBorder radius="md" p="sm">
          <Stack gap={4}>
            <Group justify="space-between" wrap="nowrap">
              <Text size="sm" c="dimmed">
                Net investit{hasFilters ? ' (filtrat)' : ''}
              </Text>
              <Text fw={700} size="xl" c={net >= 0 ? undefined : 'red'}>
                {formatRon(net)}
              </Text>
            </Group>
            {(totalIn > 0 || totalOut > 0) && (
              <Text size="xs" c="dimmed">
                Cumpărări {formatRon(totalIn)} · Vânzări {formatRon(totalOut)}
              </Text>
            )}
            {byInstrument.size > 0 && (
              <Stack gap={2} mt={6}>
                {Array.from(byInstrument.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, amount]) => (
                    <Group key={type} justify="space-between" wrap="nowrap" gap="xs">
                      <Text size="xs" c="dimmed" truncate>
                        {INSTRUMENT_TYPE_LABELS[type]}
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
            placeholder="Caută după nume..."
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
              { label: 'Toate', value: 'all' },
              { label: 'Cumpărări', value: 'in' },
              { label: 'Vânzări', value: 'out' },
            ]}
            size="sm"
          />
          <Select
            placeholder="Filtrează după tip instrument"
            data={Object.entries(INSTRUMENT_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            value={instrumentFilter}
            onChange={(v) => setInstrumentFilter(v as InvestmentInstrumentType | null)}
            clearable
            searchable
            size="sm"
          />
          {brokerOptions.length > 0 && (
            <Select
              placeholder="Filtrează după broker"
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
              placeholder="De la"
              value={startDate}
              onChange={(d) => setStartDate(d ? new Date(d as unknown as string) : null)}
              clearable
              size="sm"
              valueFormat="D MMM YYYY"
            />
            <DatePickerInput
              placeholder="Până la"
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
                Resetează filtrele
              </Button>
            </Group>
          )}
        </Stack>

        <Text size="xs" c="dimmed">
          {filtered.length} {filtered.length === 1 ? 'tranzacție' : 'tranzacții'}
          {hasFilters && all.length !== filtered.length ? ` din ${all.length} totale` : ''}
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
                {all.length === 0 ? 'Nicio tranzacție de investiții' : 'Nicio potrivire'}
              </Text>
              {all.length === 0 && (
                <Button
                  size="sm"
                  variant="light"
                  onClick={() => navigate('/investments/new')}
                  leftSection={<IconPlus size={16} />}
                >
                  Adaugă prima
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

function InvestmentRow({ tx, onClick }: { tx: InvestmentTransaction; onClick: () => void }) {
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
                {isIn ? 'cumpărare' : 'vânzare'}
              </Badge>
            </Group>
            <Text size="xs" c="dimmed">
              {dayjs(tx.occurred_on).format('D MMM YYYY')} · {INSTRUMENT_TYPE_LABELS[tx.instrument_type]}
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
