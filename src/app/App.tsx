import { Providers } from './providers';
import { AppRouter } from './router';
import { SwUpdatePrompt } from '@/components/SwUpdatePrompt';

export function App() {
  return (
    <Providers>
      <AppRouter />
      <SwUpdatePrompt />
    </Providers>
  );
}
