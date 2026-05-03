import { Outlet } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { SearchModal } from '@/features/search/SearchModal';

export function MainLayout() {
  return (
    <>
      <main className="app-shell-main">
        <Outlet />
      </main>
      <BottomNav />
      {/* Mounted here (inside RouterProvider) so SearchModal can use useNavigate */}
      <SearchModal />
    </>
  );
}
