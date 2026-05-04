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
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconTrash } from '@tabler/icons-react';
import { CURRENCIES, type Currency } from '@/lib/money';
import { confirmDelete } from '@/lib/confirm';
import { diacriticsFilter } from '@/lib/text';
import { useCategories, useSubcategories } from '@/features/categories/api';
import {
  useDeleteQuickExpense,
  useQuickExpense,
  useUpsertQuickExpense,
} from './api';

export function QuickExpenseFormPage() {
  const params = useParams();
  const isNew = !params.id;
  const navigate = useNavigate();
  const editing = useQuickExpense(params.id);
  const cats = useCategories();
  const subs = useSubcategories();
  const upsert = useUpsertQuickExpense();
  const del = useDeleteQuickExpense();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [currency, setCurrency] = useState<Currency>('RON');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [companyCard, setCompanyCard] = useState(false);
  const [companyCardTouched, setCompanyCardTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = editing.data;
    if (!t) return;
    setName(t.name);
    setAmount(Number(t.amount));
    setCurrency(t.currency);
    setCategoryId(t.category_id);
    setSubcategoryId(t.subcategory_id);
    setActive(t.active);
    setCompanyCard(t.tags?.includes('company-card') ?? false);
    setCompanyCardTouched(true);
  }, [editing.data]);

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
    if (currency !== 'RON') {
      return setError(
        'V1: șabloanele rapide funcționează doar în RON (metrou, loto sunt în lei). Pentru alte monede folosește cheltuiala normală.',
      );
    }
    try {
      await upsert.mutateAsync({
        id: params.id,
        name: name.trim(),
        amount,
        currency,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        icon: null,
        active,
        tags: companyCard ? ['company-card'] : [],
      });
      navigate('/quick-expenses');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la salvare');
    }
  }

  function handleDelete() {
    if (!params.id) return;
    confirmDelete({
      message: 'Sigur vrei să ștergi acest șablon? Cheltuielile generate de el rămân în istoric.',
      onConfirm: async () => {
        try {
          await del.mutateAsync(params.id!);
          navigate('/quick-expenses');
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
            onClick={() => navigate('/quick-expenses')}
          >
            Înapoi
          </Button>
        </Group>

        <Title order={2}>{isNew ? 'Șablon rapid nou' : name}</Title>

        <TextInput
          label="Nume"
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="ex: Călătorie metrou"
        />

        <Group gap="sm" wrap="nowrap" align="end">
          <NumberInput
            label="Preț unitar"
            required
            flex={1}
            value={amount}
            onChange={(v) => setAmount(typeof v === 'number' ? v : v === '' ? '' : Number(v))}
            min={0}
            decimalScale={2}
            inputMode="decimal"
            description="ex: 5 RON pentru o călătorie metrou"
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
          label="Activ"
          description="Apare în lista de quick-add. Inactiv = ascuns dar șablonul se păstrează."
          checked={active}
          onChange={(e) => setActive(e.currentTarget.checked)}
        />

        <Switch
          label="Plătit cu cardul firmei"
          description="Cheltuielile generate vor fi excluse din totalul personal în Analytics."
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
