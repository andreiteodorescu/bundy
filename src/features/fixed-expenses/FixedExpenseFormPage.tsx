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
import { useTranslation } from 'react-i18next';
import { CURRENCIES, type Currency } from '@/lib/money';
import { getFxRate } from '@/lib/fx';
import { confirmDelete } from '@/lib/confirm';
import { diacriticsFilter } from '@/lib/text';
import { useCategories, useSubcategories } from '@/features/categories/api';
import { useCompanyCardEnabled, useDefaultCurrency } from '@/features/settings/api';
import { useTodayDisplayRate } from '@/lib/displayCurrency';
import { categoryDisplayName, subcategoryDisplayName } from '@/i18n/displayName';
import {
  useDeleteFixedExpense,
  useFixedExpense,
  useUpsertFixedExpense,
} from './api';

export function FixedExpenseFormPage() {
  const { t } = useTranslation();
  const companyCardEnabled = useCompanyCardEnabled();
  const params = useParams();
  const isNew = !params.id;
  const navigate = useNavigate();
  const editing = useFixedExpense(params.id);
  const cats = useCategories();
  const subs = useSubcategories();
  const upsert = useUpsertFixedExpense();
  const del = useDeleteFixedExpense();

  const defaultCurrency = useDefaultCurrency();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [currencyTouched, setCurrencyTouched] = useState(false);

  useEffect(() => {
    if (currencyTouched) return;
    if (params.id) return;
    setCurrency(defaultCurrency);
  }, [defaultCurrency, params.id, currencyTouched]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [companyCard, setCompanyCard] = useState(false);
  const [companyCardTouched, setCompanyCardTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const todayDisplay = useTodayDisplayRate();
  const amountDisplayPreview =
    amountRonPreview !== null ? todayDisplay.convertFromRon(amountRonPreview) : null;

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

  const workBusinessCategoryId = (cats.data ?? []).find((c) => c.slug === 'work-business')?.id ?? null;
  useEffect(() => {
    if (!companyCardEnabled) return;
    if (companyCardTouched) return;
    if (categoryId && categoryId === workBusinessCategoryId) setCompanyCard(true);
  }, [categoryId, workBusinessCategoryId, companyCardTouched, companyCardEnabled]);

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
    if (!name.trim()) return setError(t('templates.errorNameRequired'));
    if (typeof amount !== 'number' || amount <= 0) return setError(t('templates.errorAmountInvalid'));
    if (!categoryId) return setError(t('templates.errorCategoryRequired'));
    try {
      await upsert.mutateAsync({
        id: params.id,
        name: name.trim(),
        amount,
        currency,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        tags: companyCardEnabled
          ? companyCard
            ? ['company-card']
            : []
          : editing.data?.tags ?? [],
      });
      navigate(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('templates.errorSave'));
    }
  }

  function handleDelete() {
    if (!params.id) return;
    confirmDelete({
      message: t('templates.fixed.deleteConfirmMessage'),
      onConfirm: async () => {
        try {
          await del.mutateAsync(params.id!);
          navigate(-1);
        } catch (err) {
          setError(err instanceof Error ? err.message : t('templates.errorDelete'));
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
            {t('templates.back')}
          </Button>
        </Group>

        <Title order={2}>{isNew ? t('templates.fixed.newFormTitle') : name}</Title>

        <TextInput
          label={t('subscriptions.form.name')}
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder={t('templates.fixed.namePlaceholder')}
        />

        <Group gap="sm" wrap="nowrap" align="end">
          <NumberInput
            label={t('subscriptions.form.amount')}
            required
            flex={1}
            value={amount}
            onChange={(v) => setAmount(typeof v === 'number' ? v : v === '' ? '' : Number(v))}
            min={0}
            decimalScale={2}
            inputMode="decimal"
          />
          <Select
            label={t('subscriptions.form.currency')}
            data={CURRENCIES.map((c) => ({ value: c, label: c }))}
            value={currency}
            onChange={(v) => {
              setCurrencyTouched(true);
              setCurrency((v as Currency) ?? 'RON');
            }}
            allowDeselect={false}
            w={92}
          />
        </Group>

        {currency !== todayDisplay.displayCurrency && (
          <Text size="xs" c="dimmed" mt={-8}>
            {fxRate.isLoading
              ? t('templates.fxLoading')
              : amountDisplayPreview !== null
                ? t('templates.fxPreviewToday', { amount: todayDisplay.formatInDisplay(amountDisplayPreview) })
                : fxRate.isError
                  ? t('templates.fxUnavailable')
                  : t('templates.fxEnterAmount')}
          </Text>
        )}

        <Select
          label={t('subscriptions.form.category')}
          required
          searchable
          filter={diacriticsFilter}
          data={(cats.data ?? []).map((c) => ({ value: c.id, label: categoryDisplayName(c, t) }))}
          value={categoryId}
          onChange={(v) => {
            setCategoryId(v);
            setSubcategoryId(null);
          }}
        />

        {childSubs.length > 0 && (
          <Select
            label={t('templates.subcategoryOptional')}
            data={[
              { value: '', label: t('templates.noSubcategory') },
              ...childSubs.map((s) => ({ value: s.id, label: subcategoryDisplayName(s, t) })),
            ]}
            value={subcategoryId ?? ''}
            onChange={(v) => setSubcategoryId(v && v !== '' ? v : null)}
          />
        )}

        {companyCardEnabled && (
          <Switch
            label={t('templates.switchCompany')}
            description={t('templates.switchCompanyHintShort')}
            checked={companyCard}
            onChange={(e) => {
              setCompanyCard(e.currentTarget.checked);
              setCompanyCardTouched(true);
            }}
          />
        )}

        {error && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {error}
          </Alert>
        )}

        <Button onClick={handleSave} loading={upsert.isPending} size="md">
          {isNew ? t('subscriptions.form.create') : t('subscriptions.form.submit')}
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
              {t('templates.fixed.deleteButton')}
            </Button>
          </>
        )}
      </Stack>
    </Container>
  );
}
