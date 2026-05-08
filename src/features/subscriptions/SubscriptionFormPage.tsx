import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  NumberInput,
  Select,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { IconAlertCircle, IconArrowLeft, IconTrash } from '@tabler/icons-react';
import { CURRENCIES, formatRon, type Currency } from '@/lib/money';
import { getFxRate } from '@/lib/fx';
import { confirmDelete } from '@/lib/confirm';
import { ymd } from '@/lib/dates';
import { diacriticsFilter } from '@/lib/text';
import { BrandPicker } from '@/components/BrandPicker';
import { BrandTile } from '@/components/BrandTile';
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
  const [companyCard, setCompanyCard] = useState(false);
  const [companyCardTouched, setCompanyCardTouched] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live RON preview using today's BNR rate. Each future charge will be re-converted
  // at its own date by the subscription generator, so this is just an indicator.
  const todayIso = dayjs().format('YYYY-MM-DD');
  const fxRate = useQuery({
    queryKey: ['fx', todayIso, currency],
    queryFn: () => getFxRate(todayIso, currency),
    enabled: currency !== 'RON',
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  });
  const amountRonPreview =
    currency !== 'RON' && fxRate.data && typeof amount === 'number' && amount > 0
      ? amount * fxRate.data.rate_to_ron
      : null;

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
    setCompanyCard(sub.tags.includes('company-card'));
    setCompanyCardTouched(true);
    setStartDate(new Date(sub.start_date));
    setBrandLogo(sub.brand_logo ?? null);
  }, [editing.data]);

  // Auto-suggest "company card" toggle when category is Work & Business — until user
  // explicitly toggles the Switch. Must run before any early return below to keep the
  // hook order stable across renders (Rules of Hooks).
  const workBusinessCategoryId = (cats.data ?? []).find((c) => c.slug === 'work-business')?.id ?? null;
  useEffect(() => {
    if (companyCardTouched) return;
    if (categoryId && categoryId === workBusinessCategoryId) setCompanyCard(true);
  }, [categoryId, workBusinessCategoryId, companyCardTouched]);

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
      if (companyCard) tags.push('company-card');
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
        brand_logo: brandLogo,
      });
      navigate('/subscriptions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la salvare');
    }
  }

  function handleDelete() {
    if (!params.id) return;
    confirmDelete({
      message: 'Sigur vrei să ștergi acest abonament?',
      onConfirm: async () => {
        try {
          await del.mutateAsync(params.id!);
          navigate('/subscriptions');
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
            onClick={() => navigate('/subscriptions')}
          >
            Înapoi
          </Button>
        </Group>

        <Title order={2}>{isNew ? 'Abonament nou' : name}</Title>

        <TextInput
          label="Nume"
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="ex: Netflix Premium"
        />

        <Box>
          <Group gap={6} mb={6} align="center">
            <Text size="sm" fw={500}>
              Logo
            </Text>
            <BrandTile
              name={name}
              brandSlug={brandLogo}
              fallbackIconName={null}
              fallbackColor="var(--mantine-color-dimmed)"
              size={28}
              iconSize={16}
            />
          </Group>
          <Text size="xs" c="dimmed" mb="xs">
            Auto = se detectează automat după nume. Sau alegi manual din lista de mai jos.
          </Text>
          <BrandPicker value={brandLogo} onChange={setBrandLogo} />
        </Box>

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

        {currency !== 'RON' && (
          <Text size="xs" c="dimmed" mt={-8}>
            {fxRate.isLoading
              ? 'Se încarcă cursul BNR…'
              : amountRonPreview !== null
                ? `≈ ${formatRon(amountRonPreview)} la cursul BNR de azi (recalculat la fiecare debitare)`
                : fxRate.isError
                  ? 'Curs BNR indisponibil — se va recalcula la generarea cheltuielii.'
                  : 'Introdu o sumă pentru a vedea echivalentul în RON.'}
          </Text>
        )}

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
          label="Activ din"
          value={startDate}
          onChange={(d) => d && setStartDate(dayjs(d as unknown as Date).toDate())}
          valueFormat="D MMM YYYY"
          required
        />

        <Select
          label="Categorie"
          required
          searchable
          filter={diacriticsFilter}
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

        <Group wrap="nowrap" align="flex-start" gap="sm">
          <Switch
            checked={active}
            onChange={(e) => setActive(e.currentTarget.checked)}
            aria-label="Activ"
            mt={2}
          />
          <Box flex={1} miw={0}>
            <Text size="sm" fw={500}>
              Activ
            </Text>
            <Text size="xs" c="dimmed">
              Cheltuielile se generează automat la fiecare reînnoire
            </Text>
          </Box>
        </Group>

        {/* Label detașat: doar thumb-ul togglează. Previne activări accidentale la
            tap pe text/scroll pe mobile. aria-label păstrează accesibilitatea. */}
        <Group wrap="nowrap" align="flex-start" gap="sm">
          <Switch
            checked={companyCard}
            onChange={(e) => {
              setCompanyCard(e.currentTarget.checked);
              setCompanyCardTouched(true);
            }}
            aria-label="Plătit cu cardul firmei"
            mt={2}
          />
          <Box flex={1} miw={0}>
            <Text size="sm" fw={500}>
              Plătit cu cardul firmei
            </Text>
            <Text size="xs" c="dimmed">
              ex: Claude Max. Cheltuielile generate sunt excluse din totalul personal în Analytics.
            </Text>
          </Box>
        </Group>

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
              Șterge abonamentul
            </Button>
          </>
        )}
      </Stack>
    </Container>
  );
}
