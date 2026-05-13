import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoBack } from '@/lib/useGoBack';
import {
  Badge,
  Box,
  Button,
  Center,
  Container,
  Group,
  Loader,
  Paper,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import dayjs from 'dayjs';
import { IconArrowLeft, IconCreditCard, IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useCategories } from '@/features/categories/api';
import { useCompanyCardEnabled, useDefaultCurrency } from '@/features/settings/api';
import { formatMoney, formatRon, round2, type Currency } from '@/lib/money';
import { useFxRates } from '@/lib/useFxRates';
import { BrandTile } from '@/components/BrandTile';
import { useSubscriptions, useToggleSubscription } from './api';
import { monthlyEquivalent } from './utils';
import type { Subscription } from '@/types';

export function SubscriptionsListPage() {
  const { t } = useTranslation();
  const companyCardEnabled = useCompanyCardEnabled();
  const navigate = useNavigate();
  const goBack = useGoBack('/more');
  const subs = useSubscriptions();
  const cats = useCategories();
  const toggle = useToggleSubscription();
  const catById = useMemo(
    () => new Map((cats.data ?? []).map((c) => [c.id, c])),
    [cats.data],
  );
  const displayCurrency = useDefaultCurrency();
  const fx = useFxRates([...(subs.data ?? []).map((s) => s.currency), displayCurrency]);
  const displayRate = displayCurrency === 'RON' ? 1 : fx.rateOf(displayCurrency);

  const { monthlyTotalRon, totalCurrencies } = useMemo(() => {
    const active = (subs.data ?? []).filter((s) => s.active);
    const currencies = new Set<string>(active.map((s) => s.currency));
    if (active.length === 0 || fx.isLoading) {
      return { monthlyTotalRon: active.length === 0 ? 0 : null, totalCurrencies: currencies };
    }
    let total = 0;
    for (const sub of active) {
      const monthly = monthlyEquivalent(Number(sub.amount), sub.cadence);
      if (sub.currency === 'RON') {
        total += monthly;
      } else {
        const rate = fx.rateOf(sub.currency);
        if (rate !== null) total += monthly * rate;
      }
    }
    return { monthlyTotalRon: round2(total) as number | null, totalCurrencies: currencies };
  }, [subs.data, fx.isLoading]);

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Group gap="xs">
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
            onClick={goBack}
          >
            {t('subscriptions.back')}
          </Button>
        </Group>

        <Group justify="space-between" align="center">
          <Title order={2}>{t('subscriptions.title')}</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            size="sm"
            onClick={() => navigate('/subscriptions/new')}
          >
            {t('subscriptions.addShort')}
          </Button>
        </Group>

        {subs.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : (subs.data ?? []).length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconCreditCard size={36} stroke={1.5} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed">{t('subscriptions.empty')}</Text>
            </Stack>
          </Center>
        ) : (
          <>
            <Stack gap="xs">
              {(subs.data ?? []).map((sub) => (
                <SubscriptionRow
                  key={sub.id}
                  subscription={sub}
                  category={catById.get(sub.category_id ?? '') ?? null}
                  rateRon={fx.rateOf(sub.currency)}
                  displayCurrency={displayCurrency}
                  displayRate={displayRate}
                  onToggle={(active) => toggle.mutate({ id: sub.id, active })}
                  onClick={() => navigate(`/subscriptions/${sub.id}/edit`)}
                  t={t}
                  showCompanyBadge={companyCardEnabled}
                />
              ))}
            </Stack>

            <Paper withBorder radius="md" p="md" mt="xs">
              <Group justify="space-between" align="flex-start">
                <Box>
                  <Text size="xs" c="dimmed">
                    {t('subscriptions.totalLabel')}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t('subscriptions.totalHint')}
                    {totalCurrencies.size > 1 && ` · ${t('subscriptions.totalHintFx')}`}
                  </Text>
                </Box>
                <Text fw={800} size="xl">
                  {monthlyTotalRon === null
                    ? '...'
                    : displayRate !== null
                      ? formatMoney(monthlyTotalRon / displayRate, displayCurrency)
                      : formatRon(monthlyTotalRon)}
                </Text>
              </Group>
            </Paper>
          </>
        )}
      </Stack>
    </Container>
  );
}

