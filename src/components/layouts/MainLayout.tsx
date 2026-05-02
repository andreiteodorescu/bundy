import { Outlet } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';

export function MainLayout() {
  return (
    <>
      <main className="app-shell-main">
        <Outlet />
      </main>
      <BottomNav />
    </>
  );
}
