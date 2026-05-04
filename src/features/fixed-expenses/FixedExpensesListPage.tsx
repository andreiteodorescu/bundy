import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
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
import {
  IconArrowLeft,
  IconChevronRight,
  IconGripVertical,
  IconPencil,
  IconPin,
  IconPlus,
} from '@tabler/icons-react';
import { useCategories } from '@/features/categories/api';
import { formatMoney, formatRon } from '@/lib/money';
import { useFxRates } from '@/lib/useFxRates';
import { getIcon } from '@/data/icons.registry';
import { useFixedExpenses, useReorderFixedExpenses } from './api';
import type { FixedExpense } from '@/types';

export function FixedExpensesListPage() {
  const navigate = useNavigate();
  const fixed = useFixedExpenses();
  const cats = useCategories();
  const reorder = useReorderFixedExpenses();
  const fx = useFxRates((fixed.data ?? []).map((f) => f.currency));
  const [order, setOrder] = useState<string[]>([]);

  useEffect(() => {
    if (fixed.data) setOrder(fixed.data.map((f) => f.id));
  }, [fixed.data]);

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

  const byId = new Map((fixed.data ?? []).map((f) => [f.id, f]));
  const ordered: FixedExpense[] = order
    .map((id) => byId.get(id))
    .filter((f): f is FixedExpense => f !== undefined);
  const catById = new Map((cats.data ?? []).map((c) => [c.id, c]));

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
          <Title order={2}>Cheltuieli fixe</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            size="sm"
            onClick={() => navigate('/fixed-expenses/new')}
          >
            Adaugă
          </Button>
        </Group>

        {fixed.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : ordered.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconPin size={36} stroke={1.5} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed">Niciun șablon definit</Text>
            </Stack>
          </Center>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              <Stack gap="xs">
                {ordered.map((row) => (
                  <SortableFixedRow
                    key={row.id}
                    fixed={row}
                    category={catById.get(row.category_id ?? '') ?? null}
                    rateRon={fx.rateOf(row.currency)}
                    onClick={() => navigate(`/fixed-expenses/${row.id}/edit`)}
                  />
                ))}
              </Stack>
            </SortableContext>
          </DndContext>
        )}
      </Stack>
    </Container>
  );
}

function SortableFixedRow({
  fixed,
  category,
  rateRon,
  onClick,
}: {
  fixed: FixedExpense;
  category: { color: string; icon: string; name: string } | null;
  rateRon: number | null;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: fixed.id,
  });
  const Icon = getIcon(category?.icon);
  const color = category?.color ?? 'var(--mantine-color-gray-6)';
  const showRon = fixed.currency !== 'RON' && rateRon !== null;
  const amountRon = showRon ? Number(fixed.amount) * rateRon : null;

  return (
    <Paper
      ref={setNodeRef}
      withBorder
      radius="md"
      p="sm"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        touchAction: 'none',
      }}
    >
      <Group wrap="nowrap" gap="sm">
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          className="reorder-grip"
          aria-label="Trage pentru reordonare"
          {...attributes}
          {...listeners}
        >
          <IconGripVertical size={18} />
        </ActionIcon>
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
        <UnstyledButton flex={1} miw={0} onClick={onClick}>
          <Text fw={500} truncate>
            {fixed.name}
          </Text>
          <Text size="xs" c="dimmed">
            {formatMoney(Number(fixed.amount), fixed.currency)}
            {showRon && amountRon !== null && ` ≈ ${formatRon(amountRon)}`}
            {category ? ` · ${category.name}` : ''}
          </Text>
        </UnstyledButton>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          aria-label="Editează șablon"
          onClick={onClick}
        >
          <IconPencil size={18} />
        </ActionIcon>
        <IconChevronRight size={18} />
      </Group>
    </Paper>
  );
}
