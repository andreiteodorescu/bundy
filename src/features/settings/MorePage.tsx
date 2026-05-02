import { useNavigate } from 'react-router-dom';
import { Button, Container, NavLink, Stack, Title } from '@mantine/core';
import {
  IconBuildingBank,
  IconCategory,
  IconChevronRight,
  IconCreditCard,
  IconLogout,
  IconPin,
  IconSettings,
} from '@tabler/icons-react';
import { useAuth } from '@/features/auth/AuthProvider';

export function MorePage() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  return (
    <Container size="sm" py="md">
      <Stack gap="xs">
        <Title order={2} mb="sm">
          Mai mult
        </Title>
        <NavLink
          label="Categorii"
          leftSection={<IconCategory size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => navigate('/categories')}
        />
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
        <NavLink
          label="Cheltuieli fixe"
          leftSection={<IconPin size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => navigate('/fixed-expenses')}
        />
        <NavLink
          label="Setări"
          leftSection={<IconSettings size={20} />}
          rightSection={<IconChevronRight size={16} />}
          onClick={() => navigate('/settings')}
          disabled
          description="Phase 7"
        />
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
