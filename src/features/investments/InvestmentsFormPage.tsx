import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Button,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { IconAlertCircle, IconArrowLeft, IconTrash } from '@tabler/icons-react';
import { CURRENCIES, formatRon, type Currency } from '@/lib/money';
import { getFxRate } from '@/lib/fx';
import { ymd } from '@/lib/dates';
import { confirmDelete } from '@/lib/confirm';
import {
  INSTRUMENT_TYPE_LABELS,
  useDeleteInvestment,
  useInvestment,
  useInvestments,
  useUpsertInvestment,
} from './api';
import type { InvestmentDirection, InvestmentInstrumentType } from '@/types';

export function InvestmentsFormPage() {
  const params = useParams();
  const isNew = !params.id;
  const navigate = useNavigate();
  const editing = useInvestment(params.id);
  const all = useInvestments();
  const upsert = useUpsertInvestment();
  const del = useDeleteInvestment();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [currency, setCurrency] = useState<Currency>('RON');
  const [direction, setDirection] = useState<InvestmentDirection>('in');
  const [instrumentType, setInstrumentType] = useState<InvestmentInstrumentType>('etf');
  const [broker, setBroker] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = editing.data;
    if (!t) return;
    setName(t.name);
    setAmount(Number(t.amount));
    setCurrency(t.currency);
    setDirection(t.direction);
    setInstrumentType(t.instrument_type);
    setBroker(t.broker ?? '');
    setDate(new Date(t.occurred_on));
    setNote(t.note ?? '');
  }, [editing.data]);

  const dateIso = ymd(date);
  const fxRate = useQuery({
    queryKey: ['fx', dateIso, currency],
    queryFn: () => getFxRate(dateIso, currency),
    enabled: currency !== 'RON',
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  });
  const amountRonPreview =
    currency !== 'RON' && fxRate.data && typeof amount === 'number' && amount > 0
      ? amount * fxRate.data.rate_to_ron
      : null;

  const brokerSuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const i of all.data ?? []) if (i.broker) set.add(i.broker);
    return Array.from(set).sort();
  }, [all.data]);

  if (!isNew && editing.isLoading) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) return setError('Nume e obligatoriu');
    if (typeof amount !== 'number' || amount <= 0) return setError('Sumă invalidă');
    try {
      await upsert.mutateAsync({
        id: params.id,
        name: name.trim(),
        amount,
        currency,
        direction,
        instrument_type: instrumentType,
        broker: broker.trim() || null,
        occurred_on: ymd(date),
        note: note.trim() || null,
      });
      navigate('/investments');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la salvare');
    }
  }

  function handleDelete() {
    if (!params.id) return;
    confirmDelete({
      message: 'Sigur vrei să ștergi această tranzacție?',
      onConfirm: async () => {
        try {
          await del.mutateAsync(params.id!);
          navigate('/investments');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Eroare la ștergere');
        }
      },
    });
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
            onClick={() => navigate('/investments')}
          >
            Înapoi
          </Button>
        </Group>

        <Title order={2}>{isNew ? 'Tranzacție nouă' : name}</Title>

        <SegmentedControl
          fullWidth
          value={direction}
          onChange={(v) => setDirection(v as InvestmentDirection)}
          data={[
            { label: 'Cumpărare', value: 'in' },
            { label: 'Vânzare', value: 'out' },
          ]}
        />

        <TextInput
          label="Nume"
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="ex: Pilon III NN, ETF S&P500, Fond mutual BT, BTC"
        />

        <Group gap="sm" wrap="nowrap" align="end">
          <NumberInput
            label="Sumă"
            required
            flex={1}
            value={amount}
            onChange={(v) => setAmount(typeof v === 'number' ? v : v === '' ? '' : Number(v))}
            min={0}
            decimalScale={2}
            thousandSeparator=" "
            decimalSeparator=","
            placeholder="0,00"
            inputMode="decimal"
          />
          <Select
            label="Monedă"
            data={CURRENCIES.map((c) => ({ value: c, label: c }))}
            value={currency}
            onChange={(v) => setCurrency((v as Currency) ?? 'RON')}
            allowDeselect={false}
            w={92}
          />
        </Group>

        {currency !== 'RON' && (
          <Text size="xs" c="dimmed" mt={-8}>
            {fxRate.isLoading
              ? 'Se încarcă cursul BNR…'
              : amountRonPreview !== null
                ? `≈ ${formatRon(amountRonPreview)} la cursul BNR din ${dayjs(fxRate.data?.date ?? dateIso).format('D MMM YYYY')}`
                : fxRate.isError
                  ? 'Curs BNR indisponibil — se va încerca la salvare.'
                  : 'Introdu o sumă pentru a vedea echivalentul în RON.'}
          </Text>
        )}

        <Select
          label="Tip instrument"
          required
          data={Object.entries(INSTRUMENT_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          value={instrumentType}
          onChange={(v) => v && setInstrumentType(v as InvestmentInstrumentType)}
          allowDeselect={false}
        />

        <Autocomplete
          label="Broker / platformă (opțional)"
          placeholder="ex: XTB, BT Capital, NN Pensii, Binance"
          value={broker}
          onChange={setBroker}
          data={brokerSuggestions}
        />

        <DatePickerInput
          label="Data"
          required
          value={date}
          onChange={(d) => d && setDate(new Date(d as unknown as string))}
          valueFormat="D MMMM YYYY"
        />

        <Textarea
          label="Notă (opțional)"
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
          autosize
          minRows={2}
          maxRows={5}
        />

        {error && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {error}
          </Alert>
        )}

        <Button onClick={handleSave} loading={upsert.isPending} size="md">
          {isNew ? 'Adaugă' : 'Salvează'}
        </Button>

        {!isNew && (
          <>
            <Divider my="md" />
            <Button
              variant="subtle"
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={handleDelete}
              loading={del.isPending}
            >
              Șterge tranzacția
            </Button>
          </>
        )}
      </Stack>
    </Container>
  );
}
