import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ActionIcon, Group, Paper, Stack, Text, useMantineTheme } from '@mantine/core';
import {
  IconChartBar,
  IconDotsCircleHorizontal,
  IconHome,
  IconPlus,
  IconReceipt,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import classes from './BottomNav.module.css';

const items = [
  { to: '/home', labelKey: 'nav.home', Icon: IconHome },
  { to: '/expenses', labelKey: 'nav.expenses', Icon: IconReceipt },
  { to: '/analytics', labelKey: 'nav.analytics', Icon: IconChartBar },
  { to: '/more', labelKey: 'nav.more', Icon: IconDotsCircleHorizontal },
] as const;

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useMantineTheme();
  const { t } = useTranslation();

  return (
    <Paper component="nav" className={`bottom-nav ${classes.nav}`} radius={0} shadow="none">
      <Group gap={0} grow wrap="nowrap" align="stretch" h="100%">
        <NavItem item={items[0]} active={location.pathname === '/home' || location.pathname === '/'} />
        <NavItem
          item={items[1]}
          active={location.pathname.startsWith('/expenses') && location.pathname !== '/expenses/add'}
        />
        <Stack align="center" justify="center" gap={2} className={classes.fabSlot}>
          <ActionIcon
            size={56}
            radius="xl"
            variant="filled"
            color={theme.primaryColor}
            aria-label={t('nav.addExpense')}
            onClick={() => navigate('/expenses/add')}
            className={classes.fab}
          >
            <IconPlus size={28} stroke={2.6} />
          </ActionIcon>
        </Stack>
        <NavItem item={items[2]} active={location.pathname.startsWith('/analytics')} />
        <NavItem item={items[3]} active={location.pathname.startsWith('/more')} />
      </Group>
    </Paper>
  );
}

function NavItem({
  item,
  active,
}: {
  item: { to: string; labelKey: string; Icon: typeof IconHome };
  active: boolean;
}) {
  const { Icon, to, labelKey } = item;
  const { t } = useTranslation();
  return (
    <NavLink to={to} className={`${classes.item} ${active ? classes.active : ''}`}>
      <Icon size={24} stroke={active ? 2.2 : 1.7} />
      <Text size="10px" fw={active ? 600 : 500} lh={1}>
        {t(labelKey)}
      </Text>
    </NavLink>
  );
}
