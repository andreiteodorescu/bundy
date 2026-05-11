import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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

  const navRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([null, null, null, null]);
  const [indicator, setIndicator] = useState<{ x: number; w: number; visible: boolean }>({
    x: 0,
    w: 0,
    visible: false,
  });

  const activeIdx = useMemo(() => {
    const p = location.pathname;
    if (p === '/home' || p === '/') return 0;
    if (p.startsWith('/expenses') && p !== '/expenses/add') return 1;
    if (p.startsWith('/analytics')) return 2;
    if (p.startsWith('/more')) return 3;
    return -1;
  }, [location.pathname]);

  /**
   * Horizontal inset between the ball and the tab edges. Without this, the
   * first/last tab's ball touches the nav border. 8px keeps a comfortable
   * gap on every tab regardless of its position.
   */
  const HORIZONTAL_INSET = 8;

  const recalc = useCallback(() => {
    if (activeIdx < 0) {
      setIndicator((s) => ({ ...s, visible: false }));
      return;
    }
    const itemEl = itemRefs.current[activeIdx];
    const navEl = navRef.current;
    if (!itemEl || !navEl) return;
    const itemRect = itemEl.getBoundingClientRect();
    const navRect = navEl.getBoundingClientRect();
    setIndicator({
      x: itemRect.left - navRect.left + HORIZONTAL_INSET,
      w: Math.max(0, itemRect.width - HORIZONTAL_INSET * 2),
      visible: true,
    });
  }, [activeIdx]);

  // Reposition on active change. useLayoutEffect so it happens before paint
  // and the indicator never visually lags by a frame.
  useLayoutEffect(() => {
    recalc();
  }, [recalc]);

  // Reposition on viewport resize so the ball stays under the active tab
  // when the layout reflows (e.g. orientation change).
  useEffect(() => {
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [recalc]);

  const indicatorStyle: React.CSSProperties = {
    transform: `translateX(${indicator.x}px)`,
    width: indicator.w,
    opacity: indicator.visible ? 1 : 0,
  };

  return (
    <Paper
      component="nav"
      ref={navRef as unknown as React.Ref<HTMLDivElement>}
      className={`bottom-nav ${classes.nav}`}
      radius={0}
      shadow="none"
    >
      <span className={classes.indicator} style={indicatorStyle} aria-hidden />

      <Group gap={0} grow wrap="nowrap" align="stretch" h="100%" pos="relative">
        <NavItem
          ref={(el) => {
            itemRefs.current[0] = el;
          }}
          item={items[0]}
          active={activeIdx === 0}
        />
        <NavItem
          ref={(el) => {
            itemRefs.current[1] = el;
          }}
          item={items[1]}
          active={activeIdx === 1}
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
        <NavItem
          ref={(el) => {
            itemRefs.current[2] = el;
          }}
          item={items[2]}
          active={activeIdx === 2}
        />
        <NavItem
          ref={(el) => {
            itemRefs.current[3] = el;
          }}
          item={items[3]}
          active={activeIdx === 3}
        />
      </Group>
    </Paper>
  );
}

type NavItemProps = {
  item: { to: string; labelKey: string; Icon: typeof IconHome };
  active: boolean;
};

const NavItem = forwardRef<HTMLAnchorElement, NavItemProps>(function NavItem(
  { item, active },
  ref,
) {
  const { Icon, to, labelKey } = item;
  const { t } = useTranslation();
  return (
    <NavLink
      ref={ref}
      to={to}
      className={`${classes.item} ${active ? classes.active : ''}`}
    >
      <Icon size={24} stroke={active ? 2.2 : 1.8} />
      <Text size="10px" fw={active ? 600 : 500} lh={1}>
        {t(labelKey)}
      </Text>
    </NavLink>
  );
});
