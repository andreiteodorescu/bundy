import { useNavigate } from 'react-router-dom';
import {
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
import dayjs from 'dayjs';
import { IconPlus, IconWalletOff } from '@tabler/icons-react';
import { formatRon } from '@/lib/money';
import { useBudgets } from './api';
import { BudgetProgressBar } from './BudgetProgressBar';
import type { Budget } from '@/types';

export function BudgetsListPage() {
  const navigate = useNavigate();
  const budgets = useBudgets();

  const today = dayjs().format('YYYY-MM-DD');
  const active: Budget[] = [];
  const upcoming: Budget[] = [];
  const past: Budget[] = [];
  for (const b of budgets.data ?? []) {
    if (b.selected_days?.length) {
      if (b.selected_days.includes(today)) active.push(b);
      else if (b.selected_days[b.selected_days.length - 1] >= today) upcoming.push(b);
      else past.push(b);
    } else {
      if (today >= b.period_start && today <= b.period_end) active.push(b);
      else if (today < b.period_start) upcoming.push(b);
      else past.push(b);
    }
  }

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Group justify="space-between" align="center">
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
              <Section title="Active" budgets={active} navigate={navigate} highlight />
            )}
            {upcoming.length > 0 && (
              <Section title="Următoare" budgets={upcoming} navigate={navigate} />
            )}
            {past.length > 0 && (
              <Section title="Trecute" budgets={past} navigate={navigate} dim />
            )}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}

function Section({
  title,
  budgets,
  navigate,
  highlight = false,
  dim = false,
}: {
  title: string;
  budgets: Budget[];
  navigate: (to: string) => void;
  highlight?: boolean;
  dim?: boolean;
}) {
  return (
    <Stack gap="xs">
      <Text size="sm" fw={600} c={highlight ? 'accent' : dim ? 'dimmed' : undefined} px={4}>
        {title}
      </Text>
      <Stack gap="xs">
        {budgets.map((b) => (
          <UnstyledButton key={b.id} onClick={() => navigate(`/budgets/${b.id}/edit`)}>
            <Paper withBorder radius="md" p="md" style={dim ? { opacity: 0.6 } : undefined}>
              <Box>
                <Group justify="space-between" mb={4}>
                  <Text fw={600}>{b.name}</Text>
                  <Text fw={700}>{formatRon(Number(b.amount_ron))}</Text>
                </Group>
                <Text size="xs" c="dimmed" mb="xs">
                  {b.selected_days?.length
                    ? `${dayjs(b.period_start).format('D MMM')} – ${dayjs(b.period_end).format('D MMM YYYY')} · ${b.selected_days.length} zile`
                    : `${dayjs(b.period_start).format('D MMM')} – ${dayjs(b.period_end).format('D MMM YYYY')}`}
                </Text>
                <BudgetProgressBar budget={b} />
              </Box>
            </Paper>
          </UnstyledButton>
        ))}
      </Stack>
    </Stack>
  );
}

// Re-export so consumers can import { Progress } here if needed
export { Progress };
