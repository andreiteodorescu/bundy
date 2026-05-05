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
  useDeleteSaving,
  useSaving,
  useSavings,
  useUpsertSaving,
} from './api';
import type { SavingsDirection } from '@/types';

export function SavingsFormPage() {
  const params = useParams();
  const isNew = !params.id;
  const navigate = useNavigate();
  const editing = useSaving(params.id);
  const all = useSavings();
  const upsert = useUpsertSaving();
  const del = useDeleteSaving();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  // Economiile sunt cel mai des în EUR (depozite, vault Revolut etc.) — default EUR
  // pentru tranzacții noi. Pe edit, useEffect-ul de mai jos hidratează moneda reală.
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [direction, setDirection] = useState<SavingsDirection>('in');
  const [accountName, setAccountName] = useState('');
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
    setAccountName(t.account_name ?? '');
    setDate(new Date(t.occurred_on));
    setNote(t.note ?? '');
  }, [editing.data]);

  // Live RON preview using BNR rate for the picked date
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

  // Account name autocomplete from existing transactions (suggest the user's saved accounts)
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
    if (!name.trim()) return setError('Nume e obligatoriu');
    if (typeof amount !== 'number' || amount <= 0) return setError('Sumă invalidă');
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
      navigate('/savings');
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
          navigate('/savings');
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
            onClick={() => navigate('/savings')}
          >
            Înapoi
          </Button>
        </Group>

        <Title order={2}>{isNew ? 'Tranzacție nouă' : name}</Title>

        <SegmentedControl
          fullWidth
          value={direction}
          onChange={(v) => setDirection(v as SavingsDirection)}
          data={[
            { label: 'Depozit', value: 'in' },
            { label: 'Retragere', value: 'out' },
          ]}
        />

        <TextInput
          label="Nume"
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="ex: Depozit BCR, Vault Revolut, Buffer salariu"
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

        <Autocomplete
          label="Cont (opțional)"
          placeholder="ex: Revolut, BCR Economii, ING Bazar"
          value={accountName}
          onChange={setAccountName}
          data={accountSuggestions}
          description="Util pentru a grupa tranzacțiile în pagina de listare."
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
