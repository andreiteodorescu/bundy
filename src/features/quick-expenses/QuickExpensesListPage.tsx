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
  IconBolt,
  IconCheck,
  IconGripVertical,
  IconMinus,
  IconPlus,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useCategories } from '@/features/categories/api';
import { formatMoney, formatRon } from '@/lib/money';
import { useFxRates } from '@/lib/useFxRates';
import { getIcon } from '@/data/icons.registry';
import {
  useQuickExpenses,
  useQuickTodayAggregates,
  useReorderQuickExpenses,
  useStepQuickExpense,
} from './api';
import type { QuickExpense } from '@/types';

export function QuickExpensesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const templates = useQuickExpenses();
  const today = useQuickTodayAggregates();
  const cats = useCategories();
  const step = useStepQuickExpense();
  const reorder = useReorderQuickExpenses();
  const fx = useFxRates((templates.data ?? []).map((t) => t.currency));

  const catById = new Map((cats.data ?? []).map((c) => [c.id, c]));

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

  const byId = new Map((templates.data ?? []).map((t) => [t.id, t]));
  const ordered: QuickExpense[] = order
    .map((id) => byId.get(id))
    .filter((t): t is QuickExpense => t !== undefined);

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
            {t('templates.back')}
          </Button>
          <Button
            size="compact-sm"
            leftSection={<IconPlus size={16} />}
            onClick={() => navigate('/quick-expenses/new')}
          >
            {t('templates.quick.newButton')}
          </Button>
        </Group>

        <Box>
          <Title order={2}>{t('templates.quick.title')}</Title>
          <Text size="sm" c="dimmed">
            {t('templates.quick.intro')}
          </Text>
        </Box>

        {todayTotal > 0 && (
          <Paper withBorder radius="md" p="sm">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                {t('templates.quick.todayTotal')}
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
        ) : ordered.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconBolt size={36} stroke={1.5} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed">{t('templates.quick.empty')}</Text>
              <Button
                size="sm"
                variant="light"
                onClick={() => navigate('/quick-expenses/new')}
                leftSection={<IconPlus size={16} />}
              >
                {t('templates.addFirst')}
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
                  {ordered.map((tpl) => (
                    <QuickRow
                      key={tpl.id}
                      template={tpl}
                      qty={today.data?.get(tpl.id)?.quantity ?? 0}
                      category={catById.get(tpl.category_id ?? '') ?? null}
                      rateRon={fx.rateOf(tpl.currency)}
                      reorderMode={reorderMode}
                      onStep={(delta) => step.mutate({ template: tpl, delta })}
                      onEdit={() => navigate(`/quick-expenses/${tpl.id}/edit`)}
                      disabled={step.isPending}
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

function QuickRow({
  template,
  qty,
  category,
  rateRon,
  reorderMode,
  onStep,
  onEdit,
  disabled,
  t,
}: {
  template: QuickExpense;
  qty: number;
  category: { color: string; icon: string; name: string } | null;
  rateRon: number | null;
  reorderMode: boolean;
  onStep: (delta: 1 | -1) => void;
  onEdit: () => void;
  disabled: boolean;
  t: TFunction;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: template.id,
    disabled: !reorderMode,
  });
  const Icon = getIcon(template.icon ?? category?.icon);
  const color = category?.color ?? 'var(--mantine-color-gray-6)';
  const lineTotal = Number(template.amount) * qty;
  const showRon = template.currency !== 'RON' && rateRon !== null;
  const unitRon = showRon ? Number(template.amount) * rateRon : null;

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
      <Group wrap="nowrap" gap="sm" align="center">
        {reorderMode && (
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            {...attributes}
            {...listeners}
            aria-label={t('templates.gripAria')}
            style={{ touchAction: 'none' }}
          >
            <IconGripVertical size={18} />
          </ActionIcon>
        )}
        <Box
          onClick={reorderMode ? undefined : onEdit}
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
          onClick={reorderMode ? undefined : onEdit}
          style={{ cursor: reorderMode ? 'default' : 'pointer' }}
        >
          <Text fw={500} truncate>
            {template.name}
          </Text>
          <Text size="xs" c="dimmed">
            {formatMoney(Number(template.amount), template.currency)}
            {showRon && unitRon !== null && ` ≈ ${formatRon(unitRon)}`}
            {qty > 0 ? ` · ${t('templates.quick.todayInline', { value: formatMoney(lineTotal, template.currency) })}` : ''}
          </Text>
        </Box>
        {!reorderMode && (
          <Group gap={4} wrap="nowrap" align="center">
            <ActionIcon
              variant="default"
              radius="xl"
              size={32}
              onClick={() => onStep(-1)}
              disabled={disabled || qty === 0}
              aria-label={t('templates.quick.decreaseAria')}
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
              aria-label={t('templates.quick.increaseAria')}
              styles={color.startsWith('#') ? { root: { background: color } } : undefined}
            >
              <IconPlus size={16} />
            </ActionIcon>
          </Group>
        )}
      </Group>
    </Paper>
  );
}
