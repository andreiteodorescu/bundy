import { useEffect } from 'react';
import { Providers } from './providers';
import { AppRouter } from './router';
import { SwUpdatePrompt } from '@/components/SwUpdatePrompt';
import { GradientDefs } from '@/components/GradientDefs';

export function App() {
  // iOS PWA viewport fix: on first launch, env(safe-area-inset-bottom) can
  // initially report a larger value (as if a browser toolbar were present),
  // pushing the bottom nav up and leaving empty space below it. iOS only
  // recomputes the safe-area when the user scrolls or otherwise interacts,
  // so we synthesize a tiny scroll right after mount to force the recompute
  // upfront. Multiple frames + a timeout cover different timing windows
  // (the exact "moment of recompute" varies by iOS version + content height).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(display-mode: standalone)').matches) return;

    function nudge() {
      const root = document.scrollingElement ?? document.documentElement;
      root.scrollTop = 1;
      requestAnimationFrame(() => {
        root.scrollTop = 0;
      });
      window.dispatchEvent(new Event('resize'));
    }

    requestAnimationFrame(nudge);
    const t = window.setTimeout(nudge, 150);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <Providers>
      <GradientDefs />
      <AppRouter />
      <SwUpdatePrompt />
    </Providers>
  );
}
