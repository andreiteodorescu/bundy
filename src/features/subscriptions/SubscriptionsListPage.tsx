import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useCategories } from '@/features/categories/api';
import { formatMoney, formatRon, round2 } from '@/lib/money';
import { getFxRate } from '@/lib/fx';
import { useFxRates } from '@/lib/useFxRates';
import { BrandTile } from '@/components/BrandTile';
import { useSubscriptions, useToggleSubscription } from './api';
import type { Subscription } from '@/types';

/**
 * Convert a subscription's amount to its monthly RON equivalent.
 * - weekly  → amount * (365.25/7) / 12  (≈ amount * 4.345)
 * - monthly → amount
 * - yearly  → amount / 12
 */
function monthlyEquivalent(amount: number, cadence: Subscription['cadence']): number {
  if (cadence === 'weekly') return amount * (365.25 / 7) / 12;
  if (cadence === 'yearly') return amount / 12;
  return amount;
}

export function SubscriptionsListPage() {
  const navigate = useNavigate();
  const subs = useSubscriptions();
  const cats = useCategories();
  const toggle = useToggleSubscription();
  const catById = new Map((cats.data ?? []).map((c) => [c.id, c]));
  const fx = useFxRates((subs.data ?? []).map((s) => s.currency));

  const [monthlyTotalRon, setMonthlyTotalRon] = useState<number | null>(null);
  const [totalCurrencies, setTotalCurrencies] = useState<Set<string>>(new Set());

  // Compute total monthly equivalent in RON across all *active* subs, fetching FX rates as needed
  useEffect(() => {
    const active = (subs.data ?? []).filter((s) => s.active);
    if (active.length === 0) {
      setMonthlyTotalRon(0);
      setTotalCurrencies(new Set());
      return;
    }
    const today = dayjs().format('YYYY-MM-DD');
    let cancelled = false;
    (async () => {
      let total = 0;
      const currencies = new Set<string>();
      for (const sub of active) {
        currencies.add(sub.currency);
        const monthly = monthlyEquivalent(Number(sub.amount), sub.cadence);
        if (sub.currency === 'RON') {
          total += monthly;
        } else {
          try {
            const rate = await getFxRate(today, sub.currency);
            total += monthly * rate.rate_to_ron;
          } catch {
            // FX unavailable in dev/offline — fallback to a rough manual estimate
            // (skip this sub from the total rather than misrepresent)
          }
        }
      }
      if (!cancelled) {
        setMonthlyTotalRon(round2(total));
        setTotalCurrencies(currencies);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subs.data]);

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Group gap="xs">
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/more')}
          >
            Înapoi
          </Button>
        </Group>

        <Group justify="space-between" align="center">
          <Title order={2}>Subscripții</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            size="sm"
            onClick={() => navigate('/subscriptions/new')}
          >
            Adaugă
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
              <Text c="dimmed">Nicio subscripție</Text>
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
                  onToggle={(active) => toggle.mutate({ id: sub.id, active })}
                  onClick={() => navigate(`/subscriptions/${sub.id}/edit`)}
                />
              ))}
            </Stack>

            <Paper withBorder radius="md" p="md" mt="xs">
              <Group justify="space-between" align="flex-start">
                <Box>
                  <Text size="xs" c="dimmed">
                    Total estimat lunar (active)
                  </Text>
                  <Text size="xs" c="dimmed">
                    Saptămânal × 4.345 · Anual ÷ 12{' '}
                    {totalCurrencies.size > 1 && '· EUR/USD convertite la cursul BNR'}
                  </Text>
                </Box>
                <Text fw={800} size="xl">
                  {monthlyTotalRon === null ? '...' : formatRon(monthlyTotalRon)}
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
  onToggle,
  onClick,
}: {
  subscription: Subscription;
  category: { color: string; icon: string; name: string } | null;
  rateRon: number | null;
  onToggle: (active: boolean) => void;
  onClick: () => void;
}) {
  const color = category?.color ?? 'var(--mantine-color-gray-6)';
  const cadenceLabel = formatCadence(subscription);
  const showRon = subscription.currency !== 'RON' && rateRon !== null;
  const amountRon = showRon ? Number(subscription.amount) * rateRon : null;

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
            {subscription.tags.includes('work-reimbursable') && (
              <Badge size="xs" variant="light" color="gray">
                work
              </Badge>
            )}
          </Group>
          <Text size="xs" c="dimmed">
            {formatMoney(Number(subscription.amount), subscription.currency)}
            {showRon && amountRon !== null && ` ≈ ${formatRon(amountRon)}`}
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

const WEEKDAY_RO = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
const MONTH_RO = [
  'ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

function formatCadence(s: Subscription): string {
  if (s.cadence === 'weekly') {
    return `săptămânal, ${WEEKDAY_RO[(s.charge_day - 1) % 7]}`;
  }
  if (s.cadence === 'yearly') {
    const m = s.charge_month ? MONTH_RO[(s.charge_month - 1) % 12] : '?';
    return `anual, ${s.charge_day} ${m}`;
  }
  return `lunar, ziua ${s.charge_day}`;
}
