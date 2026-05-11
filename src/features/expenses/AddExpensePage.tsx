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
  Switch,
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
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CURRENCIES, formatRon, type Currency } from '@/lib/money';
import { getFxRate } from '@/lib/fx';
import { confirmDelete } from '@/lib/confirm';
import { ymd } from '@/lib/dates';
import { cleanExpenseName, diacriticsFilter, normalize } from '@/lib/text';
import { useCategories, useSubcategories } from '@/features/categories/api';
import { useCompanyCardEnabled } from '@/features/settings/api';
import { useDeleteExpense, useExpense, useRecentExpenses, useUpsertExpense } from './api';
import { useAutoSuggest } from './useAutoSuggest';
import { usePredefinedExpense } from '@/features/predefined-expenses/api';
import { getIcon } from '@/data/icons.registry';
import { categoryDisplayName, subcategoryDisplayName } from '@/i18n/displayName';
import type { Suggestion } from '@/lib/autocomplete';


export function AddExpensePage() {
  const { t } = useTranslation();
  const companyCardEnabled = useCompanyCardEnabled();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = useParams();
  const editingId = params.id;
  const editing = useExpense(editingId);
  const predefinedId = searchParams.get('predefined') ?? undefined;
  const predefined = usePredefinedExpense(predefinedId);
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
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datePickerOpen, datePickerCtl] = useDisclosure(false);
  const [didLoadEditing, setDidLoadEditing] = useState(false);
  const [didLoadPredefined, setDidLoadPredefined] = useState(false);
  const [companyCard, setCompanyCard] = useState(false);
  const [companyCardTouched, setCompanyCardTouched] = useState(false);

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

  useEffect(() => {
    if (editingId || didLoadPredefined) return;
    const tpl = predefined.data;
    if (!tpl) return;
    setName(tpl.name);
    setCurrency(tpl.default_currency);
    if (tpl.category_id) {
      setCategoryId(tpl.category_id);
      setSubcategoryId(tpl.subcategory_id);
      setOverrideCategory(true);
    }
    if (tpl.tags?.includes('company-card')) {
      setCompanyCard(true);
      setCompanyCardTouched(true);
    }
    setDidLoadPredefined(true);
  }, [editingId, didLoadPredefined, predefined.data]);

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
    setHidden(exp.hidden);
    setCompanyCard(exp.tags.includes('company-card'));
    setCompanyCardTouched(true);
    setDidLoadEditing(true);
  }, [editing.data, editingId, didLoadEditing]);

  const workBusinessCategoryId = useMemo(
    () => (cats.data ?? []).find((c) => c.slug === 'work-business')?.id ?? null,
    [cats.data],
  );
  useEffect(() => {
    if (!companyCardEnabled) return;
    if (companyCardTouched) return;
    setCompanyCard(categoryId !== null && categoryId === workBusinessCategoryId);
  }, [categoryId, workBusinessCategoryId, companyCardTouched, companyCardEnabled]);

  useEffect(() => {
    if (editingId) return;
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

  const historyOptions = useMemo(() => {
    const trimmed = name.trim();
    if (trimmed === '') return [];
    const seen = new Map<string, string>();
    const currentKey = normalize(trimmed);
    for (const exp of history.data ?? []) {
      const cleaned = cleanExpenseName(exp.name);
      if (!cleaned) continue;
      const key = normalize(cleaned);
      if (key === currentKey) continue;
      if (!seen.has(key)) seen.set(key, cleaned);
    }
    return Array.from(seen.values());
  }, [history.data, name]);

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
      setError(t('expenses.add.errorNameRequired'));
      return;
    }
    if (typeof amount !== 'number' || amount <= 0) {
      setError(t('expenses.add.errorAmountPositive'));
      return;
    }
    if (!categoryId) {
      setError(t('expenses.add.errorCategoryRequired'));
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
        recurrence: null,
        hidden,
        // Preserve existing 'company-card' tag when feature is OFF (don't strip
        // tags from records the user marked when the feature was on).
        tags: companyCardEnabled
          ? companyCard
            ? ['company-card']
            : []
          : editing.data?.tags ?? [],
      });
      notifications.show({
        message: editingId
          ? t('expenses.add.updatedToast', { name: name.trim() })
          : t('expenses.add.savedToast', { name: name.trim() }),
        color: 'green',
        autoClose: 1800,
      });
      if (editingId) {
        navigate(-1);
      } else {
        navigate(`/expenses?month=${ymd(date)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('expenses.add.errorSave'));
    }
  }

  function handleDelete() {
    if (!editingId) return;
    confirmDelete({
      message: t('expenses.add.deleteConfirm'),
      onConfirm: async () => {
        try {
          await del.mutateAsync(editingId);
          notifications.show({ message: t('expenses.add.deletedToast'), color: 'gray' });
          navigate(-1);
        } catch (err) {
          setError(err instanceof Error ? err.message : t('expenses.add.errorDelete'));
        }
      },
    });
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
            {t('expenses.add.back')}
          </Button>
        </Group>

        <Title order={2}>{editingId ? t('expenses.add.editTitle') : t('expenses.add.title')}</Title>

        <Autocomplete
          label={t('expenses.add.nameLabel')}
          required
          data={historyOptions}
          value={name}
          onChange={setName}
          placeholder={t('expenses.add.namePlaceholder')}
          maxDropdownHeight={240}
          limit={20}
          filter={diacriticsFilter}
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
                {t('expenses.add.autoBadge', { label: categoryDisplayName(category, t) })}
                {autoSuggestion.matched && ` · "${autoSuggestion.matched}"`}
              </Text>
            </Group>
          </Pill>
        )}

        <Group gap="sm" wrap="nowrap" align="end">
          <NumberInput
            label={t('expenses.add.amount')}
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
            label={t('expenses.add.currency')}
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
              ? t('expenses.add.fxLoading')
              : amountRonPreview !== null
                ? t('expenses.add.fxPreview', {
                    amount: formatRon(amountRonPreview),
                    date: dayjs(fxRate.data?.date ?? dateIso).format('D MMM YYYY'),
                  })
                : fxRate.isError
                  ? t('expenses.add.fxUnavailable')
                  : t('expenses.add.fxEnterAmount')}
          </Text>
        )}

        <Box>
          <Text size="sm" fw={500} mb={4}>
            {t('expenses.add.date')}
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
                {isToday ? t('expenses.add.today') : dayjs(date).format('D MMM YYYY')}
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
          label={t('expenses.add.category')}
          required
          searchable
          filter={diacriticsFilter}
          data={(cats.data ?? []).map((c) => ({ value: c.id, label: categoryDisplayName(c, t) }))}
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
            label={t('expenses.add.subcategoryOptional')}
            data={[
              { value: '', label: t('expenses.add.noSubcategory') },
              ...childSubs.map((s) => ({ value: s.id, label: subcategoryDisplayName(s, t) })),
            ]}
            value={subcategoryId ?? ''}
            onChange={(v) => handleSubcategoryChange(v && v !== '' ? v : null)}
            clearable={false}
          />
        )}

        <Textarea
          label={t('expenses.add.noteOptional')}
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
          autosize
          minRows={2}
          maxRows={5}
          placeholder={t('expenses.add.notePlaceholderEx')}
        />

        {companyCardEnabled && (
          <Group wrap="nowrap" align="flex-start" gap="sm">
            <Switch
              checked={companyCard}
              onChange={(e) => {
                setCompanyCard(e.currentTarget.checked);
                setCompanyCardTouched(true);
              }}
              aria-label={t('expenses.add.company')}
              mt={2}
            />
            <Box flex={1} miw={0}>
              <Text size="sm" fw={500}>
                {t('expenses.add.company')}
              </Text>
              <Text size="xs" c="dimmed">
                {t('expenses.add.companyHint')}
              </Text>
            </Box>
          </Group>
        )}

        <Group wrap="nowrap" align="flex-start" gap="sm">
          <Switch
            checked={hidden}
            onChange={(e) => setHidden(e.currentTarget.checked)}
            aria-label={t('expenses.add.hidden')}
            mt={2}
          />
          <Box flex={1} miw={0}>
            <Text size="sm" fw={500}>
              {t('expenses.add.hidden')}
            </Text>
            <Text size="xs" c="dimmed">
              {t('expenses.add.hiddenHint')}
            </Text>
          </Box>
        </Group>

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
          {editingId ? t('expenses.add.saveChanges') : t('expenses.add.submit')}
        </Button>
        {editingId && (
          <Button variant="subtle" color="red" onClick={handleDelete} loading={del.isPending}>
            {t('expenses.add.deleteExpense')}
          </Button>
        )}
        <Anchor component="button" type="button" onClick={() => navigate(-1)} ta="center">
          {t('expenses.add.cancel')}
        </Anchor>
      </Stack>
    </Container>
  );
}
