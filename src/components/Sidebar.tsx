import {
  AlertTriangle,
  Film,
  ImageIcon,
  Layers,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserCircle2,
  Users,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getApiCredentials, setApiCredentials } from '@/api/client';
import { useServerConfig, useVersionState } from '@/features/config/hooks/useServerConfig';

const navItems = [
  { to: '/streams', label: 'Streams', icon: Radio, end: false },
  { to: '/templates', label: 'Templates', icon: Layers, end: false },
  { to: '/policies', label: 'Policies', icon: ShieldCheck, end: false },
  { to: '/vod', label: 'VOD', icon: Film, end: false },
  { to: '/sessions', label: 'Sessions', icon: Users, end: false },
  { to: '/watermarks', label: 'Watermarks', icon: ImageIcon, end: false },
  { to: '/hooks', label: 'Hooks', icon: Settings, end: false },
  { to: '/settings', label: 'Settings', icon: SlidersHorizontal, end: false },
] as const;

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

export function Sidebar({ open, onToggle }: SidebarProps) {
  const { data: serverConfig } = useServerConfig();
  const version = serverConfig?.version;
  const versionState = useVersionState();

  return (
    <aside
      className={cn(
        'sticky top-0 h-screen flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out overflow-hidden shrink-0',
        open ? 'w-56' : 'w-14',
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center border-b px-3 gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={onToggle}
          title={open ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {open ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </Button>

        <span
          className={cn(
            'font-semibold tracking-tight whitespace-nowrap transition-all duration-300',
            open ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden',
          )}
        >
          Open Streamer
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={!open ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span
              className={cn(
                'whitespace-nowrap transition-all duration-300',
                open ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden',
              )}
            >
              {label}
            </span>
          </NavLink>
        ))}
      </nav>

      <AccountFooter open={open} />

      {/* Theme toggle */}
      <div className={cn('border-t p-2', open ? '' : 'flex justify-center')}>
        <ThemeToggle compact={!open} />
      </div>

      {/* Version footer */}
      {version?.version && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'flex items-center gap-1.5 border-t px-3 py-2 text-[10px] text-sidebar-foreground/60',
                open ? 'text-left' : 'justify-center',
              )}
            >
              {versionState.mismatch && (
                <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
              )}
              <span className="min-w-0 truncate font-mono">
                {open ? `version: ${version.version}` : version.version}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[280px] space-y-1">
            {versionState.mismatch && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Console / server version mismatch
              </p>
            )}
            <p className="text-xs">
              <span className="text-muted-foreground">Console</span>{' '}
              <span className="font-mono">{versionState.client}</span>
            </p>
            <p className="text-xs">
              <span className="text-muted-foreground">Server</span>{' '}
              <span className="font-mono">{version.version}</span>
            </p>
            {version.commit && (
              <p className="font-mono text-[10px] text-muted-foreground">
                server commit {version.commit.slice(0, 12)}
              </p>
            )}
            {version.built_at && (
              <p className="text-[10px] text-muted-foreground">server built {version.built_at}</p>
            )}
          </TooltipContent>
        </Tooltip>
      )}
    </aside>
  );
}

function AccountFooter({ open }: { open: boolean }) {
  const creds = getApiCredentials();
  if (!creds) return null;

  function signOut() {
    setApiCredentials(null);
    window.location.href = '/login';
  }

  return (
    <div className={cn('border-t p-2', open ? 'flex items-center gap-2' : 'flex justify-center')}>
      {open && (
        <>
          <UserCircle2 className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
          <span className="min-w-0 flex-1 truncate text-xs text-sidebar-foreground/80">
            {creds.username}
          </span>
        </>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={signOut}
            title={open ? 'Sign out' : `Sign out (${creds.username})`}
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {open ? 'Sign out' : `Sign out — ${creds.username}`}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
