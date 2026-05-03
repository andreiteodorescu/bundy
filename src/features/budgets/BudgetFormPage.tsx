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
  MultiSelect,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconTrash } from '@tabler/icons-react';
import { CURRENCIES, type Currency } from '@/lib/money';
import { confirmDelete } from '@/lib/confirm';
import { BudgetCalendar } from './BudgetCalendar';
import { useBudget, useDeleteBudget, useUpsertBudget } from './api';
import { getFxRate } from '@/lib/fx';
import { useCategories, useSubcategories } from '@/features/categories/api';

export function BudgetFormPage() {
  const params = useParams();
  const isNew = !params.id;
  const navigate = useNavigate();
  const editing = useBudget(params.id);
  const upsert = useUpsertBudget();
  const del = useDeleteBudget();
  const cats = useCategories();
  const subs = useSubcategories();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [currency, setCurrency] = useState<Currency>('RON');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [subcategoryIds, setSubcategoryIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const b = editing.data;
    if (!b) return;
    setName(b.name);
    setAmount(Number(b.amount_ron));
    setCurrency(b.currency as Currency);
    setSelectedDays(b.selected_days ?? []);
    setCategoryIds(b.category_ids ?? []);
    setSubcategoryIds(b.subcategory_ids ?? []);
  }, [editing.data]);

  // Subcategorii grupate pe categoria părinte, etichetă "Parent › Sub"
  const subcategoryOptions = useMemo(() => {
    const catName = new Map((cats.data ?? []).map((c) => [c.id, c.name]));
    return (subs.data ?? [])
      .map((s) => ({
        value: s.id,
        label: `${catName.get(s.parent_category_id) ?? '?'} › ${s.name}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ro'));
  }, [cats.data, subs.data]);

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
        category_ids: categoryIds,
        subcategory_ids: subcategoryIds,
      });
      navigate('/budgets');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la salvare');
    }
  }

  function handleDelete() {
    if (!params.id) return;
    confirmDelete({
      message: 'Sigur vrei să ștergi acest buget?',
      onConfirm: async () => {
        try {
          await del.mutateAsync(params.id!);
          navigate('/budgets');
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

        {/* Mutually exclusive scoping: a budget is scoped EITHER on whole categories
            OR on specific subcategories, never both. Picking a parent category already
            includes all its subcategories, so showing both would be confusing. */}
        {subcategoryIds.length === 0 && (
          <MultiSelect
            label="Categorii întregi (opțional)"
            description="Sumează TOT din categoria aleasă, inclusiv subcategoriile (ex: 'Vacanță' → toată categoria Vacanță)."
            placeholder="ex: Vacanță, Mâncare & Băuturi"
            data={(cats.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
            value={categoryIds}
            onChange={setCategoryIds}
            searchable
            clearable
          />
        )}

        {categoryIds.length === 0 && (
          <MultiSelect
            label="Subcategorii specifice (opțional)"
            description="Sumează DOAR subcategoriile alese (ex: 'În oraș' singur, fără Băcănie / Food Delivery / Băuturi)."
            placeholder="ex: Mâncare & Băuturi › În oraș"
            data={subcategoryOptions}
            value={subcategoryIds}
            onChange={setSubcategoryIds}
            searchable
            clearable
          />
        )}

        {categoryIds.length > 0 && (
          <Group gap="xs" mt={-8}>
            <Text size="xs" c="dimmed" flex={1}>
              ℹ Bugetul scopat pe categorii întregi. Pentru a alege subcategorii specifice, șterge categoriile.
            </Text>
            <Button
              variant="subtle"
              size="compact-xs"
              color="gray"
              onClick={() => setCategoryIds([])}
            >
              Șterge categoriile
            </Button>
          </Group>
        )}

        {subcategoryIds.length > 0 && (
          <Group gap="xs" mt={-8}>
            <Text size="xs" c="dimmed" flex={1}>
              ℹ Bugetul scopat pe subcategorii specifice. Pentru a alege categorii întregi, șterge subcategoriile.
            </Text>
            <Button
              variant="subtle"
              size="compact-xs"
              color="gray"
              onClick={() => setSubcategoryIds([])}
            >
              Șterge subcategoriile
            </Button>
          </Group>
        )}

        {categoryIds.length === 0 && subcategoryIds.length === 0 && (
          <Text size="xs" c="dimmed" mt={-8}>
            ⚠ Fără categorii sau subcategorii alese, bugetul sumează tot ce cheltui în perioada respectivă.
          </Text>
        )}

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
