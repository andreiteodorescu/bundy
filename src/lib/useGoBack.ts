import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Returns a "back" handler that goes back in browser history if there is any,
 * otherwise navigates to the provided fallback route.
 *
 * Why not just `navigate(-1)`: when a user opens a deep link (or installs the
 * PWA and the entry point is a sub-route), `window.history.length === 1` and
 * `navigate(-1)` would go nowhere — leaving them stuck. The fallback is the
 * sensible parent route for the page (e.g. `/more` for items reached from
 * the More menu, `/home` for items reached from Home).
 */
export function useGoBack(fallback: string): () => void {
  const navigate = useNavigate();
  return useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  }, [navigate, fallback]);
}
