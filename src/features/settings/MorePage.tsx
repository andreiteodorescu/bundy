import { useNavigate } from 'react-router-dom';
import { Button, Container, Divider, NavLink, Stack, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBolt,
  IconBuildingBank,
  IconCategory,
  IconChevronRight,
  IconClipboardList,
  IconCreditCard,
  IconEyeOff,
  IconLogout,
  IconPin,
  IconRefresh,
  IconSearch,
  IconSettings,
  IconShieldCheck,
  IconWallet,
} from '@tabler/icons-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSearchStore } from '@/features/search/store';
import { useIsAdmin } from '@/features/admin/api';
import { isStandalonePWA } from '@/lib/pwa';

export function MorePage() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const openSearch = useSearchStore((s) => s.setOpen);
  const isAdmin = useIsAdmin();
  const showPwaRefresh = isStandalonePWA();

  return (
    <Container size="sm" py="md">
      <Stack gap="xs">
        <Title order={2} mb="sm">
          Mai mult
        </Title>

        <NavLink
          label="Caută"
          description="Caută cheltuieli după nume, sumă, dată"
          leftSection={<IconSearch size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => openSearch(true)}
        />

        <Divider label="Șabloane" labelPosition="left" mt="sm" />
        <NavLink
          label="Cheltuieli rapide"
          description="Metrou, loto — preț fix, +/- pe zi"
          leftSection={<IconBolt size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => navigate('/quick-expenses')}
        />
        <NavLink
          label="Cheltuieli predefinite"
          description="Freshful, Bolt — pre-completare"
          leftSection={<IconClipboardList size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => navigate('/predefined-expenses')}
        />
        <NavLink
          label="Cheltuieli fixe"
          description="Terapie, chirie — sumă identică"
          leftSection={<IconPin size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => navigate('/fixed-expenses')}
        />

        <Divider label="Cheltuieli recurente" labelPosition="left" mt="sm" />
        <NavLink
          label="Subscripții"
          leftSection={<IconCreditCard size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => navigate('/subscriptions')}
        />
        <NavLink
          label="Rate"
          leftSection={<IconBuildingBank size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => navigate('/loans')}
        />

        <Divider label="Configurare" labelPosition="left" mt="sm" />
        <NavLink
          label="Categorii & subcategorii"
          leftSection={<IconCategory size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => navigate('/categories')}
        />
        <NavLink
          label="Bugete"
          leftSection={<IconWallet size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => navigate('/budgets')}
        />

        <Divider label="Privat" labelPosition="left" mt="sm" />
        <NavLink
          label="Cheltuieli ascunse"
          description="Necesită PIN"
          leftSection={<IconEyeOff size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => navigate('/hidden-expenses')}
        />
        <NavLink
          label="Setări"
          description="PIN, profil"
          leftSection={<IconSettings size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => navigate('/settings')}
        />

        {isAdmin.data === true && (
          <>
            <Divider label="Admin" labelPosition="left" mt="sm" />
            <NavLink
              label="Utilizatori"
              description="Listă, ban, ștergere, reset parolă"
              leftSection={<IconShieldCheck size={20} />}
              rightSection={<IconChevronRight size={16} />}
              onClick={() => navigate('/admin/users')}
            />
          </>
        )}

        {showPwaRefresh && (
          <NavLink
            label="Reîncarcă aplicația"
            leftSection={<IconRefresh size={20} />}
            onClick={() => {
              notifications.show({
                message: 'Se reîncarcă aplicația…',
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
          Logout {user?.email ? `(${user.email})` : ''}
        </Button>
      </Stack>
    </Container>
  );
}
