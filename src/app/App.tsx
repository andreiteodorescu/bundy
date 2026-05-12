import { useEffect } from 'react';
import { Providers } from './providers';
import { AppRouter } from './router';
import { SwUpdatePrompt } from '@/components/SwUpdatePrompt';
import { GradientDefs } from '@/components/GradientDefs';

export function App() {
  // iOS PWA viewport fix: on first launch, env(safe-area-inset-bottom) can
  // initially report a larger value (as if a browser toolbar were present),
  // pushing the bottom nav up and leaving empty space below it. A single
  // resize-event dispatch right after mount forces iOS to recompute the
  // safe-area immediately, instead of waiting for the first user interaction.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(display-mode: standalone)').matches) return;
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
  }, []);

  return (
    <Providers>
      <GradientDefs />
      <AppRouter />
      <SwUpdatePrompt />
    </Providers>
  );
}
