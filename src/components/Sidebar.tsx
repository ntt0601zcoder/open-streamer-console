import {
  Activity,
  Film,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Settings,
  SlidersHorizontal,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useServerConfig } from '@/features/config/hooks/useServerConfig';

const navItems = [
  { to: '/', label: 'Dashboard', icon: Activity, end: true },
  { to: '/streams', label: 'Streams', icon: Radio, end: false },
  { to: '/vod', label: 'VOD', icon: Film, end: false },
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

      {/* Version footer */}
      {version?.version && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'border-t px-3 py-2 text-[10px] text-sidebar-foreground/60',
                open ? 'text-left' : 'text-center',
              )}
              title={!open ? `version: ${version.version}` : undefined}
            >
              <span className="font-mono">
                {open ? `version: ${version.version}` : version.version}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="space-y-0.5">
            <p className="text-xs font-medium">Open Streamer {version.version}</p>
            {version.commit && (
              <p className="font-mono text-[10px] text-muted-foreground">
                commit {version.commit.slice(0, 12)}
              </p>
            )}
            {version.built_at && (
              <p className="text-[10px] text-muted-foreground">built {version.built_at}</p>
            )}
          </TooltipContent>
        </Tooltip>
      )}
    </aside>
  );
}
