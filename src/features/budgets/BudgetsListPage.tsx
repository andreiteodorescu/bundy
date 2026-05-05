import { useEffect, useState } from 'react';
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
  Progress,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import dayjs from 'dayjs';
import {
  IconArchive,
  IconCheck,
  IconChevronRight,
  IconGripVertical,
  IconPlus,
  IconWalletOff,
} from '@tabler/icons-react';
import { ARCHIVE_THRESHOLD_DAYS } from './BudgetsArchivePage';
import { formatRon } from '@/lib/money';
import { useBudgets, useReorderBudgets } from './api';
import { useCategories, useSubcategories } from '@/features/categories/api';
import { BudgetProgressBar } from './BudgetProgressBar';
import type { Budget, Category, Subcategory } from '@/types';

export function BudgetsListPage() {
  const navigate = useNavigate();
  const budgets = useBudgets();
  const cats = useCategories();
  const subs = useSubcategories();
  const catById = new Map((cats.data ?? []).map((c) => [c.id, c]));
  const subById = new Map((subs.data ?? []).map((s) => [s.id, s]));
  const [reorderMode, setReorderMode] = useState(false);

  const today = dayjs().format('YYYY-MM-DD');
  const archiveCutoff = dayjs(today).subtract(ARCHIVE_THRESHOLD_DAYS, 'day').format('YYYY-MM-DD');
  const active: Budget[] = [];
  const upcoming: Budget[] = [];
  const past: Budget[] = [];
  const archived: Budget[] = [];
  for (const b of budgets.data ?? []) {
    const lastDay = b.selected_days?.length
      ? b.selected_days[b.selected_days.length - 1]
      : b.period_end;
    if (b.selected_days?.length) {
      if (b.selected_days.includes(today)) active.push(b);
      else if (lastDay >= today) upcoming.push(b);
      else if (lastDay >= archiveCutoff) past.push(b);
      else archived.push(b);
    } else {
      if (today >= b.period_start && today <= b.period_end) active.push(b);
      else if (today < b.period_start) upcoming.push(b);
      else if (b.period_end >= archiveCutoff) past.push(b);
      else archived.push(b);
    }
  }

  // Reorder mode auto-disables when there's nothing to reorder (or budgets reload empty)
  useEffect(() => {
    if (active.length < 2 && reorderMode) setReorderMode(false);
  }, [active.length, reorderMode]);

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Group justify="space-between" align="center" mb={12}>
          <Title order={2}>Bugete</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            size="sm"
            onClick={() => navigate('/budgets/new')}
          >
            Adaugă
          </Button>
        </Group>

        {budgets.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : (budgets.data ?? []).length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconWalletOff size={36} stroke={1.5} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed">Niciun buget</Text>
            </Stack>
          </Center>
        ) : (
          <Stack gap="md">
            {active.length > 0 && (
              <ActiveBudgetsSection
                budgets={active}
                navigate={navigate}
                catById={catById}
                subById={subById}
                reorderMode={reorderMode}
                onToggleReorder={() => setReorderMode((v) => !v)}
              />
            )}
            {upcoming.length > 0 && (
              <Section title="Următoare" budgets={upcoming} navigate={navigate} catById={catById} subById={subById} />
            )}
            {past.length > 0 && (
              <Section title="Trecute" budgets={past} navigate={navigate} catById={catById} subById={subById} dim />
            )}
            {archived.length > 0 && (
              <UnstyledButton
                onClick={() => navigate('/budgets/archive')}
                px="md"
                py="sm"
                style={{
                  borderRadius: 8,
                  border: '1px solid var(--mantine-color-default-border)',
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Group gap={8} wrap="nowrap">
                    <IconArchive size={18} />
                    <Box>
                      <Text size="sm" fw={600}>
                        Arhivă bugete
                      </Text>
                      <Text size="xs" c="dimmed">
                        {archived.length}{' '}
                        {archived.length === 1 ? 'buget arhivat' : 'bugete arhivate'}
                      </Text>
                    </Box>
                  </Group>
                  <IconChevronRight size={16} color="var(--mantine-color-dimmed)" />
                </Group>
              </UnstyledButton>
            )}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}

/**
 * Active budgets section. Supports manual reorder via a toggle: by default the rows
 * render normally (no grip handles, full row click → edit). When reorder mode is on,
 * each row gets a grip handle on the left and clicking the row body is disabled —
 * grip drag persists `sort_order` to DB on drop. The carousel `ActiveBudgetBanner`
 * reads from the same `useBudgets` query so the new order takes effect immediately.
 */
function ActiveBudgetsSection({
  budgets,
  navigate,
  catById,
  subById,
  reorderMode,
  onToggleReorder,
}: {
  budgets: Budget[];
  navigate: (to: string) => void;
  catById: Map<string, Category>;
  subById: Map<string, Subcategory>;
  reorderMode: boolean;
  onToggleReorder: () => void;
}) {
  const reorder = useReorderBudgets();
  const [order, setOrder] = useState<string[]>([]);
  useEffect(() => {
    setOrder(budgets.map((b) => b.id));
  }, [budgets]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as string);
    const newIndex = order.indexOf(over.id as string);
    const next = arrayMove(order, oldIndex, newIndex);
    setOrder(next);
    reorder.mutate(next);
  }

  const byId = new Map(budgets.map((b) => [b.id, b]));
  const ordered = order.map((id) => byId.get(id)).filter((b): b is Budget => Boolean(b));
  const canReorder = budgets.length > 1;

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="center" px={4} wrap="nowrap">
        <Text size="sm" fw={600} c="accent">
          Active
        </Text>
        {canReorder && (
          <Button
            variant={reorderMode ? 'filled' : 'subtle'}
            color={reorderMode ? 'accent' : 'gray'}
            size="compact-xs"
            leftSection={
              reorderMode ? <IconCheck size={14} /> : <IconGripVertical size={14} />
            }
            onClick={onToggleReorder}
          >
            {reorderMode ? 'Termină reordonarea' : 'Reordonează'}
          </Button>
        )}
      </Group>
      {reorderMode ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <Stack gap="xs">
              {ordered.map((b) => (
                <SortableBudgetRow
                  key={b.id}
                  budget={b}
                  catById={catById}
                  subById={subById}
                />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
      ) : (
        <Stack gap="xs">
          {ordered.map((b) => (
            <BudgetRow
              key={b.id}
              budget={b}
              catById={catById}
              subById={subById}
              onClick={() => navigate(`/budgets/${b.id}/edit`)}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function SortableBudgetRow({
  budget,
  catById,
  subById,
}: {
  budget: Budget;
  catById: Map<string, Category>;
  subById: Map<string, Subcategory>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: budget.id,
  });
  return (
    <Paper
      ref={setNodeRef}
      withBorder
      radius="md"
      p="md"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        touchAction: 'none',
      }}
    >
      <Group wrap="nowrap" gap="sm" align="flex-start">
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          {...attributes}
          {...listeners}
          aria-label="Trage pentru reordonare"
          mt={2}
        >
          <IconGripVertical size={18} />
        </ActionIcon>
        <Box flex={1} miw={0}>
          <BudgetRowBody budget={budget} catById={catById} subById={subById} />
        </Box>
      </Group>
    </Paper>
  );
}

function BudgetRow({
  budget,
  catById,
  subById,
  onClick,
  dim = false,
}: {
  budget: Budget;
  catById: Map<string, Category>;
  subById: Map<string, Subcategory>;
  onClick: () => void;
  dim?: boolean;
}) {
  return (
    <UnstyledButton onClick={onClick}>
      <Paper withBorder radius="md" p="md" style={dim ? { opacity: 0.6 } : undefined}>
        <BudgetRowBody budget={budget} catById={catById} subById={subById} />
      </Paper>
    </UnstyledButton>
  );
}

function BudgetRowBody({
  budget: b,
  catById,
  subById,
}: {
  budget: Budget;
  catById: Map<string, Category>;
  subById: Map<string, Subcategory>;
}) {
  return (
    <Box>
      <Group justify="space-between" mb={4}>
        <Text fw={600}>{b.name}</Text>
        <Text fw={700}>{formatRon(Number(b.amount_ron))}</Text>
      </Group>
      <Text size="xs" c="dimmed" mb={6}>
        {b.selected_days?.length
          ? `${dayjs(b.period_start).format('D MMM')} – ${dayjs(b.period_end).format('D MMM YYYY')} · ${b.selected_days.length} zile`
          : `${dayjs(b.period_start).format('D MMM')} – ${dayjs(b.period_end).format('D MMM YYYY')}`}
      </Text>
      {(b.category_ids?.length ?? 0) + (b.subcategory_ids?.length ?? 0) > 0 && (
        <Group gap={4} mb="xs" wrap="wrap">
          {(b.category_ids ?? []).map((cid) => {
            const c = catById.get(cid);
            if (!c) return null;
            return (
              <Badge
                key={`c-${cid}`}
                size="xs"
                variant="light"
                styles={{ root: { background: `${c.color}22`, color: c.color } }}
              >
                {c.name}
              </Badge>
            );
          })}
          {(b.subcategory_ids ?? []).map((sid) => {
            const s = subById.get(sid);
            if (!s) return null;
            const parent = catById.get(s.parent_category_id);
            const color = s.color ?? parent?.color ?? 'gray';
            return (
              <Badge
                key={`s-${sid}`}
                size="xs"
                variant="dot"
                styles={{ root: { borderColor: color, color } }}
              >
                {s.name}
              </Badge>
            );
          })}
        </Group>
      )}
      <BudgetProgressBar budget={b} />
    </Box>
  );
}

function Section({
  title,
  budgets,
  navigate,
  catById,
  subById,
  highlight = false,
  dim = false,
  hideTitle = false,
}: {
  title: string;
  budgets: Budget[];
  navigate: (to: string) => void;
  catById: Map<string, Category>;
  subById: Map<string, Subcategory>;
  highlight?: boolean;
  dim?: boolean;
  hideTitle?: boolean;
}) {
  return (
    <Stack gap="xs">
      {!hideTitle && (
        <Text size="sm" fw={600} c={highlight ? 'accent' : dim ? 'dimmed' : undefined} px={4}>
          {title}
        </Text>
      )}
      <Stack gap="xs">
        {budgets.map((b) => (
          <BudgetRow
            key={b.id}
            budget={b}
            catById={catById}
            subById={subById}
            onClick={() => navigate(`/budgets/${b.id}/edit`)}
            dim={dim}
          />
        ))}
      </Stack>
    </Stack>
  );
}

// Re-export so consumers can import { Progress } here if needed
export { Progress };
