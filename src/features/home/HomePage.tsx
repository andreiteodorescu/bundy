import { useNavigate } from 'react-router-dom';
import { Box, Container, Group, Paper, Stack, Text, Title, UnstyledButton } from '@mantine/core';
import {
  IconBolt,
  IconChevronRight,
  IconClipboardList,
  IconPin,
  IconPlus,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useExpensesByMonth } from '@/features/expenses/api';
import { useQuickTodayAggregates } from '@/features/quick-expenses/api';
import { ActiveBudgetBanner } from '@/features/budgets/ActiveBudgetBanner';
import { formatRon } from '@/lib/money';
import classes from './HomePage.module.css';

export function HomePage() {
  const navigate = useNavigate();
  const month = dayjs().format('YYYY-MM-DD');
  const expenses = useExpensesByMonth(month);
  const quickToday = useQuickTodayAggregates();

  const { personalTotal, companyCardTotal } = (expenses.data ?? []).reduce(
    (acc, e) => {
      const amt = Number(e.amount_ron);
      if (e.tags?.includes('company-card')) acc.companyCardTotal += amt;
      else acc.personalTotal += amt;
      return acc;
    },
    { personalTotal: 0, companyCardTotal: 0 },
  );
  const monthLabel = dayjs().format('MMMM YYYY').replace(/^./, (c) => c.toUpperCase());

  // Today's quick count (sum of quantities) — surfaced as a small hint on the Quick card
  const quickQtyToday = Array.from((quickToday.data ?? new Map()).values()).reduce(
    (s, e) => s + (e.quantity ?? 1),
    0,
  );

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Title order={2} className={classes.title}>
          Acasă
        </Title>

        <ActiveBudgetBanner />

        <UnstyledButton onClick={() => navigate('/expenses')} className={classes.totalCard}>
          <Paper withBorder radius="md" p="md">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Box miw={0} flex={1}>
                <Text size="xs" c="dimmed">
                  Total {monthLabel} · cont personal
                </Text>
                <Text fw={800} size="2rem" lh={1.1}>
                  {formatRon(personalTotal)}
                </Text>
                {companyCardTotal > 0 && (
                  <>
                    <Text size="xs" c="dimmed" mt={6}>
                      Cont firmă
                    </Text>
                    <Text fw={600} size="md" lh={1.2}>
                      {formatRon(companyCardTotal)}
                    </Text>
                  </>
                )}
              </Box>
              <IconChevronRight size={20} stroke={2} color="var(--mantine-color-dimmed)" />
            </Group>
          </Paper>
        </UnstyledButton>

        <Text size="sm" fw={600} c="dimmed" className={classes.section}>
          Adaugă cheltuială
        </Text>

        <ActionCard
          delay={1}
          accentColor="#eab308"
          icon={<IconBolt size={22} stroke={2} />}
          title="Cheltuială rapidă"
          description={
            quickQtyToday > 0
              ? `Metrou, loto, alte preț-fix · ${quickQtyToday} azi`
              : 'Metrou, loto, alte chestii cu preț fix'
          }
          onClick={() => navigate('/quick-expenses')}
        />

        <ActionCard
          delay={2}
          accentColor="#06b6d4"
          icon={<IconClipboardList size={22} stroke={2} />}
          title="Cheltuială predefinită"
          description="Comandă Freshful, cursă Bolt — doar suma se schimbă"
          onClick={() => navigate('/predefined-expenses')}
        />

        <ActionCard
          delay={3}
          accentColor="#22c55e"
          icon={<IconPin size={22} stroke={2} />}
          title="Cheltuială fixă"
          description="Chirie sau alte plăți cu sumă fixă"
          onClick={() => navigate('/fixed-expenses/quick-add')}
        />

        <ActionCard
          delay={4}
          accentColor="#f97316"
          icon={<IconPlus size={22} stroke={2.4} />}
          title="Cheltuială nouă"
          description="Sumă, dată, categorie — completate manual"
          onClick={() => navigate('/expenses/add')}
        />
      </Stack>
    </Container>
  );
}

function ActionCard({
  delay,
  accentColor,
  icon,
  title,
  description,
  onClick,
}: {
  delay: 1 | 2 | 3 | 4;
  accentColor: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <UnstyledButton onClick={onClick} className={`${classes.card} ${classes[`d${delay}`]}`}>
      <Paper withBorder radius="md" p="md">
        <Group wrap="nowrap" gap="md">
          <Box
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: `${accentColor}22`,
              color: accentColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: '0 0 auto',
            }}
          >
            {icon}
          </Box>
          <Box flex={1} miw={0}>
            <Text fw={600}>{title}</Text>
            <Text size="xs" c="dimmed" lineClamp={2}>
              {description}
            </Text>
          </Box>
          <IconChevronRight size={18} color="var(--mantine-color-dimmed)" />
        </Group>
      </Paper>
    </UnstyledButton>
  );
}
