import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Group, Paper, Stack, Text, UnstyledButton } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconWallet } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useActiveBudgets, useBudgetProgress } from './api';
import { BudgetProgressBar } from './BudgetProgressBar';
import type { Budget } from '@/types';
import classes from './ActiveBudgetBanner.module.css';

export function ActiveBudgetBanner() {
  const { t } = useTranslation();
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
            aria-label={t('budgets.bannerNumeration', { current: i + 1, total: budgets.length })}
          />
        ))}
      </Group>
    </Stack>
  );
}

function ActiveBudgetCard({ budget }: { budget: Budget }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const progress = useBudgetProgress(budget);
  const firedThresholds = useRef(new Set<number>());

  // Fire threshold notifications exactly once — across sessions and devices — for each
  // crossed threshold. The `firedThresholds` ref dedups within a single mount; the
  // `budget_notifications` row dedups across mounts/devices. We use `.select()` so the
  // upsert returns only newly-inserted rows (with `ignoreDuplicates`, conflicts are
  // skipped without error), and only show the toast when a row was actually inserted.
  useEffect(() => {
    if (!progress.data) return;
    const pct = progress.data.pct;
    for (const threshold of budget.thresholds_pct) {
      if (pct >= threshold && !firedThresholds.current.has(threshold)) {
        firedThresholds.current.add(threshold);
        supabase
          .from('budget_notifications')
          .upsert(
            { budget_id: budget.id, threshold_pct: threshold },
            { onConflict: 'budget_id,threshold_pct', ignoreDuplicates: true },
          )
          .select()
          .then(({ data, error }) => {
            if (!error && data && data.length > 0) {
              notifications.show({
                title: budget.name,
                message: t('budgets.banner.spentPercent', { pct: Math.round(pct) }),
                color: threshold >= 100 ? 'red' : threshold >= 90 ? 'orange' : 'yellow',
                autoClose: 5000,
              });
            }
          });
      }
    }
  }, [progress.data, budget.thresholds_pct, budget.id, budget.name, t]);

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
