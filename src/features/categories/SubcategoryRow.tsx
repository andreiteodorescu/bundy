import { useNavigate } from 'react-router-dom';
import { ActionIcon, Box, Group, Paper, Text } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { getIcon } from '@/data/icons.registry';
import { subcategoryDisplayName } from '@/i18n/displayName';
import type { Subcategory } from '@/types';

type Props = {
  subcategory: Subcategory;
  parentColor: string;
};

export function SubcategoryRow({ subcategory, parentColor }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const Icon = getIcon(subcategory.icon);
  const color = subcategory.color ?? parentColor;
  return (
    <Paper
      withBorder
      radius="md"
      p="sm"
      onClick={() => navigate(`/subcategories/${subcategory.id}/edit`)}
      style={{ cursor: 'pointer' }}
    >
      <Group wrap="nowrap" gap="sm">
        <Box
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: `${color}33`,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={18} stroke={2} />
        </Box>
        <Text flex={1} truncate fw={500} size="sm">
          {subcategoryDisplayName(subcategory, t)}
        </Text>
        <ActionIcon variant="subtle" color="gray" size="sm">
          <IconChevronRight size={16} />
        </ActionIcon>
      </Group>
    </Paper>
  );
}
