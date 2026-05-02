import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Anchor,
  Autocomplete,
  Box,
  Button,
  Container,
  Group,
  NumberInput,
  Pill,
  Popover,
  Select,
  Stack,
  Text,
  Textarea,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import {
  IconAlertCircle,
  IconArrowLeft,
  IconCalendar,
  IconSparkles,
} from '@tabler/icons-react';
import { CURRENCIES, type Currency } from '@/lib/money';
import { ymd } from '@/lib/dates';
import { useCategories, useSubcategories } from '@/features/categories/api';
import { useDeleteExpense, useExpense, useRecentExpenses, useUpsertExpense } from './api';
import { useAutoSuggest } from './useAutoSuggest';
import { getIcon } from '@/data/icons.registry';
import type { Suggestion } from '@/lib/autocomplete';

type RecurrenceKind = 'never' | 'daily' | 'weekly' | 'monthly' | 'yearly';

const recurrenceOptions: { value: RecurrenceKind; label: string }[] = [
  { value: 'never', label: 'Niciodată' },
  { value: 'daily', label: 'Zilnic' },
  { value: 'weekly', label: 'Săptămânal' },
  { value: 'monthly', label: 'Lunar' },
  { value: 'yearly', label: 'Anual' },
];

export function AddExpensePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = useParams();
  const editingId = params.id;
  const editing = useExpense(editingId);
  const cats = useCategories();
  const subs = useSubcategories();
  const history = useRecentExpenses(300);
  const auto = useAutoSuggest();
  const upsert = useUpsertExpense();
  const del = useDeleteExpense();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [currency, setCurrency] = useState<Currency>('RON');
  const [date, setDate] = useState<Date>(() => {
    const d = searchParams.get('date');
    return d ? new Date(d) : new Date();
  });
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [autoSuggestion, setAutoSuggestion] = useState<Suggestion | null>(null);
  const [overrideCategory, setOverrideCategory] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceKind>('never');
  const [error, setError] = useState<string | null>(null);
  const [datePickerOpen, datePickerCtl] = useDisclosure(false);
  const [didLoadEditing, setDidLoadEditing] = useState(false);

  // Hydrate form when editing an existing expense
  useEffect(() => {
    if (!editingId || didLoadEditing) return;
    const exp = editing.data;
    if (!exp) return;
    setName(exp.name);
    setAmount(Number(exp.amount_original));
    setCurrency(exp.currency_original);
    setDate(new Date(exp.occurred_on));
    setNote(exp.note ?? '');
    setCategoryId(exp.category_id);
    setSubcategoryId(exp.subcategory_id);
    setOverrideCategory(true);
    if (exp.recurrence && typeof exp.recurrence === 'object' && 'kind' in exp.recurrence) {
      setRecurrence((exp.recurrence as { kind: RecurrenceKind }).kind);
    }
    setDidLoadEditing(true);
  }, [editing.data, editingId, didLoadEditing]);

  // Auto-suggest reacts to name input (debounced via React render coalescing)
  useEffect(() => {
    if (editingId) return; // never auto-suggest in edit mode
    if (overrideCategory) return;
    if (!auto.ready) return;
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setAutoSuggestion(null);
      setCategoryId((c) => (c === null ? c : null));
      setSubcategoryId(null);
      return;
    }
    const sug = auto.suggest(trimmed);
    setAutoSuggestion(sug);
    if (sug) {
      setCategoryId(sug.category_id);
      setSubcategoryId(sug.subcategory_id);
    }
  }, [name, auto, overrideCategory]);

  const category = useMemo(
    () => (cats.data ?? []).find((c) => c.id === categoryId) ?? null,
    [cats.data, categoryId],
  );
  const childSubs = useMemo(
    () => (subs.data ?? []).filter((s) => s.parent_category_id === categoryId),
    [subs.data, categoryId],
  );

  const accentColor = category?.color ?? 'var(--mantine-color-accent-5)';

  // History combobox: dedup by name (case-insensitive), keep most recent occurrence for category hint
  const historyOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const exp of history.data ?? []) {
      const key = exp.name.trim().toLowerCase();
      if (!seen.has(key)) seen.set(key, exp.name.trim());
    }
    return Array.from(seen.values());
  }, [history.data]);

  function handleCategoryChange(id: string | null) {
    setCategoryId(id);
    setSubcategoryId(null);
    setOverrideCategory(true);
    setAutoSuggestion(null);
  }

  function handleSubcategoryChange(id: string | null) {
    setSubcategoryId(id);
    setOverrideCategory(true);
  }

  function clearAutoSuggestion() {
    setAutoSuggestion(null);
    setCategoryId(null);
    setSubcategoryId(null);
    setOverrideCategory(true);
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError('Nume e obligatoriu');
      return;
    }
    if (typeof amount !== 'number' || amount <= 0) {
      setError('Suma trebuie să fie pozitivă');
      return;
    }
    if (!categoryId) {
      setError('Alege o categorie');
      return;
    }
    try {
      await upsert.mutateAsync({
        id: editingId,
        name: name.trim(),
        amount_original: amount,
        currency_original: currency,
        occurred_on: ymd(date),
        category_id: categoryId,
        subcategory_id: subcategoryId,
        note: note.trim() || null,
        recurrence: recurrence === 'never' ? null : { kind: recurrence },
      });
      notifications.show({
        message: editingId ? `${name.trim()} actualizat` : `${name.trim()} salvat`,
        color: 'green',
        autoClose: 1800,
      });
      navigate('/expenses');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la salvare');
    }
  }

  async function handleDelete() {
    if (!editingId) return;
    if (!window.confirm('Sigur vrei să ștergi această cheltuială?')) return;
    try {
      await del.mutateAsync(editingId);
      notifications.show({ message: 'Cheltuială ștearsă', color: 'gray' });
      navigate('/expenses');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la ștergere');
    }
  }

  const isToday = dayjs(date).isSame(dayjs(), 'day');

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
            Înapoi
          </Button>
        </Group>

        <Title order={2}>{editingId ? 'Editează cheltuiala' : 'Adaugă cheltuială'}</Title>

        <Autocomplete
          label="Nume cheltuială"
          required
          autoFocus
          data={historyOptions}
          value={name}
          onChange={setName}
          placeholder="ex: Comanda Freshful"
          maxDropdownHeight={240}
          limit={20}
        />

        {autoSuggestion && category && !overrideCategory && (
          <Pill
            withRemoveButton
            onRemove={clearAutoSuggestion}
            styles={{
              root: { background: `${category.color}22`, color: category.color, alignSelf: 'flex-start' },
            }}
          >
            <Group gap={6} wrap="nowrap">
              <IconSparkles size={12} />
              <Text size="xs" component="span">
                Auto: {category.name}
                {autoSuggestion.matched && ` · "${autoSuggestion.matched}"`}
              </Text>
            </Group>
          </Pill>
        )}

        <Group gap="sm" wrap="nowrap" align="end">
          <NumberInput
            label="Sumă"
            required
            value={amount}
            onChange={(v) => setAmount(typeof v === 'number' ? v : v === '' ? '' : Number(v))}
            min={0}
            decimalScale={2}
            thousandSeparator=" "
            decimalSeparator=","
            placeholder="0,00"
            flex={1}
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

        <Box>
          <Text size="sm" fw={500} mb={4}>
            Data
          </Text>
          <Popover
            opened={datePickerOpen}
            onChange={datePickerCtl.toggle}
            position="bottom-start"
            shadow="md"
          >
            <Popover.Target>
              <UnstyledButton
                onClick={datePickerCtl.toggle}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 16,
                  fontWeight: 600,
                  color: accentColor,
                  textDecoration: 'underline',
                  textUnderlineOffset: 4,
                }}
              >
                <IconCalendar size={16} />
                {isToday ? 'Today' : dayjs(date).format('D MMM YYYY')}
              </UnstyledButton>
            </Popover.Target>
            <Popover.Dropdown>
              <DatePicker
                value={date}
                onChange={(d) => {
                  if (d) {
                    setDate(d as unknown as Date);
                    datePickerCtl.close();
                  }
                }}
              />
            </Popover.Dropdown>
          </Popover>
        </Box>

        <Select
          label="Categorie"
          required
          searchable
          data={(cats.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
          value={categoryId}
          onChange={handleCategoryChange}
          renderOption={({ option }) => {
            const cat = (cats.data ?? []).find((c) => c.id === option.value);
            const Icon = getIcon(cat?.icon);
            return (
              <Group gap="xs">
                <Box
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: `${cat?.color}33`,
                    color: cat?.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={14} stroke={2} />
                </Box>
                <Text size="sm">{option.label}</Text>
              </Group>
            );
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
            onChange={(v) => handleSubcategoryChange(v && v !== '' ? v : null)}
            clearable={false}
          />
        )}

        <Textarea
          label="Notă (opțional)"
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
          autosize
          minRows={2}
          maxRows={5}
          placeholder="ex: petrecere onomastică"
        />

        <Select
          label="Recurență"
          data={recurrenceOptions}
          value={recurrence}
          onChange={(v) => setRecurrence((v as RecurrenceKind) ?? 'never')}
          allowDeselect={false}
        />

        {error && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {error}
          </Alert>
        )}

        <Button
          size="lg"
          loading={upsert.isPending}
          onClick={handleSave}
          styles={category ? { root: { background: category.color } } : undefined}
        >
          {editingId ? 'Salvează modificările' : 'Salvează'}
        </Button>
        {editingId && (
          <Button variant="subtle" color="red" onClick={handleDelete} loading={del.isPending}>
            Șterge cheltuiala
          </Button>
        )}
        <Anchor component="button" type="button" onClick={() => navigate('/expenses')} ta="center">
          Anulează
        </Anchor>
      </Stack>
    </Container>
  );
}
