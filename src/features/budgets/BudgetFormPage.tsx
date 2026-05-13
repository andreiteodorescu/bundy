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
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { IconAlertCircle, IconArrowLeft, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { CURRENCIES, formatRon, type Currency } from '@/lib/money';
import { confirmDelete } from '@/lib/confirm';
import { diacriticsFilter } from '@/lib/text';
import { BudgetCalendar } from './BudgetCalendar';
import { useBudget, useDeleteBudget, useUpsertBudget } from './api';
import { getFxRate } from '@/lib/fx';
import { useCategories, useSubcategories } from '@/features/categories/api';
import { categoryDisplayName, subcategoryDisplayName } from '@/i18n/displayName';

export function BudgetFormPage() {
  const { t } = useTranslation();
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

  const subcategoryOptions = useMemo(() => {
    const catNameById = new Map((cats.data ?? []).map((c) => [c.id, categoryDisplayName(c, t)]));
    return (subs.data ?? [])
      .map((s) => ({
        value: s.id,
        label: `${catNameById.get(s.parent_category_id) ?? '?'} › ${subcategoryDisplayName(s, t)}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [cats.data, subs.data, t]);

  const periodInfo = useMemo(() => {
    if (selectedDays.length === 0) return null;
    const sorted = [...selectedDays].sort();
    return { start: sorted[0], end: sorted[sorted.length - 1], count: sorted.length };
  }, [selectedDays]);

  const fxDate = periodInfo?.start ?? dayjs().format('YYYY-MM-DD');
  const fxRate = useQuery({
    queryKey: ['fx', fxDate, currency],
    queryFn: () => getFxRate(fxDate, currency),
    enabled: currency !== 'RON',
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  });
  const amountRonPreview =
    currency !== 'RON' && fxRate.data && typeof amount === 'number' && amount > 0
      ? amount * fxRate.data.rate_to_ron
      : null;

  if (!isNew && editing.isLoading) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) return setError(t('budgets.form.errorNameRequired'));
    if (typeof amount !== 'number' || amount <= 0) return setError(t('budgets.form.errorAmountInvalid'));
    if (selectedDays.length === 0) return setError(t('budgets.form.errorDaysRequired'));

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
      navigate(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('budgets.form.errorSave'));
    }
  }

  function handleDelete() {
    if (!params.id) return;
    confirmDelete({
      message: t('budgets.form.deleteConfirmMessage'),
      onConfirm: async () => {
        try {
          await del.mutateAsync(params.id!);
          navigate(-1);
        } catch (err) {
          setError(err instanceof Error ? err.message : t('budgets.form.errorDelete'));
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
            onClick={() => navigate(-1)}
          >
            {t('budgets.back')}
          </Button>
        </Group>

        <Title order={2}>{isNew ? t('budgets.form.newTitle') : name}</Title>

        <TextInput
          label={t('budgets.form.name')}
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder={t('budgets.form.namePlaceholder')}
        />

        <Group gap="sm" wrap="nowrap" align="end">
          <NumberInput
            label={t('budgets.form.amount')}
            required
            flex={1}
            value={amount}
            onChange={(v) => setAmount(typeof v === 'number' ? v : v === '' ? '' : Number(v))}
            min={0}
            decimalScale={2}
            inputMode="decimal"
          />
          <Select
            label={t('budgets.form.currency')}
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
              ? t('budgets.form.fxLoading')
              : amountRonPreview !== null
                ? t('budgets.form.fxPreview', {
                    amount: formatRon(amountRonPreview),
                    date: dayjs(fxRate.data?.date ?? fxDate).format('D MMM YYYY'),
                  })
                : fxRate.isError
                  ? t('budgets.form.fxUnavailable')
                  : periodInfo === null
                    ? t('budgets.form.fxNoPeriod')
                    : t('budgets.form.fxEnterAmount')}
          </Text>
        )}

        <BudgetCalendar value={selectedDays} onChange={setSelectedDays} />

        {subcategoryIds.length === 0 && (
          <MultiSelect
            label={t('budgets.form.scopeCategoriesLabel')}
            description={t('budgets.form.scopeCategoriesDescription')}
            placeholder={t('budgets.form.scopeCategoriesPlaceholder')}
            data={(cats.data ?? []).map((c) => ({ value: c.id, label: categoryDisplayName(c, t) }))}
            value={categoryIds}
            onChange={setCategoryIds}
            searchable
            clearable
            filter={diacriticsFilter}
          />
        )}

        {categoryIds.length === 0 && (
          <MultiSelect
            label={t('budgets.form.scopeSubcategoriesLabel')}
            description={t('budgets.form.scopeSubcategoriesDescription')}
            placeholder={t('budgets.form.scopeSubcategoriesPlaceholder')}
            data={subcategoryOptions}
            value={subcategoryIds}
            onChange={setSubcategoryIds}
            searchable
            clearable
            filter={diacriticsFilter}
          />
        )}

        {categoryIds.length > 0 && (
          <Group gap="xs" mt={-8}>
            <Text size="xs" c="dimmed" flex={1}>
              {t('budgets.form.scopedCategoriesInfo')}
            </Text>
            <Button
              variant="subtle"
              size="compact-xs"
              color="gray"
              onClick={() => setCategoryIds([])}
            >
              {t('budgets.form.clearCategories')}
            </Button>
          </Group>
        )}

        {subcategoryIds.length > 0 && (
          <Group gap="xs" mt={-8}>
            <Text size="xs" c="dimmed" flex={1}>
              {t('budgets.form.scopedSubcategoriesInfo')}
            </Text>
            <Button
              variant="subtle"
              size="compact-xs"
              color="gray"
              onClick={() => setSubcategoryIds([])}
            >
              {t('budgets.form.clearSubcategories')}
            </Button>
          </Group>
        )}

        {categoryIds.length === 0 && subcategoryIds.length === 0 && (
          <Text size="xs" c="dimmed" mt={-8}>
            {t('budgets.form.scopedAllInfo')}
          </Text>
        )}

        {error && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {error}
          </Alert>
        )}

        <Button onClick={handleSave} loading={upsert.isPending} size="md">
          {isNew ? t('budgets.form.create') : t('budgets.form.submit')}
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
              {t('budgets.form.delete')}
            </Button>
          </>
        )}
      </Stack>
    </Container>
  );
}
