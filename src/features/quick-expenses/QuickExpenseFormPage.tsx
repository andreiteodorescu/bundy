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
import { useTranslation } from 'react-i18next';
import { CURRENCIES, type Currency } from '@/lib/money';
import { confirmDelete } from '@/lib/confirm';
import { diacriticsFilter } from '@/lib/text';
import { useCategories, useSubcategories } from '@/features/categories/api';
import { useCompanyCardEnabled } from '@/features/settings/api';
import { categoryDisplayName, subcategoryDisplayName } from '@/i18n/displayName';
import {
  useDeleteQuickExpense,
  useQuickExpense,
  useUpsertQuickExpense,
} from './api';

export function QuickExpenseFormPage() {
  const { t } = useTranslation();
  const companyCardEnabled = useCompanyCardEnabled();
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
    const tpl = editing.data;
    if (!tpl) return;
    setName(tpl.name);
    setAmount(Number(tpl.amount));
    setCurrency(tpl.currency);
    setCategoryId(tpl.category_id);
    setSubcategoryId(tpl.subcategory_id);
    setActive(tpl.active);
    setCompanyCard(tpl.tags?.includes('company-card') ?? false);
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
    if (currency !== 'RON') {
      return setError(t('templates.quick.errorOnlyRon'));
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
        tags: companyCardEnabled
          ? companyCard
            ? ['company-card']
            : []
          : editing.data?.tags ?? [],
      });
      navigate('/quick-expenses');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('templates.errorSave'));
    }
  }

  function handleDelete() {
    if (!params.id) return;
    confirmDelete({
      message: t('templates.quick.deleteConfirmMessage'),
      onConfirm: async () => {
        try {
          await del.mutateAsync(params.id!);
          navigate('/quick-expenses');
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
            onClick={() => navigate('/quick-expenses')}
          >
            {t('templates.back')}
          </Button>
        </Group>

        <Title order={2}>{isNew ? t('templates.quick.newFormTitle') : name}</Title>

        <TextInput
          label={t('subscriptions.form.name')}
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder={t('templates.quick.namePlaceholder')}
        />

        <Group gap="sm" wrap="nowrap" align="end">
          <NumberInput
            label={t('templates.quick.unitPriceLabel')}
            required
            flex={1}
            value={amount}
            onChange={(v) => setAmount(typeof v === 'number' ? v : v === '' ? '' : Number(v))}
            min={0}
            decimalScale={2}
            inputMode="decimal"
            description={t('templates.quick.unitPriceHint')}
          />
          <Select
            label={t('subscriptions.form.currency')}
            data={CURRENCIES.map((c) => ({ value: c, label: c }))}
            value={currency}
            onChange={(v) => setCurrency((v as Currency) ?? 'RON')}
            allowDeselect={false}
            w={92}
          />
        </Group>

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

        <Switch
          label={t('templates.switchActive')}
          description={t('templates.switchActiveHintQuick')}
          checked={active}
          onChange={(e) => setActive(e.currentTarget.checked)}
        />

        {companyCardEnabled && (
          <Switch
            label={t('templates.switchCompany')}
            description={t('templates.switchCompanyHint')}
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
              {t('subscriptions.form.delete')}
            </Button>
          </>
        )}
      </Stack>
    </Container>
  );
}
