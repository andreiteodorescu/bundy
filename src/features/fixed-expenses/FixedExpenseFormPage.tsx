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
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { IconAlertCircle, IconArrowLeft, IconTrash } from '@tabler/icons-react';
import { CURRENCIES, formatRon, type Currency } from '@/lib/money';
import { getFxRate } from '@/lib/fx';
import { confirmDelete } from '@/lib/confirm';
import { diacriticsFilter } from '@/lib/text';
import { useCategories, useSubcategories } from '@/features/categories/api';
import {
  useDeleteFixedExpense,
  useFixedExpense,
  useUpsertFixedExpense,
} from './api';

export function FixedExpenseFormPage() {
  const params = useParams();
  const isNew = !params.id;
  const navigate = useNavigate();
  const editing = useFixedExpense(params.id);
  const cats = useCategories();
  const subs = useSubcategories();
  const upsert = useUpsertFixedExpense();
  const del = useDeleteFixedExpense();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [currency, setCurrency] = useState<Currency>('RON');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [companyCard, setCompanyCard] = useState(false);
  const [companyCardTouched, setCompanyCardTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live RON preview for foreign-currency templates. Uses today's BNR rate as a
  // proxy — the actual rate at use-time will be re-fetched per the day the user
  // applies the template (handled by the expense create flow).
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
    const fx = editing.data;
    if (!fx) return;
    setName(fx.name);
    setAmount(Number(fx.amount));
    setCurrency(fx.currency);
    setCategoryId(fx.category_id);
    setSubcategoryId(fx.subcategory_id);
    setCompanyCard(fx.tags?.includes('company-card') ?? false);
    setCompanyCardTouched(true);
  }, [editing.data]);

  // Auto-suggest company card when category is Work & Business
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
    if (!categoryId) return setError('Alege o categorie');
    try {
      await upsert.mutateAsync({
        id: params.id,
        name: name.trim(),
        amount,
        currency,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        tags: companyCard ? ['company-card'] : [],
      });
      navigate('/fixed-expenses');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la salvare');
    }
  }

  function handleDelete() {
    if (!params.id) return;
    confirmDelete({
      message: 'Sigur vrei să ștergi acest șablon?',
      onConfirm: async () => {
        try {
          await del.mutateAsync(params.id!);
          navigate('/fixed-expenses');
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
            onClick={() => navigate('/fixed-expenses')}
          >
            Înapoi
          </Button>
        </Group>

        <Title order={2}>{isNew ? 'Șablon nou' : name}</Title>

        <TextInput
          label="Nume"
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="ex: Terapie"
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

        {currency !== 'RON' && (
          <Text size="xs" c="dimmed" mt={-8}>
            {fxRate.isLoading
              ? 'Se încarcă cursul BNR…'
              : amountRonPreview !== null
                ? `≈ ${formatRon(amountRonPreview)} la cursul BNR de azi (recalculat la fiecare folosire)`
                : fxRate.isError
                  ? 'Curs BNR indisponibil — se va recalcula la folosire.'
                  : 'Introdu o sumă pentru a vedea echivalentul în RON.'}
          </Text>
        )}

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

        <Switch
          label="Plătit cu cardul firmei"
          description="Marchează că nu plătești tu — exclus din totalul personal în Analytics."
          checked={companyCard}
          onChange={(e) => {
            setCompanyCard(e.currentTarget.checked);
            setCompanyCardTouched(true);
          }}
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
              Șterge șablonul
            </Button>
          </>
        )}
      </Stack>
    </Container>
  );
}
