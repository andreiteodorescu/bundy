import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Group, Paper, Stack, Text, UnstyledButton } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconWallet } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useActiveBudgets, useBudgetProgress } from './api';
import { BudgetProgressBar } from './BudgetProgressBar';
import type { Budget } from '@/types';

export function ActiveBudgetBanner() {
  const active = useActiveBudgets();
  if (active.isLoading || (active.data ?? []).length === 0) return null;

  return (
    <Stack gap="xs">
      {(active.data ?? []).map((b) => (
        <ActiveBudgetCard key={b.id} budget={b} />
      ))}
    </Stack>
  );
}

function ActiveBudgetCard({ budget }: { budget: Budget }) {
  const navigate = useNavigate();
  const progress = useBudgetProgress(budget);
  const firedThresholds = useRef(new Set<number>());

  // Fire threshold notifications once per session for each newly-crossed threshold
  useEffect(() => {
    if (!progress.data) return;
    const pct = progress.data.pct;
    for (const t of budget.thresholds_pct) {
      if (pct >= t && !firedThresholds.current.has(t)) {
        firedThresholds.current.add(t);
        // Persist that this threshold has fired (best-effort; safe to retry)
        supabase
          .from('budget_notifications')
          .upsert({ budget_id: budget.id, threshold_pct: t }, { onConflict: 'budget_id,threshold_pct', ignoreDuplicates: true })
          .then(({ error }) => {
            // If the row already existed, skip the toast (we only fire once per threshold ever)
            if (!error) {
              notifications.show({
                title: budget.name,
                message: `Ai cheltuit ${Math.round(pct)}% din buget`,
                color: t >= 100 ? 'red' : t >= 90 ? 'orange' : 'yellow',
                autoClose: 5000,
              });
            }
          });
      }
    }
  }, [progress.data, budget.thresholds_pct, budget.id, budget.name]);

  return (
    <UnstyledButton onClick={() => navigate(`/budgets/${budget.id}/edit`)}>
      <Paper withBorder radius="md" p="md" style={{ borderColor: 'var(--mantine-primary-color-filled)' }}>
        <Group gap="sm" wrap="nowrap" mb="xs">
          <Box
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'var(--mantine-primary-color-light)',
              color: 'var(--mantine-primary-color-filled)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconWallet size={18} stroke={2} />
          </Box>
          <Box flex={1} miw={0}>
            <Text fw={600} truncate>
              {budget.name}
            </Text>
            <Text size="xs" c="dimmed">
              Buget activ
            </Text>
          </Box>
        </Group>
        <BudgetProgressBar budget={budget} />
      </Paper>
    </UnstyledButton>
  );
}
