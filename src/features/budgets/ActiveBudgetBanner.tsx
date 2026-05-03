import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Group, Paper, Stack, Text, UnstyledButton } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconWallet } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useActiveBudgets, useBudgetProgress } from './api';
import { BudgetProgressBar } from './BudgetProgressBar';
import type { Budget } from '@/types';
import classes from './ActiveBudgetBanner.module.css';

export function ActiveBudgetBanner() {
  const active = useActiveBudgets();
  const budgets = active.data ?? [];
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  // Track which card is currently snapped into view (for the dot indicator)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || budgets.length <= 1) return;
    function handleScroll() {
      if (!el) return;
      const cardWidth = el.clientWidth;
      if (cardWidth === 0) return;
      const idx = Math.round(el.scrollLeft / cardWidth);
      setActiveIdx(idx);
    }
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [budgets.length]);

  if (active.isLoading || budgets.length === 0) return null;

  if (budgets.length === 1) {
    return <ActiveBudgetCard budget={budgets[0]} />;
  }

  return (
    <Stack gap="xs">
      <div ref={scrollerRef} className={classes.scroller}>
        {budgets.map((b) => (
          <div key={b.id} className={classes.slide}>
            <ActiveBudgetCard budget={b} />
          </div>
        ))}
      </div>
      <Group gap={6} justify="center" mt={2}>
        {budgets.map((_, i) => (
          <span
            key={i}
            className={`${classes.dot} ${i === activeIdx ? classes.dotActive : ''}`}
            aria-label={`Buget ${i + 1} din ${budgets.length}`}
          />
        ))}
      </Group>
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
        supabase
          .from('budget_notifications')
          .upsert(
            { budget_id: budget.id, threshold_pct: t },
            { onConflict: 'budget_id,threshold_pct', ignoreDuplicates: true },
          )
          .then(({ error }) => {
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
    <UnstyledButton onClick={() => navigate(`/budgets/${budget.id}/edit`)} w="100%">
      <Paper
        withBorder
        radius="md"
        p="md"
        style={{ borderColor: 'var(--mantine-primary-color-filled)' }}
      >
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
          </Box>
        </Group>
        <BudgetProgressBar budget={budget} />
      </Paper>
    </UnstyledButton>
  );
}
