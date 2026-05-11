import { useNavigate } from 'react-router-dom';
import { Box, Container, Group, Paper, Stack, Text, UnstyledButton } from '@mantine/core';
import {
  IconBolt,
  IconChevronRight,
  IconClipboardList,
  IconPin,
  IconPlus,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useExpensesByMonth } from '@/features/expenses/api';
import { useQuickTodayAggregates } from '@/features/quick-expenses/api';
import { ActiveBudgetBanner } from '@/features/budgets/ActiveBudgetBanner';
import { useCompanyCardEnabled } from '@/features/settings/api';
import { formatRon } from '@/lib/money';
import classes from './HomePage.module.css';

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const month = dayjs().format('YYYY-MM-DD');
  const expenses = useExpensesByMonth(month);
  const quickToday = useQuickTodayAggregates();

  const companyCardEnabled = useCompanyCardEnabled();
  const { personalTotal, companyCardTotal } = (expenses.data ?? []).reduce(
    (acc, e) => {
      const amt = Number(e.amount_ron);
      if (companyCardEnabled && e.tags?.includes('company-card')) {
        acc.companyCardTotal += amt;
      } else {
        acc.personalTotal += amt;
      }
      return acc;
    },
    { personalTotal: 0, companyCardTotal: 0 },
  );
  const monthLabel = dayjs().format('MMMM YYYY').replace(/^./, (c) => c.toUpperCase());

  const quickQtyToday = Array.from((quickToday.data ?? new Map()).values()).reduce(
    (s, e) => s + (e.quantity ?? 1),
    0,
  );

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <ActiveBudgetBanner />

        <UnstyledButton onClick={() => navigate('/expenses')} className={classes.totalCard}>
          <Paper withBorder radius="md" p="md">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Box miw={0} flex={1}>
                <Text size="xs" c="dimmed">
                  {t('home.totalPersonal', { month: monthLabel })}
                </Text>
                <Text fw={800} size="2rem" lh={1.1}>
                  {formatRon(personalTotal)}
                </Text>
                {companyCardTotal > 0 && (
                  <>
                    <Text size="xs" c="dimmed" mt={6}>
                      {t('home.totalCompany')}
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
          {t('home.addExpense')}
        </Text>

        <ActionCard
          delay={1}
          accentColor="#eab308"
          icon={<IconBolt size={22} stroke={2} />}
          title={t('home.quickTitle')}
          description={
            quickQtyToday > 0
              ? t('home.quickDescriptionWithCount', { count: quickQtyToday })
              : t('home.quickDescription')
          }
          onClick={() => navigate('/quick-expenses')}
        />

        <ActionCard
          delay={2}
          accentColor="#06b6d4"
          icon={<IconClipboardList size={22} stroke={2} />}
          title={t('home.predefinedTitle')}
          description={t('home.predefinedDescription')}
          onClick={() => navigate('/predefined-expenses')}
        />

        <ActionCard
          delay={3}
          accentColor="#22c55e"
          icon={<IconPin size={22} stroke={2} />}
          title={t('home.fixedTitle')}
          description={t('home.fixedDescription')}
          onClick={() => navigate('/fixed-expenses/quick-add')}
        />

        <ActionCard
          delay={4}
          accentColor="#f97316"
          icon={<IconPlus size={22} stroke={2.4} />}
          title={t('home.manualTitle')}
          description={t('home.manualDescription')}
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
