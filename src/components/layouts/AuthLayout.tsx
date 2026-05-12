import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

/**
 * Auto-scroll to top on auth route changes (login → signup, login → forgot, etc.).
 * Same reasoning as the equivalent in MainLayout.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function AuthLayout() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  );
}
