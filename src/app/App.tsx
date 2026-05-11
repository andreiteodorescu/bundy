import { Providers } from './providers';
import { AppRouter } from './router';
import { SwUpdatePrompt } from '@/components/SwUpdatePrompt';
import { GradientDefs } from '@/components/GradientDefs';

export function App() {
  return (
    <Providers>
      <GradientDefs />
      <AppRouter />
      <SwUpdatePrompt />
    </Providers>
  );
}
