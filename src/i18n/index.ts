import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import dayjs from 'dayjs';
// IMPORTANT: import dayjs locales BEFORE syncDayjsLocale runs at boot.
// Otherwise dayjs.locale('ro') silently no-ops because 'ro' isn't registered yet,
// and dates render in English even when the UI is in Romanian.
import 'dayjs/locale/ro';
import 'dayjs/locale/en';

import en from './locales/en.json';
import ro from './locales/ro.json';

export const SUPPORTED_LANGUAGES = ['en', 'ro'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = 'bundy.lang';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ro: { translation: ro },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
    returnNull: false,
  });

function syncDayjsLocale(lang: string) {
  const normalized = lang.startsWith('ro') ? 'ro' : 'en';
  dayjs.locale(normalized);
}

syncDayjsLocale(i18n.language);
i18n.on('languageChanged', syncDayjsLocale);

export default i18n;
