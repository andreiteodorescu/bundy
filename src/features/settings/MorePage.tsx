import { useNavigate } from 'react-router-dom';
import { Badge, Button, Container, Divider, NavLink, Stack, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBolt,
  IconBuildingBank,
  IconCategory,
  IconChartLine,
  IconChevronRight,
  IconClipboardList,
  IconCreditCard,
  IconEyeOff,
  IconLogout,
  IconMessageCircle,
  IconPigMoney,
  IconPin,
  IconRefresh,
  IconSearch,
  IconSettings,
  IconShieldCheck,
  IconWallet,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSearchStore } from '@/features/search/store';
import { useIsAdmin } from '@/features/admin/api';
import { useUnreadFeedbackCount } from '@/features/feedback/api';
import { isStandalonePWA } from '@/lib/pwa';

export function MorePage() {
  const { t } = useTranslation();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const openSearch = useSearchStore((s) => s.setOpen);
  const isAdmin = useIsAdmin();
  const unreadFeedback = useUnreadFeedbackCount();
  const showPwaRefresh = isStandalonePWA();

  return (
    <Container size="sm" py="md">
      <Stack gap="xs">
        <Title order={2} mb="sm">
          {t('more.title')}
        </Title>

        <NavLink
          label={t('more.search')}
          description={t('more.searchDescription')}
          leftSection={<IconSearch size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => openSearch(true)}
        />

        <Divider label={t('more.templatesDivider')} labelPosition="left" mt="sm" />
        <NavLink
          label={t('more.quickExpenses')}
          description={t('more.quickExpensesDescription')}
          leftSection={<IconBolt size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => navigate('/quick-expenses')}
        />
        <NavLink
          label={t('more.predefinedExpenses')}
          description={t('more.predefinedExpensesDescription')}
          leftSection={<IconClipboardList size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => navigate('/predefined-expenses')}
        />
        <NavLink
          label={t('more.fixedExpenses')}
          description={t('more.fixedExpensesDescription')}
          leftSection={<IconPin size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => navigate('/fixed-expenses')}
        />

        <NavLink
          label={t('more.subscriptions')}
          description={t('more.subscriptionsDescription')}
          leftSection={<IconCreditCard size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => navigate('/subscriptions')}
        />
        <NavLink
          label={t('more.loans')}
          description={t('more.loansDescription')}
          leftSection={<IconBuildingBank size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => navigate('/loans')}
        />

        <Divider label={t('more.savingsDivider')} labelPosition="left" mt="sm" />
        <NavLink
          label={t('more.savings')}
          description={t('more.savingsDescription')}
          leftSection={<IconPigMoney size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => navigate('/savings')}
        />
        <NavLink
          label={t('more.investments')}
          description={t('more.investmentsDescription')}
          leftSection={<IconChartLine size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => navigate('/investments')}
        />

        <Divider label={t('more.configDivider')} labelPosition="left" mt="sm" />
        <NavLink
          label={t('more.categories')}
          leftSection={<IconCategory size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => navigate('/categories')}
        />
        <NavLink
          label={t('more.budgets')}
          leftSection={<IconWallet size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => navigate('/budgets')}
        />

        <Divider label={t('more.privateDivider')} labelPosition="left" mt="sm" />
        <NavLink
          label={t('more.hiddenExpenses')}
          description={t('more.hiddenExpensesDescription')}
          leftSection={<IconEyeOff size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => navigate('/hidden-expenses')}
        />
        <NavLink
          label={t('more.settings')}
          description={t('more.settingsDescription')}
          leftSection={<IconSettings size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => navigate('/settings')}
        />

        <NavLink
          label={t('feedback.moreNav.label')}
          description={t('feedback.moreNav.description')}
          leftSection={<IconMessageCircle size={20} />}
          rightSection={
            <Badge size="sm" variant="filled" color="red" style={{ visibility: unreadFeedback > 0 ? 'visible' : 'hidden' }}>
              {unreadFeedback}
            </Badge>
          }
          onClick={() => navigate('/feedback')}
        />

        {isAdmin.data === true && (
          <>
            <Divider label={t('more.adminDivider')} labelPosition="left" mt="sm" />
            <NavLink
              label={t('more.admin')}
              description={t('more.adminDescription')}
              leftSection={<IconShieldCheck size={20} />}
              rightSection={<IconChevronRight size={16} />}
              onClick={() => navigate('/admin/users')}
            />
          </>
        )}

        {showPwaRefresh && (
          <NavLink
            label={t('more.reload')}
            leftSection={<IconRefresh size={20} />}
            onClick={() => {
              notifications.show({
                message: t('more.reloadingToast'),
                color: 'gray',
                autoClose: 1500,
              });
              setTimeout(() => window.location.reload(), 200);
            }}
          />
        )}

        <Button
          mt="lg"
          variant="subtle"
          color="red"
          leftSection={<IconLogout size={18} />}
          onClick={() => signOut()}
        >
          {t('more.logout')} {user?.email ? `(${user.email})` : ''}
        </Button>
      </Stack>
    </Container>
  );
}
