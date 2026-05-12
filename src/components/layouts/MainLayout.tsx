import { Outlet, ScrollRestoration } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { SearchModal } from '@/features/search/SearchModal';

export function MainLayout() {
  return (
    <>
      {/* React Router's built-in scroll handling: scroll to top on PUSH/REPLACE
          (new screen), restore previous position on POP (browser back). */}
      <ScrollRestoration />
      <main className="app-shell-main">
        <Outlet />
      </main>
      <BottomNav />
      {/* Mounted here (inside RouterProvider) so SearchModal can use useNavigate */}
      <SearchModal />
    </>
  );
}
