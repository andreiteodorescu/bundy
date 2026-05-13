import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
// @mantine/charts CSS is loaded inside AnalyticsPage to keep ~5KB out of the
// initial CSS bundle (chart styles are only needed on /analytics).
import '@/styles/globals.css';
import '@/i18n';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
