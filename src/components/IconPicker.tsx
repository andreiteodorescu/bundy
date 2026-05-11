import { useMemo, useState } from 'react';
import { TextInput, UnstyledButton } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { iconNames, getIcon } from '@/data/icons.registry';
import classes from './IconPicker.module.css';

type Props = {
  value: string;
  onChange: (name: string) => void;
  color?: string;
};

export function IconPicker({ value, onChange, color }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return iconNames;
    const q = query.toLowerCase();
    return iconNames.filter((n) => n.toLowerCase().includes(q));
  }, [query]);

  return (
    <div>
      <TextInput
        leftSection={<IconSearch size={16} />}
        placeholder={t('icons.searchPlaceholder')}
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        size="sm"
        mb="sm"
      />
      <div className={classes.grid}>
        {filtered.map((name) => {
          const Icon = getIcon(name);
          const active = name === value;
          return (
            <UnstyledButton
              key={name}
              type="button"
              onClick={() => onChange(name)}
              className={`${classes.cell} ${active ? classes.active : ''}`}
              style={active && color ? { borderColor: color, background: `${color}22` } : undefined}
              aria-label={name}
              aria-pressed={active}
            >
              <Icon size={22} stroke={active ? 2.2 : 1.7} color={active ? color : undefined} />
            </UnstyledButton>
          );
        })}
      </div>
    </div>
  );
}
