import { Badge, Group, Progress, Text } from '@mantine/core';
import { useBudgetProgress } from './api';
import { formatRon } from '@/lib/money';
import { computeBudgetStatus } from './status';
import type { Budget } from '@/types';

export function BudgetProgressBar({ budget, compact = false }: { budget: Budget; compact?: boolean }) {
  const progress = useBudgetProgress(budget);
  const pct = progress.data?.pct ?? 0;
  const spent = progress.data?.spent ?? 0;
  const remaining = progress.data?.remaining ?? 0;

  const status = computeBudgetStatus(budget, spent);
  const color = status.color === 'gray' ? 'accent' : status.color;

  return (
    <>
      <Group justify="space-between" mb={6} gap={6} wrap="wrap">
        <Badge color={status.color} variant="light" size="sm">
          {status.label}
        </Badge>
        <Text size="xs" c={pct >= 100 ? 'red' : 'dimmed'} fw={pct >= 90 ? 700 : 500}>
          {Math.round(pct)}%
        </Text>
      </Group>
      <Progress value={Math.min(pct, 100)} color={color} size={compact ? 'sm' : 'md'} radius="xl" />
      <Group justify="space-between" mt={compact ? 2 : 6} gap={6} wrap="wrap">
        <Text size="xs" c="dimmed">
          {formatRon(spent)} cheltuiți
        </Text>
        <Text size="xs" c={pct >= 100 ? 'red' : 'dimmed'} fw={pct >= 90 ? 700 : 500}>
          {remaining >= 0
            ? `${formatRon(remaining)} disponibil`
            : `${formatRon(Math.abs(remaining))} peste`}
        </Text>
      </Group>
    </>
  );
}
