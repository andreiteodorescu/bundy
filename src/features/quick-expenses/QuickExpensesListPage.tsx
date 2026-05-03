import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Container,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconArrowLeft, IconBolt, IconMinus, IconPlus } from '@tabler/icons-react';
import { useCategories } from '@/features/categories/api';
import { formatMoney } from '@/lib/money';
import { getIcon } from '@/data/icons.registry';
import {
  useQuickExpenses,
  useQuickTodayAggregates,
  useStepQuickExpense,
} from './api';
import type { QuickExpense } from '@/types';

export function QuickExpensesListPage() {
  const navigate = useNavigate();
  const templates = useQuickExpenses();
  const today = useQuickTodayAggregates();
  const cats = useCategories();
  const step = useStepQuickExpense();

  const catById = new Map((cats.data ?? []).map((c) => [c.id, c]));

  const todayTotal = Array.from((today.data ?? new Map()).values()).reduce(
    (s, e) => s + Number(e.amount_ron),
    0,
  );

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Group gap="xs" justify="space-between">
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/home')}
          >
            Înapoi
          </Button>
          <Button
            size="compact-sm"
            leftSection={<IconPlus size={16} />}
            onClick={() => navigate('/quick-expenses/new')}
          >
            Șablon nou
          </Button>
        </Group>

        <Box>
          <Title order={2}>Cheltuială rapidă</Title>
          <Text size="sm" c="dimmed">
            Tap pe + pentru a adăuga o intrare. Mai multe pe aceeași zi se agregă într-o singură
            cheltuială (ex: "Metrou ×4 — 20,00 RON").
          </Text>
        </Box>

        {todayTotal > 0 && (
          <Paper withBorder radius="md" p="sm">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Total adăugat azi
              </Text>
              <Text fw={700} size="lg">
                {formatMoney(todayTotal, 'RON')}
              </Text>
            </Group>
          </Paper>
        )}

        {templates.isLoading || today.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : (templates.data ?? []).length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconBolt size={36} stroke={1.5} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed">Niciun șablon rapid</Text>
              <Button
                size="sm"
                variant="light"
                onClick={() => navigate('/quick-expenses/new')}
                leftSection={<IconPlus size={16} />}
              >
                Adaugă primul
              </Button>
            </Stack>
          </Center>
        ) : (
          <Stack gap="xs">
            {(templates.data ?? []).map((tpl) => (
              <QuickRow
                key={tpl.id}
                template={tpl}
                qty={today.data?.get(tpl.id)?.quantity ?? 0}
                category={catById.get(tpl.category_id ?? '') ?? null}
                onStep={(delta) => step.mutate({ template: tpl, delta })}
                onEdit={() => navigate(`/quick-expenses/${tpl.id}/edit`)}
                disabled={step.isPending}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}

function QuickRow({
  template,
  qty,
  category,
  onStep,
  onEdit,
  disabled,
}: {
  template: QuickExpense;
  qty: number;
  category: { color: string; icon: string; name: string } | null;
  onStep: (delta: 1 | -1) => void;
  onEdit: () => void;
  disabled: boolean;
}) {
  const Icon = getIcon(template.icon ?? category?.icon);
  const color = category?.color ?? 'var(--mantine-color-gray-6)';
  const lineTotal = Number(template.amount) * qty;

  return (
    <Paper withBorder radius="md" p="sm">
      <Group wrap="nowrap" gap="sm" align="center">
        <Box
          onClick={onEdit}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: `${color}22`,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: '0 0 auto',
            cursor: 'pointer',
          }}
        >
          <Icon size={20} stroke={2} />
        </Box>
        <Box flex={1} miw={0} onClick={onEdit} style={{ cursor: 'pointer' }}>
          <Text fw={500} truncate>
            {template.name}
          </Text>
          <Text size="xs" c="dimmed">
            {formatMoney(Number(template.amount), template.currency)}
            {qty > 0 ? ` · azi ${formatMoney(lineTotal, template.currency)}` : ''}
          </Text>
        </Box>
        <Group gap={4} wrap="nowrap" align="center">
          <ActionIcon
            variant="default"
            radius="xl"
            size={32}
            onClick={() => onStep(-1)}
            disabled={disabled || qty === 0}
            aria-label="Scade"
          >
            <IconMinus size={16} />
          </ActionIcon>
          <Badge
            size="lg"
            variant={qty > 0 ? 'filled' : 'default'}
            radius="sm"
            color={color.startsWith('#') ? undefined : color}
            styles={
              qty > 0 && color.startsWith('#')
                ? { root: { background: color } }
                : undefined
            }
            miw={32}
            ta="center"
          >
            {qty}
          </Badge>
          <ActionIcon
            variant="filled"
            radius="xl"
            size={32}
            onClick={() => onStep(1)}
            disabled={disabled}
            aria-label="Adaugă"
            styles={color.startsWith('#') ? { root: { background: color } } : undefined}
          >
            <IconPlus size={16} />
          </ActionIcon>
        </Group>
      </Group>
    </Paper>
  );
}
