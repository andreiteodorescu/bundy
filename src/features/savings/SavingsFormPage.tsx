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
import { CURRENCIES, type Currency } from '@/lib/money';
import { useDefaultCurrency } from '@/features/settings/api';
import { useTodayDisplayRate } from '@/lib/displayCurrency';
import { getFxRate } from '@/lib/fx';
import { ymd } from '@/lib/dates';
import { confirmDelete } from '@/lib/confirm';
import {
  useDeleteSaving,
  useSaving,
  useSavings,
  useUpsertSaving,
} from './api';
import type { SavingsDirection } from '@/types';

export function SavingsFormPage() {
  const { t } = useTranslation();
  const params = useParams();
  const isNew = !params.id;
  const navigate = useNavigate();
  const editing = useSaving(params.id);
  const all = useSavings();
  const upsert = useUpsertSaving();
  const del = useDeleteSaving();

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
  const [direction, setDirection] = useState<SavingsDirection>('in');
  const [accountName, setAccountName] = useState('');
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
    setAccountName(tx.account_name ?? '');
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
  // Convert the FX preview's RON value into the user's display currency so the
  // hint reads "≈ X GBP" instead of "≈ Y RON" for non-RON display users.
  const todayDisplay = useTodayDisplayRate();
  const amountDisplayPreview =
    amountRonPreview !== null ? todayDisplay.convertFromRon(amountRonPreview) : null;

  const accountSuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const s of all.data ?? []) if (s.account_name) set.add(s.account_name);
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
    if (!name.trim()) return setError(t('savings.form.errorNameRequired'));
    if (typeof amount !== 'number' || amount <= 0) return setError(t('savings.form.errorAmountInvalid'));
    try {
      await upsert.mutateAsync({
        id: params.id,
        name: name.trim(),
        amount,
        currency,
        direction,
        account_name: accountName.trim() || null,
        occurred_on: ymd(date),
        note: note.trim() || null,
      });
      navigate(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('savings.form.errorSave'));
    }
  }

  function handleDelete() {
    if (!params.id) return;
    confirmDelete({
      message: t('savings.form.deleteConfirmMessage'),
      onConfirm: async () => {
        try {
          await del.mutateAsync(params.id!);
          navigate(-1);
        } catch (err) {
          setError(err instanceof Error ? err.message : t('savings.form.errorDelete'));
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
            onClick={() => navigate(-1)}
          >
            {t('savings.back')}
          </Button>
        </Group>

        <Title order={2}>{isNew ? t('savings.form.newTitle') : name}</Title>

        <SegmentedControl
          fullWidth
          value={direction}
          onChange={(v) => setDirection(v as SavingsDirection)}
          data={[
            { label: t('savings.form.directionIn'), value: 'in' },
            { label: t('savings.form.directionOut'), value: 'out' },
          ]}
        />

        <TextInput
          label={t('savings.form.name')}
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder={t('savings.form.namePlaceholder')}
        />

        <Group gap="sm" wrap="nowrap" align="end">
          <NumberInput
            label={t('savings.form.amount')}
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
            label={t('savings.form.currency')}
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

        {currency !== todayDisplay.displayCurrency && (
          <Text size="xs" c="dimmed" mt={-8}>
            {fxRate.isLoading
              ? t('savings.form.fxLoading')
              : amountDisplayPreview !== null
                ? t('savings.form.fxPreview', {
                    amount: todayDisplay.formatInDisplay(amountDisplayPreview),
                    date: dayjs(fxRate.data?.date ?? dateIso).format('D MMM YYYY'),
                  })
                : fxRate.isError
                  ? t('savings.form.fxUnavailable')
                  : t('savings.form.fxEnterAmount')}
          </Text>
        )}

        <Autocomplete
          label={t('savings.form.account')}
          placeholder={t('savings.form.accountPlaceholder')}
          value={accountName}
          onChange={setAccountName}
          data={accountSuggestions}
          description={t('savings.form.accountHint')}
        />

        <DatePickerInput
          label={t('savings.form.date')}
          required
          value={date}
          onChange={(d) => d && setDate(new Date(d as unknown as string))}
          valueFormat="D MMMM YYYY"
        />

        <Textarea
          label={t('savings.form.noteOptional')}
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
          {isNew ? t('savings.form.create') : t('savings.form.submit')}
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
              {t('savings.form.delete')}
            </Button>
          </>
        )}
      </Stack>
    </Container>
  );
}
