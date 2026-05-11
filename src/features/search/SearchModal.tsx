import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Center,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconCalendar,
  IconCash,
  IconClock,
  IconReceiptOff,
  IconSearch,
  IconSparkles,
  IconX,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useCategories, useSubcategories } from '@/features/categories/api';
import { useRecentExpenses } from '@/features/expenses/api';
import { cleanExpenseName } from '@/lib/text';
import { formatRon } from '@/lib/money';
import { getIcon } from '@/data/icons.registry';
import { categoryDisplayName, subcategoryDisplayName } from '@/i18n/displayName';
import type { Category, Expense, Subcategory } from '@/types';
import { useSearchStore } from './store';
import { useSearchExpenses } from './api';
import { parseSearch } from './parseSearch';
import classes from './SearchModal.module.css';

export function SearchModal() {
  const { t } = useTranslation();
  const open = useSearchStore((s) => s.open);
  const setOpen = useSearchStore((s) => s.setOpen);
  const recent = useSearchStore((s) => s.recent);
  const addRecent = useSearchStore((s) => s.addRecent);
  const clearRecent = useSearchStore((s) => s.clearRecent);

  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const results = useSearchExpenses(input);
  const cats = useCategories();
  const subs = useSubcategories();
  const history = useRecentExpenses(50);
  const catById = useMemo(() => new Map((cats.data ?? []).map((c) => [c.id, c])), [cats.data]);
  const subById = useMemo(() => new Map((subs.data ?? []).map((s) => [s.id, s])), [subs.data]);

  useEffect(() => {
    if (!open) setInput('');
  }, [open]);

  const trimmed = input.trim();
  const parsed = trimmed.length >= 2 ? parseSearch(trimmed) : null;

  const total = useMemo(
    () => (results.data ?? []).reduce((s, e) => s + Number(e.amount_ron), 0),
    [results.data],
  );

  const suggestedTop = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of history.data ?? []) {
      const n = cleanExpenseName(e.name);
      if (!n) continue;
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([n]) => n);
  }, [history.data]);

  function handleResultClick(exp: Expense) {
    addRecent(input);
    setOpen(false);
    navigate(`/expenses/${exp.id}/edit`);
  }

  function pickQuery(q: string) {
    setInput(q);
  }

  return (
    <Modal
      opened={open}
      onClose={() => setOpen(false)}
      fullScreen
      withCloseButton={false}
      padding={0}
      transitionProps={{ transition: 'slide-up', duration: 180 }}
      styles={{ body: { padding: 0, minHeight: '100dvh' } }}
    >
      <Box className={classes.stickyHeader}>
        <Group gap="xs" p="sm" wrap="nowrap">
          <ActionIcon variant="subtle" size="lg" onClick={() => setOpen(false)} aria-label={t('search.closeAria')}>
            <IconArrowLeft size={20} />
          </ActionIcon>
          <TextInput
            flex={1}
            placeholder={t('search.placeholder')}
            autoFocus
            size="md"
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            rightSection={
              input ? (
                <ActionIcon variant="subtle" size="sm" onClick={() => setInput('')} aria-label={t('search.clearAria')}>
                  <IconX size={14} />
                </ActionIcon>
              ) : null
            }
          />
        </Group>

        {parsed && <DetectionHint parsed={parsed} t={t} />}
      </Box>

      <Box p="md">
          {trimmed.length < 2 ? (
            <EmptyState
              recent={recent}
              suggested={suggestedTop}
              onPick={pickQuery}
              onClear={clearRecent}
              t={t}
            />
          ) : results.isFetching ? (
            <Center py="xl">
              <Loader size="sm" />
            </Center>
          ) : (results.data ?? []).length === 0 ? (
            <Center py="xl">
              <Stack align="center" gap="xs">
                <IconReceiptOff size={36} stroke={1.5} color="var(--mantine-color-dimmed)" />
                <Text c="dimmed" size="sm">
                  {t('search.noResults', { query: trimmed })}
                </Text>
              </Stack>
            </Center>
          ) : (
            <Stack gap="md">
              <Paper withBorder radius="md" p="sm">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    {t('search.results', { count: results.data!.length })}
                  </Text>
                  <Text fw={700} size="lg">
                    {formatRon(total)}
                  </Text>
                </Group>
              </Paper>
              <Stack gap="xs">
                {results.data!.map((exp) => (
                  <ResultRow
                    key={exp.id}
                    expense={exp}
                    category={catById.get(exp.category_id ?? '') ?? null}
                    subcategory={subById.get(exp.subcategory_id ?? '') ?? null}
                    onClick={() => handleResultClick(exp)}
                    t={t}
                  />
                ))}
              </Stack>
            </Stack>
          )}
        </Box>
    </Modal>
  );
}

