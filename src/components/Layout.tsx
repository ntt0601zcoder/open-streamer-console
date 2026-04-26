import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useConfigDefaults } from '@/features/config/hooks/useServerConfig';
import { Sidebar } from './Sidebar';

export function Layout() {
  const [open, setOpen] = useState(true);
  // Warm the /config/defaults cache once on app init so every form across
  // the app has placeholders ready by the time it mounts.
  useConfigDefaults();

  return (
    <div className="flex min-h-screen">
      <Sidebar open={open} onToggle={() => setOpen((v) => !v)} />
      <main className="flex-1 min-w-0 p-6">
        <Outlet />
      </main>
    </div>
  );
}
