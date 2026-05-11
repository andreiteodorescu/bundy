import { useMemo, useState } from 'react';
import { Group, ScrollArea, SimpleGrid, Text, TextInput, Tooltip, UnstyledButton } from '@mantine/core';
import { IconCircleOff, IconSearch } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { BRAND_LOGOS } from '@/data/brandLogos';
import { BrandGlyph } from './BrandGlyph';
import classes from './BrandPicker.module.css';

type Props = {
  /** Current selected brand slug, or null = auto-detect */
  value: string | null;
  onChange: (slug: string | null) => void;
};

export function BrandPicker({ value, onChange }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BRAND_LOGOS;
    return BRAND_LOGOS.filter((b) => b.label.toLowerCase().includes(q));
  }, [query]);

  return (
    <div>
      <TextInput
        leftSection={<IconSearch size={16} />}
        placeholder={t('brands.searchPlaceholder')}
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        size="sm"
        mb="sm"
      />

      <ScrollArea.Autosize mah={280} type="never">
        <SimpleGrid cols={4} spacing="xs">
          <Tooltip label={t('brands.autoTooltip')} withArrow openDelay={300}>
            <UnstyledButton
              onClick={() => onChange(null)}
              className={`${classes.tile} ${value === null ? classes.active : ''}`}
              aria-label={t('brands.autoTooltip')}
              aria-pressed={value === null}
            >
              <IconCircleOff size={22} stroke={1.7} />
              <Text size="xs" mt={2}>
                {t('brands.auto')}
              </Text>
            </UnstyledButton>
          </Tooltip>

          {filtered.map((b) => {
            const active = b.slug === value;
            return (
              <Tooltip key={b.slug} label={b.label} withArrow openDelay={300}>
                <UnstyledButton
                  onClick={() => onChange(b.slug)}
                  className={`${classes.tile} ${active ? classes.active : ''}`}
                  style={
                    active ? { borderColor: `#${b.hex}`, background: `#${b.hex}22` } : undefined
                  }
                  aria-label={b.label}
                  aria-pressed={active}
                >
                  <BrandGlyph brand={b} size={28} />
                </UnstyledButton>
              </Tooltip>
            );
          })}
        </SimpleGrid>
      </ScrollArea.Autosize>

      {filtered.length === 0 && (
        <Group justify="center" py="md">
          <Text size="sm" c="dimmed">
            {t('brands.empty', { query })}
          </Text>
        </Group>
      )}
    </div>
  );
}
