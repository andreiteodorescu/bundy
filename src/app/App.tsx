import { useEffect } from 'react';
import { Providers } from './providers';
import { AppRouter } from './router';
import { SwUpdatePrompt } from '@/components/SwUpdatePrompt';
import { GradientDefs } from '@/components/GradientDefs';

export function App() {
  // iOS PWA viewport fix: on first launch, env(safe-area-inset-bottom) can
  // initially report a larger value (as if a browser toolbar were present).
  // A single tiny synthetic scroll right after mount forces iOS to recompute
  // the safe-area immediately. Kept minimal (no resize dispatch, no timeout
  // re-fire) to avoid interfering with iOS's natural keyboard show/hide
  // animation — earlier versions of this hack caused PWA freezes on keyboard
  // dismiss.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(display-mode: standalone)').matches) return;
    requestAnimationFrame(() => {
      const root = document.scrollingElement ?? document.documentElement;
      root.scrollTop = 1;
      requestAnimationFrame(() => {
        root.scrollTop = 0;
      });
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
