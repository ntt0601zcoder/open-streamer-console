import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar className="sticky top-0 h-screen" />
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
