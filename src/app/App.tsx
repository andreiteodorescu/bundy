import { useEffect } from 'react';
import { Analytics, track } from '@vercel/analytics/react';
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

  // One-shot per session — tag the visit as installed PWA vs browser so the
  // Vercel Analytics dashboard can distinguish them. Also captures the launch
  // surface (homescreen icon vs deeplink) when the browser exposes it.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS-specific: navigator.standalone is true when launched from homescreen.
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    track('app_open', {
      surface: isStandalone ? 'pwa' : 'browser',
      display_mode: isStandalone ? 'standalone' : 'browser-tab',
    });
  }, []);

  return (
    <Providers>
      <GradientDefs />
      <AppRouter />
      <SwUpdatePrompt />
      <Analytics />
    </Providers>
  );
}
