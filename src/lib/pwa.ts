/**
 * Detects whether the app is running as an installed PWA (standalone display mode).
 * - Standard browsers (Chrome/Edge/Android): `display-mode: standalone` matches.
 * - iOS Safari: exposes `navigator.standalone === true` instead.
 */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  // iOS Safari only.
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}
