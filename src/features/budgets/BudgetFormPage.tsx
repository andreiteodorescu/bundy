import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  NumberInput,
  Select,
  Stack,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconTrash } from '@tabler/icons-react';
import { CURRENCIES, type Currency } from '@/lib/money';
import { BudgetCalendar } from './BudgetCalendar';
import { useBudget, useDeleteBudget, useUpsertBudget } from './api';
import { getFxRate } from '@/lib/fx';

export function BudgetFormPage() {
  const params = useParams();
  const isNew = !params.id;
  const navigate = useNavigate();
  const editing = useBudget(params.id);
  const upsert = useUpsertBudget();
  const del = useDeleteBudget();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [currency, setCurrency] = useState<Currency>('RON');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const b = editing.data;
    if (!b) return;
    setName(b.name);
    setAmount(Number(b.amount_ron));
    setCurrency(b.currency as Currency);
    setSelectedDays(b.selected_days ?? []);
  }, [editing.data]);

  const periodInfo = useMemo(() => {
    if (selectedDays.length === 0) return null;
    const sorted = [...selectedDays].sort();
    return { start: sorted[0], end: sorted[sorted.length - 1], count: sorted.length };
  }, [selectedDays]);

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
    if (selectedDays.length === 0) return setError('Selectează cel puțin o zi');

    try {
      let amountRon = amount;
      if (currency !== 'RON') {
        const rate = await getFxRate(periodInfo!.start, currency);
        amountRon = amount * rate.rate_to_ron;
      }
      await upsert.mutateAsync({
        id: params.id,
        name: name.trim(),
        amount_ron: Math.round(amountRon * 100) / 100,
        period_kind: 'days',
        period_start: periodInfo!.start,
        period_end: periodInfo!.end,
        selected_days: selectedDays,
      });
      navigate('/budgets');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la salvare');
    }
  }

  async function handleDelete() {
    if (!params.id) return;
    if (!window.confirm('Sigur vrei să ștergi acest buget?')) return;
    try {
      await del.mutateAsync(params.id);
      navigate('/budgets');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la ștergere');
    }
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
            onClick={() => navigate('/budgets')}
          >
            Înapoi
          </Button>
        </Group>

        <Title order={2}>{isNew ? 'Buget nou' : name}</Title>

        <TextInput
          label="Nume buget"
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="ex: Vacanță Italia"
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

        <BudgetCalendar value={selectedDays} onChange={setSelectedDays} />

        {error && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {error}
          </Alert>
        )}

        <Button onClick={handleSave} loading={upsert.isPending} size="md">
          {isNew ? 'Creează buget' : 'Salvează'}
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
              Șterge bugetul
            </Button>
          </>
        )}
      </Stack>
    </Container>
  );
}
