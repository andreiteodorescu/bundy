import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoBack } from '@/lib/useGoBack';
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
  IconCheck,
  IconChevronRight,
  IconGripVertical,
  IconPencil,
  IconPin,
  IconPlus,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useCategories } from '@/features/categories/api';
import { formatMoney, formatRon } from '@/lib/money';
import { useFxRates } from '@/lib/useFxRates';
import { getIcon } from '@/data/icons.registry';
import { categoryDisplayName } from '@/i18n/displayName';
import type { Category } from '@/types';
import { useFixedExpenses, useReorderFixedExpenses } from './api';
import type { FixedExpense } from '@/types';

export function FixedExpensesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const goBack = useGoBack('/more');
  const fixed = useFixedExpenses();
  const cats = useCategories();
  const reorder = useReorderFixedExpenses();
  const fx = useFxRates((fixed.data ?? []).map((f) => f.currency));
  const [order, setOrder] = useState<string[]>([]);
  const [reorderMode, setReorderMode] = useState(false);

  useEffect(() => {
    if (fixed.data) setOrder(fixed.data.map((f) => f.id));
  }, [fixed.data]);

  useEffect(() => {
    if ((fixed.data?.length ?? 0) < 2 && reorderMode) setReorderMode(false);
  }, [fixed.data, reorderMode]);

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
  const canReorder = ordered.length > 1;

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
            {t('templates.back')}
          </Button>
        </Group>

        <Group justify="space-between" align="center">
          <Title order={2}>{t('templates.fixed.title')}</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            size="sm"
            onClick={() => navigate('/fixed-expenses/new')}
          >
            {t('templates.addBtn')}
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
              <Text c="dimmed">{t('templates.fixed.empty')}</Text>
            </Stack>
          </Center>
        ) : (
          <Stack gap="xs">
            {canReorder && (
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
                  {reorderMode ? t('templates.reorderDone') : t('templates.reorderStart')}
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
                  {ordered.map((row) => (
                    <SortableFixedRow
                      key={row.id}
                      fixed={row}
                      category={catById.get(row.category_id ?? '') ?? null}
                      rateRon={fx.rateOf(row.currency)}
                      reorderMode={reorderMode}
                      onClick={() => navigate(`/fixed-expenses/${row.id}/edit`)}
                      t={t}
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

function SortableFixedRow({
  fixed,
  category,
  rateRon,
  reorderMode,
  onClick,
  t,
}: {
  fixed: FixedExpense;
  category: Category | null;
  rateRon: number | null;
  reorderMode: boolean;
  onClick: () => void;
  t: TFunction;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: fixed.id,
    disabled: !reorderMode,
  });
  const Icon = getIcon(category?.icon);
  const color = category?.color ?? 'var(--mantine-color-gray-6)';
  const showRon = fixed.currency !== 'RON' && rateRon !== null;
  const amountRon = showRon ? Number(fixed.amount) * rateRon : null;
  const categoryName = category ? categoryDisplayName(category, t) : null;

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
              opacity: isDragging ? 0.6 : 1,
            }
          : undefined
      }
    >
      <Group wrap="nowrap" gap="sm">
        {reorderMode && (
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            aria-label={t('templates.gripAria')}
            {...attributes}
            {...listeners}
            style={{ touchAction: 'none' }}
          >
            <IconGripVertical size={18} />
          </ActionIcon>
        )}
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
        {reorderMode ? (
          <Box flex={1} miw={0}>
            <Text fw={500} truncate>
              {fixed.name}
            </Text>
            <Text size="xs" c="dimmed">
              {formatMoney(Number(fixed.amount), fixed.currency)}
              {showRon && amountRon !== null && ` ≈ ${formatRon(amountRon)}`}
              {categoryName ? ` · ${categoryName}` : ''}
            </Text>
          </Box>
        ) : (
          <UnstyledButton flex={1} miw={0} onClick={onClick}>
            <Text fw={500} truncate>
              {fixed.name}
            </Text>
            <Text size="xs" c="dimmed">
              {formatMoney(Number(fixed.amount), fixed.currency)}
              {showRon && amountRon !== null && ` ≈ ${formatRon(amountRon)}`}
              {categoryName ? ` · ${categoryName}` : ''}
            </Text>
          </UnstyledButton>
        )}
        {!reorderMode && (
          <>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              aria-label={t('templates.editAria')}
              onClick={onClick}
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
