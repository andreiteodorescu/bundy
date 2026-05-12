import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Box,
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
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { IconAlertCircle, IconArrowLeft, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { CURRENCIES, type Currency } from '@/lib/money';
import { getFxRate } from '@/lib/fx';
import { confirmDelete } from '@/lib/confirm';
import { ymd } from '@/lib/dates';
import { diacriticsFilter } from '@/lib/text';
import { useCategories, useSubcategories } from '@/features/categories/api';
import { useCompanyCardEnabled, useDefaultCurrency } from '@/features/settings/api';
import { useTodayDisplayRate } from '@/lib/displayCurrency';
import { categoryDisplayName, subcategoryDisplayName } from '@/i18n/displayName';
import { ROMANIAN_BANKS } from '@/data/banks';
import { useDeleteLoan, useLoan, useUpsertLoan } from './api';

export function LoanFormPage() {
  const { t } = useTranslation();
  const companyCardEnabled = useCompanyCardEnabled();
  const params = useParams();
  const isNew = !params.id;
  const navigate = useNavigate();
  const editing = useLoan(params.id);
  const cats = useCategories();
  const subs = useSubcategories();
  const upsert = useUpsertLoan();
  const del = useDeleteLoan();

  const defaultCurrency = useDefaultCurrency();
  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [totalAmount, setTotalAmount] = useState<number | ''>('');
  const [monthlyPayment, setMonthlyPayment] = useState<number | ''>('');
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [currencyTouched, setCurrencyTouched] = useState(false);

  useEffect(() => {
    if (currencyTouched) return;
    if (params.id) return;
    setCurrency(defaultCurrency);
  }, [defaultCurrency, params.id, currencyTouched]);
  const [chargeDay, setChargeDay] = useState<number | ''>(15);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [interestRate, setInterestRate] = useState<number | ''>('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [companyCard, setCompanyCard] = useState(false);
  const [companyCardTouched, setCompanyCardTouched] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const todayIso = dayjs().format('YYYY-MM-DD');
  const fxRate = useQuery({
    queryKey: ['fx', todayIso, currency],
    queryFn: () => getFxRate(todayIso, currency),
    enabled: currency !== 'RON',
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  });
  const monthlyRonPreview =
    currency !== 'RON' && fxRate.data && typeof monthlyPayment === 'number' && monthlyPayment > 0
      ? monthlyPayment * fxRate.data.rate_to_ron
      : null;
  const todayDisplay = useTodayDisplayRate();
  const monthlyDisplayPreview =
    monthlyRonPreview !== null ? todayDisplay.convertFromRon(monthlyRonPreview) : null;

  useEffect(() => {
    if (!isNew) return;
    if (categoryId) return;
    const finance = (cats.data ?? []).find((c) => c.slug === 'finance');
    if (finance) {
      setCategoryId(finance.id);
      const loansSub = (subs.data ?? []).find(
        (s) => s.slug === 'loans' && s.parent_category_id === finance.id,
      );
      if (loansSub) setSubcategoryId(loansSub.id);
    }
  }, [isNew, categoryId, cats.data, subs.data]);

  useEffect(() => {
    const l = editing.data;
    if (!l) return;
    setName(l.name);
    setBank(l.bank ?? '');
    setTotalAmount(l.total_amount === null ? '' : Number(l.total_amount));
    setMonthlyPayment(Number(l.monthly_payment));
    setCurrency(l.currency);
    setChargeDay(l.charge_day);
    setStartDate(new Date(l.start_date));
    setEndDate(l.end_date ? new Date(l.end_date) : null);
    setInterestRate(l.interest_rate === null ? '' : Number(l.interest_rate));
    setCategoryId(l.category_id);
    setSubcategoryId(l.subcategory_id);
    setActive(l.active);
    setNote(l.note ?? '');
    setCompanyCard(l.tags?.includes('company-card') ?? false);
    setCompanyCardTouched(true);
  }, [editing.data]);

  const workBusinessCategoryId = (cats.data ?? []).find((c) => c.slug === 'work-business')?.id ?? null;
  useEffect(() => {
    if (!companyCardEnabled) return;
    if (companyCardTouched) return;
    if (categoryId && categoryId === workBusinessCategoryId) setCompanyCard(true);
  }, [categoryId, workBusinessCategoryId, companyCardTouched, companyCardEnabled]);

  const childSubs = useMemo(
    () => (subs.data ?? []).filter((s) => s.parent_category_id === categoryId),
    [subs.data, categoryId],
  );

  if (!isNew && editing.isLoading) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) return setError(t('loans.form.errorNameRequired'));
    if (typeof monthlyPayment !== 'number' || monthlyPayment <= 0)
      return setError(t('loans.form.errorMonthlyPositive'));
    if (typeof chargeDay !== 'number' || chargeDay < 1 || chargeDay > 31)
      return setError(t('loans.form.errorChargeDayRange'));
    if (!categoryId) return setError(t('loans.form.errorCategoryRequired'));
    if (endDate && dayjs(endDate).isBefore(dayjs(startDate)))
      return setError(t('loans.form.errorEndBeforeStart'));

    try {
      await upsert.mutateAsync({
        id: params.id,
        name: name.trim(),
        bank: bank.trim() || null,
        total_amount: typeof totalAmount === 'number' ? totalAmount : null,
        monthly_payment: monthlyPayment,
        currency,
        charge_day: chargeDay,
        start_date: ymd(startDate),
        end_date: endDate ? ymd(endDate) : null,
        interest_rate: typeof interestRate === 'number' ? interestRate : null,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        active,
        tags: companyCardEnabled
          ? companyCard
            ? ['company-card']
            : []
          : editing.data?.tags ?? [],
        note: note.trim() || null,
      });
      navigate('/loans');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loans.form.errorSave'));
    }
  }

  function handleDelete() {
    if (!params.id) return;
    confirmDelete({
      message: t('loans.form.deleteConfirmMessage'),
      onConfirm: async () => {
        try {
          await del.mutateAsync(params.id!);
          navigate('/loans');
        } catch (err) {
          setError(err instanceof Error ? err.message : t('loans.form.errorDelete'));
        }
      },
    });
  }

  const remainingMonths = endDate ? Math.max(0, dayjs(endDate).diff(dayjs(startDate), 'month')) : null;

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Group gap="xs">
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/loans')}
          >
            {t('loans.back')}
          </Button>
        </Group>

        <Title order={2}>{isNew ? t('loans.form.newTitle') : name}</Title>

        <TextInput
          label={t('loans.form.name')}
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder={t('loans.form.namePlaceholder')}
        />

        <Autocomplete
          label={t('loans.form.bank')}
          data={ROMANIAN_BANKS}
          value={bank}
          onChange={setBank}
          placeholder={t('loans.form.bankPlaceholder')}
          limit={10}
          filter={diacriticsFilter}
        />

        <Group gap="sm" wrap="nowrap" align="end">
          <NumberInput
            label={t('loans.form.monthlyPayment')}
            required
            flex={1}
            value={monthlyPayment}
            onChange={(v) =>
              setMonthlyPayment(typeof v === 'number' ? v : v === '' ? '' : Number(v))
            }
            min={0}
            decimalScale={2}
            inputMode="decimal"
          />
          <Select
            label={t('loans.form.currency')}
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
              ? t('loans.form.fxLoading')
              : monthlyDisplayPreview !== null
                ? t('loans.form.fxPreviewToday', { amount: todayDisplay.formatInDisplay(monthlyDisplayPreview) })
                : fxRate.isError
                  ? t('loans.form.fxUnavailable')
                  : t('loans.form.fxEnterAmount')}
          </Text>
        )}

        <NumberInput
          label={t('loans.form.chargeDay')}
          required
          value={chargeDay}
          onChange={(v) => setChargeDay(typeof v === 'number' ? v : v === '' ? '' : Number(v))}
          min={1}
          max={31}
          inputMode="numeric"
        />

        <Group gap="sm" wrap="nowrap">
          <DatePickerInput
            label={t('loans.form.startDate')}
            flex={1}
            value={startDate}
            onChange={(d) => d && setStartDate(dayjs(d as unknown as Date).toDate())}
            valueFormat="D MMM YYYY"
            required
          />
          <DatePickerInput
            label={t('loans.form.endDate')}
            flex={1}
            value={endDate}
            onChange={(d) => setEndDate(d ? dayjs(d as unknown as Date).toDate() : null)}
            valueFormat="D MMM YYYY"
            clearable
            description={remainingMonths !== null ? t('loans.form.endDateMonths', { count: remainingMonths }) : undefined}
          />
        </Group>

        <Group gap="sm" wrap="nowrap">
          <NumberInput
            label={t('loans.form.totalAmount')}
            flex={1}
            value={totalAmount}
            onChange={(v) => setTotalAmount(typeof v === 'number' ? v : v === '' ? '' : Number(v))}
            min={0}
            decimalScale={2}
            inputMode="decimal"
            description={t('loans.form.totalAmountHint')}
          />
          <NumberInput
            label={t('loans.form.interestRate')}
            flex={1}
            value={interestRate}
            onChange={(v) => setInterestRate(typeof v === 'number' ? v : v === '' ? '' : Number(v))}
            min={0}
            max={100}
            decimalScale={2}
            inputMode="decimal"
          />
        </Group>

        <Select
          label={t('loans.form.category')}
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
            label={t('loans.form.subcategoryOptional')}
            data={[
              { value: '', label: t('loans.form.noSubcategory') },
              ...childSubs.map((s) => ({ value: s.id, label: subcategoryDisplayName(s, t) })),
            ]}
            value={subcategoryId ?? ''}
            onChange={(v) => setSubcategoryId(v && v !== '' ? v : null)}
          />
        )}

        <Group wrap="nowrap" align="flex-start" gap="sm">
          <Switch
            checked={active}
            onChange={(e) => setActive(e.currentTarget.checked)}
            aria-label={t('loans.form.active')}
            mt={2}
          />
          <Box flex={1} miw={0}>
            <Text size="sm" fw={500}>
              {t('loans.form.active')}
            </Text>
            <Text size="xs" c="dimmed">
              {t('loans.form.activeHint')}
            </Text>
          </Box>
        </Group>

        {companyCardEnabled && (
          <Group wrap="nowrap" align="flex-start" gap="sm">
            <Switch
              checked={companyCard}
              onChange={(e) => {
                setCompanyCard(e.currentTarget.checked);
                setCompanyCardTouched(true);
              }}
              aria-label={t('loans.form.company')}
              mt={2}
            />
            <Box flex={1} miw={0}>
              <Text size="sm" fw={500}>
                {t('loans.form.company')}
              </Text>
              <Text size="xs" c="dimmed">
                {t('loans.form.companyHint')}
              </Text>
            </Box>
          </Group>
        )}

        <Textarea
          label={t('loans.form.noteOptional')}
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
          autosize
          minRows={2}
          maxRows={4}
        />

        {error && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {error}
          </Alert>
        )}

        <Button onClick={handleSave} loading={upsert.isPending} size="md">
          {isNew ? t('loans.form.create') : t('loans.form.submit')}
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
              {t('loans.form.delete')}
            </Button>
          </>
        )}
      </Stack>
    </Container>
  );
}