function DetectionHint({ parsed, t }: { parsed: ReturnType<typeof parseSearch>; t: TFunction }) {
  let icon = <IconSearch size={12} />;
  let label = t('search.detect.text');
  if (parsed.kind === 'number') {
    icon = <IconCash size={12} />;
    label = t('search.detect.amount', { value: parsed.value.toLocaleString() });
  } else if (parsed.kind === 'date') {
    icon = <IconCalendar size={12} />;
    label = t('search.detect.date', { date: dayjs(parsed.iso).format('D MMM YYYY') });
  } else if (parsed.kind === 'month') {
    icon = <IconCalendar size={12} />;
    label = t('search.detect.month', { month: dayjs(parsed.ym + '-01').format('MMMM YYYY') });
  }
  return (
    <Box px="md" py={6} className={classes.hint}>
      <Group gap={6}>
        {icon}
        <Text size="xs" c="dimmed">
          {label}
        </Text>
      </Group>
    </Box>
  );
}

function EmptyState({
  recent,
  suggested,
  onPick,
  onClear,
  t,
}: {
  recent: string[];
  suggested: string[];
  onPick: (q: string) => void;
  onClear: () => void;
  t: TFunction;
}) {
  if (recent.length === 0 && suggested.length === 0) {
    return (
      <Center py="xl">
        <Stack align="center" gap="xs">
          <IconSearch size={36} stroke={1.5} color="var(--mantine-color-dimmed)" />
          <Text c="dimmed" size="sm" ta="center" maw={300}>
            {t('search.emptyHint')}
          </Text>
        </Stack>
      </Center>
    );
  }
  return (
    <Stack gap="lg">
      {recent.length > 0 && (
        <Stack gap="xs">
          <Group justify="space-between" px={4}>
            <Group gap={6}>
              <IconClock size={14} color="var(--mantine-color-dimmed)" />
              <Text size="xs" fw={600} c="dimmed">
                {t('search.recentTitle')}
              </Text>
            </Group>
            <Anchor component="button" type="button" size="xs" c="dimmed" onClick={onClear}>
              {t('search.clearRecent')}
            </Anchor>
          </Group>
          <Group gap="xs">
            {recent.map((q) => (
              <Badge
                key={q}
                size="lg"
                variant="light"
                style={{ cursor: 'pointer', textTransform: 'none' }}
                onClick={() => onPick(q)}
              >
                {q}
              </Badge>
            ))}
          </Group>
        </Stack>
      )}
      {suggested.length > 0 && (
        <Stack gap="xs">
          <Group gap={6} px={4}>
            <IconSparkles size={14} color="var(--mantine-color-dimmed)" />
            <Text size="xs" fw={600} c="dimmed">
              {t('search.frequentTitle')}
            </Text>
          </Group>
          <Group gap="xs">
            {suggested.map((q) => (
              <Badge
                key={q}
                size="lg"
                variant="default"
                style={{ cursor: 'pointer', textTransform: 'none' }}
                onClick={() => onPick(q)}
              >
                {q}
              </Badge>
            ))}
          </Group>
        </Stack>
      )}
    </Stack>
  );
}

function ResultRow({
  expense,
  category,
  subcategory,
  onClick,
  t,
}: {
  expense: Expense;
  category: Category | null;
  subcategory: Subcategory | null;
  onClick: () => void;
  t: TFunction;
}) {
  const Icon = getIcon(category?.icon);
  const color = category?.color ?? 'var(--mantine-color-gray-6)';
  const categoryName = category ? categoryDisplayName(category, t) : null;
  const subcategoryName = subcategory ? subcategoryDisplayName(subcategory, t) : null;

  return (
    <UnstyledButton onClick={onClick} w="100%">
      <Paper withBorder radius="md" p="sm">
        <Group wrap="nowrap" gap="sm">
          <Box
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
            }}
          >
            <Icon size={18} stroke={2} />
          </Box>
          <Box flex={1} miw={0}>
            <Group gap={6} wrap="nowrap">
              <Text fw={500} truncate>
                {cleanExpenseName(expense.name)}
              </Text>
              {expense.quantity && expense.quantity > 1 && (
                <Text size="sm" fw={700} c="dimmed">
                  ×{expense.quantity}
                </Text>
              )}
            </Group>
            <Text size="xs" c="dimmed">
              {dayjs(expense.occurred_on).format('D MMM YYYY')}
              {categoryName ? ` · ${categoryName}` : ''}
              {subcategoryName ? ` › ${subcategoryName}` : ''}
            </Text>
          </Box>
          <Text fw={700}>{formatRon(Number(expense.amount_ron))}</Text>
        </Group>
      </Paper>
    </UnstyledButton>
  );
}
