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
import { useTranslation } from 'react-i18next';
import { CURRENCIES, formatRon, type Currency } from '@/lib/money';
import { useDefaultCurrency } from '@/features/settings/api';
import { getFxRate } from '@/lib/fx';
import { ymd } from '@/lib/dates';
import { confirmDelete } from '@/lib/confirm';
import { instrumentTypeDisplayName } from '@/i18n/displayName';
import {
  INVESTMENT_TYPES,
  useDeleteInvestment,
  useInvestment,
  useInvestments,
  useUpsertInvestment,
} from './api';
import type { InvestmentDirection, InvestmentInstrumentType } from '@/types';

export function InvestmentsFormPage() {
  const { t } = useTranslation();
  const params = useParams();
  const isNew = !params.id;
  const navigate = useNavigate();
  const editing = useInvestment(params.id);
  const all = useInvestments();
  const upsert = useUpsertInvestment();
  const del = useDeleteInvestment();

  const defaultCurrency = useDefaultCurrency();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [currencyTouched, setCurrencyTouched] = useState(false);

  useEffect(() => {
    if (currencyTouched) return;
    if (params.id) return;
    setCurrency(defaultCurrency);
  }, [defaultCurrency, params.id, currencyTouched]);
  const [direction, setDirection] = useState<InvestmentDirection>('in');
  const [instrumentType, setInstrumentType] = useState<InvestmentInstrumentType>('etf');
  const [broker, setBroker] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tx = editing.data;
    if (!tx) return;
    setName(tx.name);
    setAmount(Number(tx.amount));
    setCurrency(tx.currency);
    setDirection(tx.direction);
    setInstrumentType(tx.instrument_type);
    setBroker(tx.broker ?? '');
    setDate(new Date(tx.occurred_on));
    setNote(tx.note ?? '');
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
    if (!name.trim()) return setError(t('investments.form.errorNameRequired'));
    if (typeof amount !== 'number' || amount <= 0) return setError(t('investments.form.errorAmountInvalid'));
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
      setError(err instanceof Error ? err.message : t('investments.form.errorSave'));
    }
  }

  function handleDelete() {
    if (!params.id) return;
    confirmDelete({
      message: t('investments.form.deleteConfirmMessage'),
      onConfirm: async () => {
        try {
          await del.mutateAsync(params.id!);
          navigate('/investments');
        } catch (err) {
          setError(err instanceof Error ? err.message : t('investments.form.errorDelete'));
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
            {t('investments.back')}
          </Button>
        </Group>

        <Title order={2}>{isNew ? t('investments.form.newTitle') : name}</Title>

        <SegmentedControl
          fullWidth
          value={direction}
          onChange={(v) => setDirection(v as InvestmentDirection)}
          data={[
            { label: t('investments.form.directionIn'), value: 'in' },
            { label: t('investments.form.directionOut'), value: 'out' },
          ]}
        />

        <TextInput
          label={t('investments.form.name')}
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder={t('investments.form.namePlaceholder')}
        />

        <Group gap="sm" wrap="nowrap" align="end">
          <NumberInput
            label={t('investments.form.amount')}
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
            label={t('investments.form.currency')}
            data={CURRENCIES.map((c) => ({ value: c, label: c }))}
            value={currency}
            onChange={(v) => {
              setCurrencyTouched(true);
              setCurrency((v as Currency) ?? 'RON');
            }}
            allowDeselect={false}
            w={92}
          />
        </Group>

        {currency !== 'RON' && (
          <Text size="xs" c="dimmed" mt={-8}>
            {fxRate.isLoading
              ? t('investments.form.fxLoading')
              : amountRonPreview !== null
                ? t('investments.form.fxPreview', {
                    amount: formatRon(amountRonPreview),
                    date: dayjs(fxRate.data?.date ?? dateIso).format('D MMM YYYY'),
                  })
                : fxRate.isError
                  ? t('investments.form.fxUnavailable')
                  : t('investments.form.fxEnterAmount')}
          </Text>
        )}

        <Select
          label={t('investments.form.instrumentType')}
          required
          data={INVESTMENT_TYPES.map((v) => ({ value: v, label: instrumentTypeDisplayName(v, t) }))}
          value={instrumentType}
          onChange={(v) => v && setInstrumentType(v as InvestmentInstrumentType)}
          allowDeselect={false}
        />

        <Autocomplete
          label={t('investments.form.broker')}
          placeholder={t('investments.form.brokerPlaceholder')}
          value={broker}
          onChange={setBroker}
          data={brokerSuggestions}
        />

        <DatePickerInput
          label={t('investments.form.date')}
          required
          value={date}
          onChange={(d) => d && setDate(new Date(d as unknown as string))}
          valueFormat="D MMMM YYYY"
        />

        <Textarea
          label={t('investments.form.noteOptional')}
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
          {isNew ? t('investments.form.create') : t('investments.form.submit')}
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
              {t('investments.form.delete')}
            </Button>
          </>
        )}
      </Stack>
    </Container>
  );
}
