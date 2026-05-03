import { useNavigate } from 'react-router-dom';
import {
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
  IconArrowLeft,
  IconChevronRight,
  IconClipboardList,
  IconPlus,
} from '@tabler/icons-react';
import { useCategories, useSubcategories } from '@/features/categories/api';
import { getIcon } from '@/data/icons.registry';
import { usePredefinedExpenses } from './api';
import type { PredefinedExpense } from '@/types';

export function PredefinedExpensesListPage() {
  const navigate = useNavigate();
  const templates = usePredefinedExpenses();
  const cats = useCategories();
  const subs = useSubcategories();
  const catById = new Map((cats.data ?? []).map((c) => [c.id, c]));
  const subById = new Map((subs.data ?? []).map((s) => [s.id, s]));

  function pickTemplate(t: PredefinedExpense) {
    navigate(`/expenses/add?predefined=${t.id}`);
  }

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
            completate. Doar suma rămâne de introdus.
          </Text>
        </Box>

        {templates.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : (templates.data ?? []).length === 0 ? (
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
            {(templates.data ?? []).map((tpl) => {
              const category = catById.get(tpl.category_id ?? '') ?? null;
              const subcategoryName = subById.get(tpl.subcategory_id ?? '')?.name ?? null;
              const Icon = getIcon(tpl.icon ?? category?.icon);
              const color = category?.color ?? 'var(--mantine-color-gray-6)';
              return (
                <UnstyledButton key={tpl.id} onClick={() => pickTemplate(tpl)} disabled={!tpl.active}>
                  <Paper
                    withBorder
                    radius="md"
                    p="md"
                    style={{ opacity: tpl.active ? 1 : 0.5 }}
                  >
                    <Group wrap="nowrap" gap="sm">
                      <Box
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
                        }}
                      >
                        <Icon size={20} stroke={2} />
                      </Box>
                      <Box flex={1} miw={0}>
                        <Text fw={600} truncate>
                          {tpl.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {category?.name ?? 'Fără categorie'}
                          {subcategoryName ? ` › ${subcategoryName}` : ''}
                          {' · '}{tpl.default_currency}
                        </Text>
                      </Box>
                      <IconChevronRight size={18} />
                    </Group>
                  </Paper>
                </UnstyledButton>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
