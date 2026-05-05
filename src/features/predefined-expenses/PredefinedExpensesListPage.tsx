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
  IconCheck,
  IconChevronRight,
  IconClipboardList,
  IconGripVertical,
  IconPencil,
  IconPlus,
} from '@tabler/icons-react';
import { useCategories, useSubcategories } from '@/features/categories/api';
import { getIcon } from '@/data/icons.registry';
import { usePredefinedExpenses, useReorderPredefined } from './api';
import type { Category, PredefinedExpense, Subcategory } from '@/types';

export function PredefinedExpensesListPage() {
  const navigate = useNavigate();
  const templates = usePredefinedExpenses();
  const cats = useCategories();
  const subs = useSubcategories();
  const reorder = useReorderPredefined();
  const catById = new Map((cats.data ?? []).map((c) => [c.id, c]));
  const subById = new Map((subs.data ?? []).map((s) => [s.id, s]));

  const [order, setOrder] = useState<string[]>([]);
  const [reorderMode, setReorderMode] = useState(false);
  useEffect(() => {
    if (templates.data) setOrder(templates.data.map((t) => t.id));
  }, [templates.data]);

  useEffect(() => {
    if ((templates.data?.length ?? 0) < 2 && reorderMode) setReorderMode(false);
  }, [templates.data, reorderMode]);

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

  function pickTemplate(t: PredefinedExpense) {
    navigate(`/expenses/add?predefined=${t.id}`);
  }

  const byId = new Map((templates.data ?? []).map((t) => [t.id, t]));
  const ordered: PredefinedExpense[] = order
    .map((id) => byId.get(id))
    .filter((t): t is PredefinedExpense => t !== undefined);

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
            onClick={() => navigate('/predefined-expenses/new')}
          >
            Șablon nou
          </Button>
        </Group>

        <Box>
          <Title order={2}>Cheltuială predefinită</Title>
          <Text size="sm" c="dimmed">
            Tap pe un șablon → formularul de adăugare se deschide cu nume + categorie deja
            completate. Doar suma rămâne de introdus. Pentru editare folosește iconița creion.
          </Text>
        </Box>

        {templates.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : ordered.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconClipboardList size={36} stroke={1.5} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed">Niciun șablon predefinit</Text>
              <Button
                size="sm"
                variant="light"
                onClick={() => navigate('/predefined-expenses/new')}
                leftSection={<IconPlus size={16} />}
              >
                Adaugă primul
              </Button>
            </Stack>
          </Center>
        ) : (
          <Stack gap="xs">
            {ordered.length > 1 && (
              <Group justify="flex-start">
                <Button
                  variant={reorderMode ? 'filled' : 'subtle'}
                  color={reorderMode ? 'accent' : 'gray'}
                  size="compact-xs"
                  leftSection={
                    reorderMode ? <IconCheck size={14} /> : <IconGripVertical size={14} />
                  }
                  onClick={() => setReorderMode((v) => !v)}
                >
                  {reorderMode ? 'Termină reordonarea' : 'Reordonează'}
                </Button>
              </Group>
            )}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={order} strategy={verticalListSortingStrategy}>
                <Stack gap="xs">
                  {ordered.map((tpl) => (
                    <SortablePredefinedRow
                      key={tpl.id}
                      tpl={tpl}
                      category={catById.get(tpl.category_id ?? '') ?? null}
                      subcategory={subById.get(tpl.subcategory_id ?? '') ?? null}
                      reorderMode={reorderMode}
                      onUse={() => pickTemplate(tpl)}
                      onEdit={() => navigate(`/predefined-expenses/${tpl.id}/edit`)}
                    />
                  ))}
                </Stack>
              </SortableContext>
            </DndContext>
          </Stack>
        )}
      </Stack>
    </Container>
  );
}

function SortablePredefinedRow({
  tpl,
  category,
  subcategory,
  reorderMode,
  onUse,
  onEdit,
}: {
  tpl: PredefinedExpense;
  category: Category | null;
  subcategory: Subcategory | null;
  reorderMode: boolean;
  onUse: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tpl.id,
    disabled: !reorderMode,
  });
  const Icon = getIcon(tpl.icon ?? category?.icon);
  const color = category?.color ?? 'var(--mantine-color-gray-6)';

  return (
    <Paper
      ref={setNodeRef}
      withBorder
      radius="md"
      p="sm"
      style={
        reorderMode
          ? {
              transform: CSS.Transform.toString(transform),
              transition,
              opacity: isDragging ? 0.6 : tpl.active ? 1 : 0.5,
              touchAction: 'none',
            }
          : { opacity: tpl.active ? 1 : 0.5 }
      }
    >
      <Group wrap="nowrap" gap="sm">
        {reorderMode && (
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            {...attributes}
            {...listeners}
            aria-label="Trage pentru reordonare"
          >
            <IconGripVertical size={18} />
          </ActionIcon>
        )}
        <Box
          onClick={reorderMode ? undefined : onUse}
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
            cursor: reorderMode ? 'default' : 'pointer',
          }}
        >
          <Icon size={20} stroke={2} />
        </Box>
        <Box
          flex={1}
          miw={0}
          onClick={reorderMode ? undefined : onUse}
          style={{ cursor: reorderMode ? 'default' : 'pointer' }}
        >
          <Text fw={600} truncate>
            {tpl.name}
          </Text>
          <Text size="xs" c="dimmed">
            {category?.name ?? 'Fără categorie'}
            {subcategory ? ` › ${subcategory.name}` : ''}
            {' · '}{tpl.default_currency}
          </Text>
        </Box>
        {!reorderMode && (
          <>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              aria-label="Editează șablon"
              onClick={onEdit}
            >
              <IconPencil size={18} />
            </ActionIcon>
            <IconChevronRight size={18} />
          </>
        )}
      </Group>
    </Paper>
  );
}
