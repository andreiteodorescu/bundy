import { ReactNode } from 'react';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { DatesProvider } from '@mantine/dates';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';
import 'dayjs/locale/en';
import isoWeek from 'dayjs/plugin/isoWeek';
import customParseFormat from 'dayjs/plugin/customParseFormat';

import { theme } from '@/styles/theme';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/features/auth/AuthProvider';

dayjs.extend(isoWeek);
dayjs.extend(customParseFormat);

export function Providers({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const datesLocale = i18n.language.startsWith('ro') ? 'ro' : 'en';

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <DatesProvider settings={{ locale: datesLocale, firstDayOfWeek: 1, weekendDays: [0, 6] }}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ModalsProvider>
              <Notifications position="top-right" />
              {children}
              {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
            </ModalsProvider>
          </AuthProvider>
        </QueryClientProvider>
      </DatesProvider>
    </MantineProvider>
  );
}
