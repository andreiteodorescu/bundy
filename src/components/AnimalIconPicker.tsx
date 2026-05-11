import { Box, SimpleGrid, Tooltip, UnstyledButton } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ANIMAL_ICONS } from '@/data/animalIcons';
import { getIcon } from '@/data/icons.registry';
import { animalDisplayName } from '@/i18n/displayName';
import classes from './AnimalIconPicker.module.css';

type Props = {
  value: string;
  onChange: (name: string) => void;
  color?: string;
  cols?: number;
};

export function AnimalIconPicker({ value, onChange, color, cols = 4 }: Props) {
  const { t } = useTranslation();
  return (
    <SimpleGrid cols={cols} spacing="sm">
      {ANIMAL_ICONS.map((opt) => {
        const Icon = getIcon(opt.name);
        const active = opt.name === value;
        const label = animalDisplayName(opt.name, t);
        return (
          <Tooltip key={opt.name} label={label} withArrow openDelay={300}>
            <UnstyledButton
              onClick={() => onChange(opt.name)}
              className={`${classes.tile} ${active ? classes.active : ''}`}
              style={
                active && color
                  ? { borderColor: color, background: `${color}22` }
                  : undefined
              }
              aria-label={label}
              aria-pressed={active}
            >
              <Box
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: active ? color : undefined,
                }}
              >
                <Icon size={32} stroke={active ? 2 : 1.6} />
              </Box>
            </UnstyledButton>
          </Tooltip>
        );
      })}
    </SimpleGrid>
  );
}
