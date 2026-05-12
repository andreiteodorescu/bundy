import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { SearchModal } from '@/features/search/SearchModal';

/**
 * Auto-scroll to top on route change. React Router 6 keeps scroll position by
 * default, which is wrong UX for an app where you navigate to a new screen
 * (vs. browser back, where preserving position is desired). Without this, a
 * user logging in from a scrolled login form lands on Home pre-scrolled —
 * confusing because the page total widget is at the top.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function MainLayout() {
  return (
    <>
      <ScrollToTop />
      <main className="app-shell-main">
        <Outlet />
      </main>
      <BottomNav />
      {/* Mounted here (inside RouterProvider) so SearchModal can use useNavigate */}
      <SearchModal />
    </>
  );
}
