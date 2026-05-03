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
  Select,
  Stack,
  Switch,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import dayjs from 'dayjs';
import { IconAlertCircle, IconArrowLeft, IconTrash } from '@tabler/icons-react';
import { CURRENCIES, type Currency } from '@/lib/money';
import { confirmDelete } from '@/lib/confirm';
import { ymd } from '@/lib/dates';
import { useCategories, useSubcategories } from '@/features/categories/api';
import { ROMANIAN_BANKS } from '@/data/banks';
import { useDeleteLoan, useLoan, useUpsertLoan } from './api';

export function LoanFormPage() {
  const params = useParams();
  const isNew = !params.id;
  const navigate = useNavigate();
  const editing = useLoan(params.id);
  const cats = useCategories();
  const subs = useSubcategories();
  const upsert = useUpsertLoan();
  const del = useDeleteLoan();

  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [totalAmount, setTotalAmount] = useState<number | ''>('');
  const [monthlyPayment, setMonthlyPayment] = useState<number | ''>('');
  const [currency, setCurrency] = useState<Currency>('RON');
  const [chargeDay, setChargeDay] = useState<number | ''>(15);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [interestRate, setInterestRate] = useState<number | ''>('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Pre-select Finance > Loans by default for new loans (once categories loaded)
  useEffect(() => {
    if (!isNew) return;
    if (categoryId) return;
    const finance = (cats.data ?? []).find((c) => c.slug === 'finance');
    if (finance) {
      setCategoryId(finance.id);
      const loansSub = (subs.data ?? []).find(
        (s) => s.slug === 'loans' && s.parent_category_id === finance.id,
      );
      if (loansSub) setSubcategoryId(loansSub.id);
    }
  }, [isNew, categoryId, cats.data, subs.data]);

  // Hydrate when editing
  useEffect(() => {
    const l = editing.data;
    if (!l) return;
    setName(l.name);
    setBank(l.bank ?? '');
    setTotalAmount(l.total_amount === null ? '' : Number(l.total_amount));
    setMonthlyPayment(Number(l.monthly_payment));
    setCurrency(l.currency);
    setChargeDay(l.charge_day);
    setStartDate(new Date(l.start_date));
    setEndDate(l.end_date ? new Date(l.end_date) : null);
    setInterestRate(l.interest_rate === null ? '' : Number(l.interest_rate));
    setCategoryId(l.category_id);
    setSubcategoryId(l.subcategory_id);
    setActive(l.active);
    setNote(l.note ?? '');
  }, [editing.data]);

  const childSubs = useMemo(
    () => (subs.data ?? []).filter((s) => s.parent_category_id === categoryId),
    [subs.data, categoryId],
  );

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
    if (typeof monthlyPayment !== 'number' || monthlyPayment <= 0)
      return setError('Rata lunară trebuie să fie > 0');
    if (typeof chargeDay !== 'number' || chargeDay < 1 || chargeDay > 31)
      return setError('Ziua scadentă trebuie între 1 și 31');
    if (!categoryId) return setError('Alege o categorie');
    if (endDate && dayjs(endDate).isBefore(dayjs(startDate)))
      return setError('Data de sfârșit nu poate fi înainte de cea de început');

    try {
      await upsert.mutateAsync({
        id: params.id,
        name: name.trim(),
        bank: bank.trim() || null,
        total_amount: typeof totalAmount === 'number' ? totalAmount : null,
        monthly_payment: monthlyPayment,
        currency,
        charge_day: chargeDay,
        start_date: ymd(startDate),
        end_date: endDate ? ymd(endDate) : null,
        interest_rate: typeof interestRate === 'number' ? interestRate : null,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        active,
        note: note.trim() || null,
      });
      navigate('/loans');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la salvare');
    }
  }

  function handleDelete() {
    if (!params.id) return;
    confirmDelete({
      message: 'Sigur vrei să ștergi această rată?',
      onConfirm: async () => {
        try {
          await del.mutateAsync(params.id!);
          navigate('/loans');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Eroare la ștergere');
        }
      },
    });
  }

  const remainingMonths = endDate ? Math.max(0, dayjs(endDate).diff(dayjs(startDate), 'month')) : null;

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Group gap="xs">
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/loans')}
          >
            Înapoi
          </Button>
        </Group>

        <Title order={2}>{isNew ? 'Rată nouă' : name}</Title>

        <TextInput
          label="Nume"
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="ex: Credit nevoi personale"
        />

        <Autocomplete
          label="Bancă"
          data={ROMANIAN_BANKS}
          value={bank}
          onChange={setBank}
          placeholder="ex: BCR"
          limit={10}
        />

        <Group gap="sm" wrap="nowrap" align="end">
          <NumberInput
            label="Rata lunară"
            required
            flex={1}
            value={monthlyPayment}
            onChange={(v) =>
              setMonthlyPayment(typeof v === 'number' ? v : v === '' ? '' : Number(v))
            }
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

        <NumberInput
          label="Ziua scadentă (1-31)"
          required
          value={chargeDay}
          onChange={(v) => setChargeDay(typeof v === 'number' ? v : v === '' ? '' : Number(v))}
          min={1}
          max={31}
          inputMode="numeric"
        />

        <Group gap="sm" wrap="nowrap">
          <DatePickerInput
            label="Început"
            flex={1}
            value={startDate}
            onChange={(d) => d && setStartDate(dayjs(d as unknown as Date).toDate())}
            valueFormat="D MMM YYYY"
            required
          />
          <DatePickerInput
            label="Sfârșit (opțional)"
            flex={1}
            value={endDate}
            onChange={(d) => setEndDate(d ? dayjs(d as unknown as Date).toDate() : null)}
            valueFormat="D MMM YYYY"
            clearable
            description={remainingMonths !== null ? `${remainingMonths} luni` : undefined}
          />
        </Group>

        <Group gap="sm" wrap="nowrap">
          <NumberInput
            label="Suma totală împrumutată (opțional)"
            flex={1}
            value={totalAmount}
            onChange={(v) => setTotalAmount(typeof v === 'number' ? v : v === '' ? '' : Number(v))}
            min={0}
            decimalScale={2}
            inputMode="decimal"
            description="pentru context, nu afectează raportarea"
          />
          <NumberInput
            label="Dobândă anuală %"
            flex={1}
            value={interestRate}
            onChange={(v) => setInterestRate(typeof v === 'number' ? v : v === '' ? '' : Number(v))}
            min={0}
            max={100}
            decimalScale={2}
            inputMode="decimal"
          />
        </Group>

        <Select
          label="Categorie"
          required
          searchable
          data={(cats.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
          value={categoryId}
          onChange={(v) => {
            setCategoryId(v);
            setSubcategoryId(null);
          }}
        />

        {childSubs.length > 0 && (
          <Select
            label="Subcategorie (opțional)"
            data={[
              { value: '', label: 'Fără subcategorie' },
              ...childSubs.map((s) => ({ value: s.id, label: s.name })),
            ]}
            value={subcategoryId ?? ''}
            onChange={(v) => setSubcategoryId(v && v !== '' ? v : null)}
          />
        )}

        <Switch
          label="Activă"
          description="Cheltuielile se generează automat la fiecare scadență, până la data de sfârșit"
          checked={active}
          onChange={(e) => setActive(e.currentTarget.checked)}
        />

        <Textarea
          label="Notă (opțional)"
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
          autosize
          minRows={2}
          maxRows={4}
        />

        {error && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {error}
          </Alert>
        )}

        <Button onClick={handleSave} loading={upsert.isPending} size="md">
          {isNew ? 'Creează' : 'Salvează'}
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
              Șterge rata
            </Button>
          </>
        )}
      </Stack>
    </Container>
  );
}
