import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ActionIcon, Group, Paper, Stack, Text, useMantineTheme } from '@mantine/core';
import {
  IconChartBar,
  IconDotsCircleHorizontal,
  IconHome,
  IconPlus,
  IconReceipt,
} from '@tabler/icons-react';
import classes from './BottomNav.module.css';

/**
 * 5-slot bottom navigation:
 *   Acasă · Cheltuieli · (+) FAB · Analytics · Mai mult
 *
 * (+) FAB navigates directly to /expenses/add (manual form). The home page hub
 * exposes the other entry points (rapidă, predefinită, fixă) as cards.
 *
 * Bugete a fost mutat în drawer-ul "Mai mult" pentru că bugetul activ apare deja
 * ca banner pe pagina Acasă.
 */
const items = [
  { to: '/home', label: 'Acasă', Icon: IconHome },
  { to: '/expenses', label: 'Cheltuieli', Icon: IconReceipt },
  { to: '/analytics', label: 'Analytics', Icon: IconChartBar },
  { to: '/more', label: 'Mai mult', Icon: IconDotsCircleHorizontal },
] as const;

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useMantineTheme();

  return (
    <Paper component="nav" className={`bottom-nav ${classes.nav}`} radius={0} shadow="md">
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
            aria-label="Adaugă cheltuială nouă"
            onClick={() => navigate('/expenses/add')}
            className={classes.fab}
          >
            <IconPlus size={28} stroke={2.4} />
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
  item: { to: string; label: string; Icon: typeof IconHome };
  active: boolean;
}) {
  const { Icon, to, label } = item;
  // iOS WebKit in PWA standalone has bugs propagating currentColor to <svg>
  // nested in <a>. Pass explicit `color` prop on the Tabler icon so stroke
  // is set inline on the SVG element, bypassing the color-inheritance chain.
  const iconColor = active ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-dimmed)';
  return (
    <NavLink to={to} className={`${classes.item} ${active ? classes.active : ''}`}>
      <Icon size={22} stroke={active ? 2.2 : 1.8} color={iconColor} />
      <Text size="xs" mt={2} fw={active ? 600 : 400}>
        {label}
      </Text>
    </NavLink>
  );
}
