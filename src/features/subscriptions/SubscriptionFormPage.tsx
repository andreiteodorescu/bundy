import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  Modal,
  NumberInput,
  Select,
  SegmentedControl,
  Stack,
  Switch,
  TextInput,
  Title,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import dayjs from 'dayjs';
import { IconAlertCircle, IconArrowLeft, IconTrash } from '@tabler/icons-react';
import { CURRENCIES, type Currency } from '@/lib/money';
import { ymd } from '@/lib/dates';
import { useCategories, useSubcategories } from '@/features/categories/api';
import {
  useDeleteSubscription,
  useSubscription,
  useUpsertSubscription,
} from './api';
import type { SubscriptionCadence } from '@/types';

export function SubscriptionFormPage() {
  const params = useParams();
  const isNew = !params.id;
  const navigate = useNavigate();
  const editing = useSubscription(params.id);
  const cats = useCategories();
  const subs = useSubcategories();
  const upsert = useUpsertSubscription();
  const del = useDeleteSubscription();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [currency, setCurrency] = useState<Currency>('RON');
  const [cadence, setCadence] = useState<SubscriptionCadence>('monthly');
  const [chargeDay, setChargeDay] = useState<number | ''>(1);
  const [chargeMonth, setChargeMonth] = useState<number | ''>(1);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [workReimbursable, setWorkReimbursable] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);

  useEffect(() => {
    const sub = editing.data;
    if (!sub) return;
    setName(sub.name);
    setAmount(Number(sub.amount));
    setCurrency(sub.currency);
    setCadence(sub.cadence);
    setChargeDay(sub.charge_day);
    setChargeMonth(sub.charge_month ?? 1);
    setCategoryId(sub.category_id);
    setSubcategoryId(sub.subcategory_id);
    setActive(sub.active);
    setWorkReimbursable(sub.tags.includes('work-reimbursable'));
    setStartDate(new Date(sub.start_date));
  }, [editing.data]);

  if (!isNew && editing.isLoading) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );
  }

  const childSubs = (subs.data ?? []).filter((s) => s.parent_category_id === categoryId);

  async function handleSave() {
    setError(null);
    if (!name.trim()) return setError('Nume e obligatoriu');
    if (typeof amount !== 'number' || amount <= 0) return setError('Sumă invalidă');
    if (cadence === 'weekly') {
      if (typeof chargeDay !== 'number' || chargeDay < 1 || chargeDay > 7) {
        return setError('Selectează o zi a săptămânii');
      }
    } else {
      if (typeof chargeDay !== 'number' || chargeDay < 1 || chargeDay > 31) {
        return setError('Ziua de debitare 1-31');
      }
    }
    if (cadence === 'yearly' && (typeof chargeMonth !== 'number' || chargeMonth < 1 || chargeMonth > 12))
      return setError('Luna 1-12');
    if (!categoryId) return setError('Alege o categorie');
    try {
      const tags: string[] = ['subscription'];
      if (workReimbursable) tags.push('work-reimbursable');
      await upsert.mutateAsync({
        id: params.id,
        name: name.trim(),
        amount,
        currency,
        cadence,
        charge_day: chargeDay,
        charge_month: cadence === 'yearly' && typeof chargeMonth === 'number' ? chargeMonth : null,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        active,
        tags,
        start_date: ymd(startDate),
      });
      navigate('/subscriptions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la salvare');
    }
  }

  async function handleDelete() {
    if (!params.id) return;
    try {
      await del.mutateAsync(params.id);
      navigate('/subscriptions');
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
            onClick={() => navigate('/subscriptions')}
          >
            Înapoi
          </Button>
        </Group>

        <Title order={2}>{isNew ? 'Subscripție nouă' : name}</Title>

        <TextInput
          label="Nume"
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="ex: Netflix Premium"
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

        <SegmentedControl
          fullWidth
          value={cadence}
          onChange={(v) => {
            setCadence(v as SubscriptionCadence);
            // Reset charge_day to a sensible default when switching cadence
            if (v === 'weekly' && (chargeDay === '' || (chargeDay as number) > 7)) setChargeDay(1);
            if (v !== 'weekly' && (chargeDay === '' || (chargeDay as number) < 1)) setChargeDay(1);
          }}
          data={[
            { label: 'Săptămânal', value: 'weekly' },
            { label: 'Lunar', value: 'monthly' },
            { label: 'Anual', value: 'yearly' },
          ]}
        />

        <Group gap="sm" wrap="nowrap" align="end">
          {cadence === 'weekly' ? (
            <Select
              label="Zi a săptămânii"
              flex={1}
              value={String(chargeDay)}
              onChange={(v) => v && setChargeDay(Number(v))}
              data={[
                { value: '1', label: 'Luni' },
                { value: '2', label: 'Marți' },
                { value: '3', label: 'Miercuri' },
                { value: '4', label: 'Joi' },
                { value: '5', label: 'Vineri' },
                { value: '6', label: 'Sâmbătă' },
                { value: '7', label: 'Duminică' },
              ]}
              allowDeselect={false}
            />
          ) : (
            <NumberInput
              label="Ziua debitării"
              required
              flex={1}
              value={chargeDay}
              onChange={(v) =>
                setChargeDay(typeof v === 'number' ? v : v === '' ? '' : Number(v))
              }
              min={1}
              max={31}
            />
          )}
          {cadence === 'yearly' && (
            <NumberInput
              label="Luna"
              required
              flex={1}
              value={chargeMonth}
              onChange={(v) =>
                setChargeMonth(typeof v === 'number' ? v : v === '' ? '' : Number(v))
              }
              min={1}
              max={12}
            />
          )}
        </Group>

        <DatePickerInput
          label="Activă din"
          value={startDate}
          onChange={(d) => d && setStartDate(dayjs(d as unknown as Date).toDate())}
          valueFormat="D MMM YYYY"
          required
        />

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
          description="Cheltuielile se generează automat la fiecare reînnoire"
          checked={active}
          onChange={(e) => setActive(e.currentTarget.checked)}
        />

        <Switch
          label="Plătită cu cardul firmei"
          description="ex: Claude Max. Aplică automat tag-ul 'work-reimbursable' pe fiecare cheltuială generată — util pentru filtre în Analytics."
          checked={workReimbursable}
          onChange={(e) => setWorkReimbursable(e.currentTarget.checked)}
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
              onClick={openConfirm}
            >
              Șterge subscripția
            </Button>
          </>
        )}
      </Stack>

      <Modal opened={confirmOpen} onClose={closeConfirm} title="Confirmă ștergerea" centered>
        <Stack>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeConfirm}>
              Anulează
            </Button>
            <Button color="red" onClick={handleDelete} loading={del.isPending}>
              Șterge
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
