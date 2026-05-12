import { useEffect, useState } from 'react';
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
import { IconArrowLeft, IconBuildingBank, IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useCategories } from '@/features/categories/api';
import { formatMoney, formatRon, round2, type Currency } from '@/lib/money';
import { useDefaultCurrency } from '@/features/settings/api';
import { getFxRate } from '@/lib/fx';
import { useFxRates } from '@/lib/useFxRates';
import { getIcon } from '@/data/icons.registry';
import { useLoans, useToggleLoan } from './api';
import type { Loan } from '@/types';

export function LoansListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const goBack = useGoBack('/more');
  const loans = useLoans();
  const cats = useCategories();
  const toggle = useToggleLoan();
  const catById = new Map((cats.data ?? []).map((c) => [c.id, c]));
  const displayCurrency = useDefaultCurrency();
  const fx = useFxRates([...(loans.data ?? []).map((l) => l.currency), displayCurrency]);
  const displayRate = displayCurrency === 'RON' ? 1 : fx.rateOf(displayCurrency);

  const [monthlyTotalRon, setMonthlyTotalRon] = useState<number | null>(null);

  useEffect(() => {
    const active = (loans.data ?? []).filter((l) => l.active);
    if (active.length === 0) {
      setMonthlyTotalRon(0);
      return;
    }
    const today = dayjs().format('YYYY-MM-DD');
    let cancelled = false;
    (async () => {
      let total = 0;
      for (const loan of active) {
        const monthly = Number(loan.monthly_payment);
        if (loan.currency === 'RON') {
          total += monthly;
        } else {
          try {
            const rate = await getFxRate(today, loan.currency);
            total += monthly * rate.rate_to_ron;
          } catch {
            /* skip if FX unavailable */
          }
        }
      }
      if (!cancelled) setMonthlyTotalRon(round2(total));
    })();
    return () => {
      cancelled = true;
    };
  }, [loans.data]);

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
            {t('loans.back')}
          </Button>
        </Group>

        <Group justify="space-between" align="center">
          <Title order={2}>{t('loans.title')}</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            size="sm"
            onClick={() => navigate('/loans/new')}
          >
            {t('loans.addShort')}
          </Button>
        </Group>

        {loans.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : (loans.data ?? []).length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconBuildingBank size={36} stroke={1.5} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed">{t('loans.empty')}</Text>
            </Stack>
          </Center>
        ) : (
          <>
            <Stack gap="xs">
              {(loans.data ?? []).map((loan) => (
                <LoanRow
                  key={loan.id}
                  loan={loan}
                  category={catById.get(loan.category_id ?? '') ?? null}
                  rateRon={fx.rateOf(loan.currency)}
                  displayCurrency={displayCurrency}
                  displayRate={displayRate}
                  onToggle={(active) => toggle.mutate({ id: loan.id, active })}
                  onClick={() => navigate(`/loans/${loan.id}/edit`)}
                  t={t}
                />
              ))}
            </Stack>

            <Paper withBorder radius="md" p="md" mt="xs">
              <Group justify="space-between" align="flex-start">
                <Box>
                  <Text size="xs" c="dimmed">
                    {t('loans.monthlyTotal')}
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

function LoanRow({
  loan,
  category,
  rateRon,
  displayCurrency,
  displayRate,
  onToggle,
  onClick,
  t,
}: {
  loan: Loan;
  category: { color: string; icon: string; name: string } | null;
  rateRon: number | null;
  displayCurrency: Currency;
  displayRate: number | null;
  onToggle: (active: boolean) => void;
  onClick: () => void;
  t: TFunction;
}) {
  const Icon = getIcon(category?.icon);
  const color = category?.color ?? 'var(--mantine-color-gray-6)';
  let monthlyDisplay: number | null = null;
  if (loan.currency !== displayCurrency) {
    const rowRateToRon = loan.currency === 'RON' ? 1 : rateRon;
    if (rowRateToRon !== null && displayRate !== null && displayRate > 0) {
      monthlyDisplay = (Number(loan.monthly_payment) * rowRateToRon) / displayRate;
    }
  }
  const showConversion = monthlyDisplay !== null;

  const remaining = loan.end_date
    ? Math.max(0, dayjs(loan.end_date).diff(dayjs(), 'month'))
    : null;

  return (
    <Paper withBorder radius="md" p="sm" style={{ opacity: loan.active ? 1 : 0.55 }}>
      <Group wrap="nowrap" gap="sm">
        <Box
          onClick={onClick}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `${color}22`,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: '0 0 auto',
            cursor: 'pointer',
          }}
        >
          <Icon size={18} stroke={2} />
        </Box>
        <Box flex={1} miw={0} onClick={onClick} style={{ cursor: 'pointer' }}>
          <Group gap={6} wrap="nowrap">
            <Text fw={500} truncate>
              {loan.name}
            </Text>
            {loan.bank && (
              <Badge size="xs" variant="light" color="gray">
                {loan.bank}
              </Badge>
            )}
          </Group>
          <Text size="xs" c="dimmed">
            {formatMoney(Number(loan.monthly_payment), loan.currency)}
            {showConversion && monthlyDisplay !== null && ` ≈ ${formatMoney(monthlyDisplay, displayCurrency)}`}
            {' · '}{t('loans.chargeDay', { day: loan.charge_day })}
            {remaining !== null && ` · ${t('loans.monthsRemaining', { count: remaining })}`}
          </Text>
        </Box>
        <Switch
          checked={loan.active}
          onChange={(e) => onToggle(e.currentTarget.checked)}
          size="md"
        />
      </Group>
    </Paper>
  );
}
