import { Badge, Group, Progress, Text } from '@mantine/core';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useBudgetProgress } from './api';
import { computeBudgetStatus } from './status';
import { useDisplayConversion, useTodayDisplayRate } from '@/lib/displayCurrency';
import type { Budget } from '@/types';

export function BudgetProgressBar({ budget, compact = false }: { budget: Budget; compact?: boolean }) {
  const { t } = useTranslation();
  const progress = useBudgetProgress(budget);

  // Per-expense historical conversion for accurate spent. Budget AMOUNT (the
  // limit) is stored as amount_ron and converted with today's rate — small
  // drift acceptable for forward-looking budgets.
  const display = useDisplayConversion(progress.data?.expenses ?? []);
  const todayRate = useTodayDisplayRate();

  const computed = useMemo(() => {
    const amountInDisplay = todayRate.convertFromRon(Number(budget.amount_ron));
    const spentInDisplay = (progress.data?.expenses ?? []).reduce(
      (s, e) => s + (display.convert(e) ?? 0),
      0,
    );
    const pct = amountInDisplay && amountInDisplay > 0 ? (spentInDisplay / amountInDisplay) * 100 : 0;
    const remaining = (amountInDisplay ?? 0) - spentInDisplay;
    return { spent: spentInDisplay, remaining, pct, amountInDisplay };
  }, [budget.amount_ron, progress.data, display, todayRate]);

  // Use RON spent for status check (status logic compares against budget.amount_ron
  // which is in RON). Status thresholds don't need display-currency precision.
  const status = computeBudgetStatus(budget, progress.data?.spent ?? 0);
  const color = status.color === 'gray' ? 'accent' : status.color;

  const fmt = display.formatInDisplay;

  return (
    <>
      <Group justify="space-between" mb={6} gap={6} wrap="wrap">
        <Badge color={status.color} variant="light" size="sm">
          {t(status.labelKey)}
        </Badge>
        <Text size="xs" c={computed.pct >= 100 ? 'red' : 'dimmed'} fw={computed.pct >= 90 ? 700 : 500}>
          {Math.round(computed.pct)}%
        </Text>
      </Group>
      <Progress
        value={Math.min(computed.pct, 100)}
        color={color}
        size={compact ? 'sm' : 'md'}
        radius="xl"
        styles={
          color === 'accent'
            ? { section: { background: 'var(--bundy-accent-gradient)' } }
            : undefined
        }
      />
      <Group justify="space-between" mt={compact ? 2 : 6} gap={6} wrap="wrap">
        <Text size="xs" c="dimmed">
          {t('budgets.progress.spent', { amount: fmt(computed.spent) })}
        </Text>
        <Text size="xs" c={computed.pct >= 100 ? 'red' : 'dimmed'} fw={computed.pct >= 90 ? 700 : 500}>
          {computed.remaining >= 0
            ? t('budgets.progress.remaining', { amount: fmt(computed.remaining) })
            : t('budgets.progress.over', { amount: fmt(Math.abs(computed.remaining)) })}
        </Text>
      </Group>
    </>
  );
}