function SubscriptionRow({
  subscription,
  category,
  rateRon,
  displayCurrency,
  displayRate,
  onToggle,
  onClick,
  t,
  showCompanyBadge,
}: {
  subscription: Subscription;
  category: { color: string; icon: string; name: string } | null;
  rateRon: number | null;
  displayCurrency: Currency;
  displayRate: number | null;
  onToggle: (active: boolean) => void;
  onClick: () => void;
  t: TFunction;
  showCompanyBadge: boolean;
}) {
  const color = category?.color ?? 'var(--mantine-color-gray-6)';
  const cadenceLabel = formatCadence(subscription, t);
  let amountDisplay: number | null = null;
  if (subscription.currency !== displayCurrency) {
    const rowRateToRon = subscription.currency === 'RON' ? 1 : rateRon;
    if (rowRateToRon !== null && displayRate !== null && displayRate > 0) {
      amountDisplay = (Number(subscription.amount) * rowRateToRon) / displayRate;
    }
  }
  const showConversion = amountDisplay !== null;

  return (
    <Paper withBorder radius="md" p="sm" style={{ opacity: subscription.active ? 1 : 0.55 }}>
      <Group wrap="nowrap" gap="sm">
        <Box onClick={onClick} style={{ cursor: 'pointer', flex: '0 0 auto' }}>
          <BrandTile
            name={subscription.name}
            brandSlug={subscription.brand_logo}
            fallbackIconName={category?.icon ?? null}
            fallbackColor={color}
            size={36}
            iconSize={18}
          />
        </Box>
        <Box flex={1} miw={0} onClick={onClick} style={{ cursor: 'pointer' }}>
          <Group gap={6} wrap="nowrap">
            <Text fw={500} truncate>
              {subscription.name}
            </Text>
            {showCompanyBadge && subscription.tags.includes('company-card') && (
              <Badge size="xs" variant="light" color="gray">
                {t('expenses.badges.company')}
              </Badge>
            )}
          </Group>
          <Text size="xs" c="dimmed">
            {formatMoney(Number(subscription.amount), subscription.currency)}
            {showConversion && amountDisplay !== null && ` ≈ ${formatMoney(amountDisplay, displayCurrency)}`}
            {' · '}{cadenceLabel}
          </Text>
        </Box>
        <Switch
          checked={subscription.active}
          onChange={(e) => onToggle(e.currentTarget.checked)}
          size="md"
        />
      </Group>
    </Paper>
  );
}

function formatCadence(s: Subscription, t: TFunction): string {
  // dayjs week starts Sunday (index 0). ISO weekday: 1=Mon..7=Sun. Map by `% 7`.
  const weekdayName = (isoDay: number) => {
    const w = dayjs().day(isoDay % 7).format('dddd');
    return w.charAt(0).toUpperCase() + w.slice(1);
  };
  switch (s.cadence) {
    case 'daily':
      return t('subscriptions.cadenceDaily');
    case 'weekly':
      return t('subscriptions.cadenceWeekly', { weekday: weekdayName(s.charge_day) });
    case 'biweekly':
      return t('subscriptions.cadenceBiweekly', { weekday: weekdayName(s.charge_day) });
    case 'monthly':
      return t('subscriptions.cadenceMonthly', { day: s.charge_day });
    case 'quarterly':
      return t('subscriptions.cadenceQuarterly', { day: s.charge_day });
    case 'semiannual':
      return t('subscriptions.cadenceSemiannual', { day: s.charge_day });
    case 'yearly': {
      const month = s.charge_month ? dayjs().month(s.charge_month - 1).format('MMM') : '?';
      return t('subscriptions.cadenceYearly', { day: s.charge_day, month });
    }
  }
}
