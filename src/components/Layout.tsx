import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useConfigDefaults } from '@/features/config/hooks/useServerConfig';
import { Sidebar } from './Sidebar';

const SIDEBAR_KEY = 'os-console.sidebar-open';

function readPersistedOpen(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const v = window.localStorage.getItem(SIDEBAR_KEY);
    if (v === 'true' || v === 'false') return v === 'true';
  } catch {
    // localStorage may throw in private mode / sandboxed iframes — fall through.
  }
  return true;
}

export function Layout() {
  const [open, setOpen] = useState<boolean>(readPersistedOpen);
  // Warm the /config/defaults cache once on app init so every form across
  // the app has placeholders ready by the time it mounts.
  useConfigDefaults();

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_KEY, String(open));
    } catch {
      // best-effort persistence; ignore quota / access errors.
    }
  }, [open]);

  return (
    <div className="flex min-h-screen">
      <Sidebar open={open} onToggle={() => setOpen((v) => !v)} />
      <main className="flex-1 min-w-0 p-6">
        <Outlet />
      </main>
    </div>
  );
}
