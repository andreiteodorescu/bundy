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
import { IconArrowLeft, IconChevronRight, IconGripVertical, IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useCategories, useReorderCategories, useSubcategories } from './api';
import { useGoBack } from '@/lib/useGoBack';
import { getIcon } from '@/data/icons.registry';
import { categoryDisplayName } from '@/i18n/displayName';
import type { Category } from '@/types';

export function CategoriesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const goBack = useGoBack('/more');
  const cats = useCategories();
  const subs = useSubcategories();
  const reorder = useReorderCategories();
  const [order, setOrder] = useState<string[]>([]);

  useEffect(() => {
    if (cats.data) setOrder(cats.data.map((c) => c.id));
  }, [cats.data]);

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

  if (cats.isLoading) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );
  }

  const byId = new Map((cats.data ?? []).map((c) => [c.id, c]));
  const ordered: Category[] = order
    .map((id) => byId.get(id))
    .filter((c): c is Category => c !== undefined);

  const subsByCat = new Map<string, number>();
  for (const s of subs.data ?? []) {
    subsByCat.set(s.parent_category_id, (subsByCat.get(s.parent_category_id) ?? 0) + 1);
  }

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Group gap="xs">
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
            onClick={goBack}
          >
            {t('common.back')}
          </Button>
        </Group>
        <Group justify="space-between" align="center">
          <Title order={2}>{t('categories.listTitle')}</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => navigate('/categories/new')}
            size="sm"
          >
            {t('categories.addButton')}
          </Button>
        </Group>
        <Text size="sm" c="dimmed">
          {t('categories.reorderHint')}
        </Text>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <Stack gap="xs">
              {ordered.map((cat) => (
                <SortableCategoryRow
                  key={cat.id}
                  category={cat}
                  subcount={subsByCat.get(cat.id) ?? 0}
                  onClick={() => navigate(`/categories/${cat.id}/edit`)}
                  t={t}
                />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
      </Stack>
    </Container>
  );
}

function SortableCategoryRow({
  category,
  subcount,
  onClick,
  t,
}: {
  category: Category;
  subcount: number;
  onClick: () => void;
  t: TFunction;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });
  const Icon = getIcon(category.icon);

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
      }}
    >
      <Group wrap="nowrap" gap="sm">
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          {...attributes}
          {...listeners}
          aria-label={t('categories.gripAria')}
          /* touch-action: none ONLY on the grip handle so vertical scroll on
             the row body still works on iOS / mobile. dnd-kit's PointerSensor
             attaches its move listener to where {...listeners} is spread, so
             this is the only element that needs the touch-action override. */
          style={{ touchAction: 'none' }}
        >
          <IconGripVertical size={18} />
        </ActionIcon>
        <Box
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: `${category.color}33`,
            color: category.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: '0 0 auto',
          }}
        >
          <Icon size={20} stroke={2} />
        </Box>
        <Box flex={1} onClick={onClick} style={{ cursor: 'pointer', minWidth: 0 }}>
          <Text fw={500} truncate>
            {categoryDisplayName(category, t)}
          </Text>
          <Text size="xs" c="dimmed">
            {t('categories.subcount', { count: subcount })}
          </Text>
        </Box>
        <ActionIcon variant="subtle" color="gray" onClick={onClick} aria-label={t('categories.editAria')}>
          <IconChevronRight size={18} />
        </ActionIcon>
      </Group>
    </Paper>
  );
}
