import { useState } from 'react';
import {
  Box,
  Center,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { IconSearch } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';

type Institution = {
  id: string;
  name: string;
  logo: string;
  bic?: string;
};

export function InstitutionPickerModal({
  opened,
  onClose,
  onPick,
}: {
  opened: boolean;
  onClose: () => void;
  onPick: (institution: Institution) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const institutions = useQuery({
    queryKey: ['institutions', 'RO'],
    enabled: opened,
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error('Not authenticated');
      const res = await fetch('/api/bank/institutions?country=RO', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to load institutions: ${res.status}`);
      return (await res.json()) as Institution[];
    },
  });

  const filtered = (institutions.data ?? []).filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Modal opened={opened} onClose={onClose} title={t('bank.connectButton')} size="md">
      <Stack gap="sm">
        <TextInput
          placeholder={t('bank.searchBankPlaceholder')}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        {institutions.isLoading ? (
          <Center py="xl"><Loader /></Center>
        ) : institutions.error ? (
          <Text c="red" size="sm">
            {institutions.error instanceof Error ? institutions.error.message : 'Error'}
          </Text>
        ) : filtered.length === 0 ? (
          <Text c="dimmed" size="sm">{t('bank.noBanksFound')}</Text>
        ) : (
          <Stack gap={4} style={{ maxHeight: 400, overflowY: 'auto' }}>
            {filtered.map((inst) => (
              <UnstyledButton
                key={inst.id}
                onClick={() => onPick(inst)}
                p="xs"
                style={{ borderRadius: 8 }}
              >
                <Group gap="sm" wrap="nowrap">
                  {inst.logo && (
                    <Box
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        overflow: 'hidden',
                        flex: '0 0 auto',
                        background: 'rgba(255,255,255,0.05)',
                      }}
                    >
                      <img src={inst.logo} alt="" width={32} height={32} />
                    </Box>
                  )}
                  <Text size="sm" truncate>{inst.name}</Text>
                </Group>
              </UnstyledButton>
            ))}
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
