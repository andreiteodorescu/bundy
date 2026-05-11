import { Group, UnstyledButton } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n';
import classes from './LanguageToggle.module.css';

/**
 * Compact language picker for places where a full SegmentedControl is overkill
 * (auth pages, modals). Renders a row of small EN | RO buttons.
 */
export function LanguageToggle() {
  const { i18n } = useTranslation();
  const current: SupportedLanguage = (SUPPORTED_LANGUAGES as readonly string[]).includes(
    i18n.language,
  )
    ? (i18n.language as SupportedLanguage)
    : 'en';

  return (
    <Group gap={2} className={classes.wrap}>
      {SUPPORTED_LANGUAGES.map((lng) => (
        <UnstyledButton
          key={lng}
          onClick={() => {
            if (lng !== current) void i18n.changeLanguage(lng);
          }}
          className={`${classes.btn} ${lng === current ? classes.active : ''}`}
          aria-pressed={lng === current}
          aria-label={lng === 'en' ? 'English' : 'Română'}
        >
          {lng.toUpperCase()}
        </UnstyledButton>
      ))}
    </Group>
  );
}
