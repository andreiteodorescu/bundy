import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Center,
  Collapse,
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
  UnstyledButton,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { IconAlertCircle, IconArrowLeft, IconChevronDown, IconChevronUp, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { CURRENCIES, type Currency } from '@/lib/money';
import { getFxRate } from '@/lib/fx';
import { confirmDelete } from '@/lib/confirm';
import { ymd } from '@/lib/dates';
import { diacriticsFilter } from '@/lib/text';
import { BrandPicker } from '@/components/BrandPicker';
import { BrandTile } from '@/components/BrandTile';
import { useCategories, useSubcategories } from '@/features/categories/api';
import { useCompanyCardEnabled, useDefaultCurrency } from '@/features/settings/api';
import { useTodayDisplayRate } from '@/lib/displayCurrency';
import { categoryDisplayName, subcategoryDisplayName } from '@/i18n/displayName';
import {
  useDeleteSubscription,
  useSubscription,
  useUpsertSubscription,
} from './api';
import type { SubscriptionCadence } from '@/types';

export function SubscriptionFormPage() {
  const { t } = useTranslation();
  const companyCardEnabled = useCompanyCardEnabled();
  const params = useParams();
  const isNew = !params.id;
  const navigate = useNavigate();
  const editing = useSubscription(params.id);
  const cats = useCategories();
  const subs = useSubcategories();
  const upsert = useUpsertSubscription();
  const del = useDeleteSubscription();

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
  const [brandPickerOpen, setBrandPickerOpen] = useState(false);
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

  // Weekday picker uses dayjs locale to render localized day names. ISO ordering: 1=Mon..7=Sun.
  const weekdayOptions = [1, 2, 3, 4, 5, 6, 7].map((d) => {
    const label = dayjs().day(d % 7).format('dddd');
    return { value: String(d), label: label.charAt(0).toUpperCase() + label.slice(1) };
  });

  async function handleSave() {
    setError(null);
    if (!name.trim()) return setError(t('subscriptions.form.errorNameRequired'));
    if (typeof amount !== 'number' || amount <= 0) return setError(t('subscriptions.form.errorAmountInvalid'));
    // Daily has no charge_day picker — set to 1 internally (DB column is NOT NULL).
    // Weekly/biweekly use charge_day as ISO weekday (1..7).
    // Monthly/quarterly/semiannual/yearly use charge_day as day-of-month (1..31).
    if (cadence === 'daily') {
      // No-op; we'll force chargeDay to 1 below.
    } else if (cadence === 'weekly' || cadence === 'biweekly') {
      if (typeof chargeDay !== 'number' || chargeDay < 1 || chargeDay > 7) {
        return setError(t('subscriptions.form.errorWeekdayRequired'));
      }
    } else {
      if (typeof chargeDay !== 'number' || chargeDay < 1 || chargeDay > 31) {
        return setError(t('subscriptions.form.errorChargeDayRange'));
      }
    }
    if (cadence === 'yearly' && (typeof chargeMonth !== 'number' || chargeMonth < 1 || chargeMonth > 12))
      return setError(t('subscriptions.form.errorMonthRange'));
    if (!categoryId) return setError(t('subscriptions.form.errorCategoryRequired'));
    try {
      const tags: string[] = ['subscription'];
      // When the feature is off, preserve any existing company-card tag from
      // the record so users don't lose data by editing while feature is disabled.
      const wasCompany = editing.data?.tags?.includes('company-card') ?? false;
      const includeCompany = companyCardEnabled ? companyCard : wasCompany;
      if (includeCompany) tags.push('company-card');
      const finalChargeDay = cadence === 'daily' ? 1 : (chargeDay as number);
      await upsert.mutateAsync({
        id: params.id,
        name: name.trim(),
        amount,
        currency,
        cadence,
        charge_day: finalChargeDay,
        charge_month: cadence === 'yearly' && typeof chargeMonth === 'number' ? chargeMonth : null,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        active,
        tags,
        start_date: ymd(startDate),
        brand_logo: brandLogo,
      });
      navigate(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('subscriptions.form.errorSave'));
    }
  }

  function handleDelete() {
    if (!params.id) return;
    confirmDelete({
      message: t('subscriptions.form.deleteConfirmMessage'),
      onConfirm: async () => {
        try {
          await del.mutateAsync(params.id!);
          navigate(-1);
        } catch (err) {
          setError(err instanceof Error ? err.message : t('subscriptions.form.errorDelete'));
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
            {t('subscriptions.back')}
          </Button>
        </Group>

        <Title order={2}>{isNew ? t('subscriptions.form.newTitle') : name}</Title>

        <TextInput
          label={t('subscriptions.form.name')}
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder={t('subscriptions.form.namePlaceholder')}
        />

        <Box>
          <UnstyledButton
            onClick={() => setBrandPickerOpen((o) => !o)}
            style={{ width: '100%' }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Group gap={8} align="center">
                <BrandTile
                  name={name}
                  brandSlug={brandLogo}
                  fallbackIconName={null}
                  fallbackColor="var(--mantine-color-dimmed)"
                  size={28}
                  iconSize={16}
                />
                <Text size="sm" fw={500}>
                  {t('subscriptions.form.logo')}
                </Text>
              </Group>
              {brandPickerOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            </Group>
          </UnstyledButton>
          <Collapse in={brandPickerOpen}>
            <Text size="xs" c="dimmed" mt="sm" mb="xs">
              {t('subscriptions.form.logoHint')}
            </Text>
            <BrandPicker value={brandLogo} onChange={setBrandLogo} />
          </Collapse>
        </Box>

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
              ? t('subscriptions.form.fxLoading')
              : amountDisplayPreview !== null
                ? t('subscriptions.form.fxPreviewToday', { amount: todayDisplay.formatInDisplay(amountDisplayPreview) })
                : fxRate.isError
                  ? t('subscriptions.form.fxUnavailable')
                  : t('subscriptions.form.fxEnterAmount')}
          </Text>
        )}

        <Select
          label={t('subscriptions.form.cadence')}
          value={cadence}
          onChange={(v) => {
            const next = (v as SubscriptionCadence) ?? 'monthly';
            setCadence(next);
            // Reset charge_day to a sane default when switching cadence types.
            if (next === 'weekly' || next === 'biweekly') {
              if (chargeDay === '' || (chargeDay as number) > 7) setChargeDay(1);
            } else if (next !== 'daily') {
              if (chargeDay === '' || (chargeDay as number) < 1) setChargeDay(1);
            }
          }}
          allowDeselect={false}
          data={[
            { label: t('subscriptions.form.cadenceDailyShort'), value: 'daily' },
            { label: t('subscriptions.form.cadenceWeeklyShort'), value: 'weekly' },
            { label: t('subscriptions.form.cadenceBiweeklyShort'), value: 'biweekly' },
            { label: t('subscriptions.form.cadenceMonthlyShort'), value: 'monthly' },
            { label: t('subscriptions.form.cadenceQuarterlyShort'), value: 'quarterly' },
            { label: t('subscriptions.form.cadenceSemiannualShort'), value: 'semiannual' },
            { label: t('subscriptions.form.cadenceYearlyShort'), value: 'yearly' },
          ]}
        />

        {/* Daily cadence has no charge_day picker — it fires every day. */}
        {cadence !== 'daily' && (
          <Group gap="sm" wrap="nowrap" align="end">
            {cadence === 'weekly' || cadence === 'biweekly' ? (
              <Select
                label={t('subscriptions.form.weekday')}
                flex={1}
                value={String(chargeDay)}
                onChange={(v) => v && setChargeDay(Number(v))}
                data={weekdayOptions}
                allowDeselect={false}
              />
            ) : (
              <NumberInput
                label={t('subscriptions.form.chargeDay')}
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
                label={t('subscriptions.form.monthLabel')}
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
        )}

        <DatePickerInput
          label={t('subscriptions.form.activeFrom')}
          value={startDate}
          onChange={(d) => d && setStartDate(dayjs(d as unknown as Date).toDate())}
          valueFormat="D MMM YYYY"
          required
        />

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
            label={t('subscriptions.form.subcategoryOptional')}
            data={[
              { value: '', label: t('subscriptions.form.noSubcategory') },
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
            aria-label={t('subscriptions.form.active')}
            mt={2}
          />
          <Box flex={1} miw={0}>
            <Text size="sm" fw={500}>
              {t('subscriptions.form.active')}
            </Text>
            <Text size="xs" c="dimmed">
              {t('subscriptions.form.activeHint')}
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
              aria-label={t('subscriptions.form.company')}
              mt={2}
            />
            <Box flex={1} miw={0}>
              <Text size="sm" fw={500}>
                {t('subscriptions.form.company')}
              </Text>
              <Text size="xs" c="dimmed">
                {t('subscriptions.form.companyHint')}
              </Text>
            </Box>
          </Group>
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
