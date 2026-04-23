import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
] as const;

interface ThemeToggleProps {
  /** Compact icon-only mode (e.g. collapsed sidebar). */
  compact?: boolean;
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Avoid hydration mismatch / SSR-style flash — only render the final icon
  // after mount so it reflects the actual resolved theme.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = theme ?? 'system';
  const ResolvedIcon = (resolvedTheme ?? 'light') === 'dark' ? Moon : Sun;
  const activeOption = OPTIONS.find((o) => o.value === current);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? 'icon' : 'sm'}
          className={cn(
            'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
            compact ? 'h-8 w-8' : 'h-8 w-full justify-start gap-2 px-2',
          )}
          title="Theme"
        >
          {mounted ? (
            <ResolvedIcon className="h-4 w-4" />
          ) : (
            <span className="h-4 w-4" aria-hidden />
          )}
          {!compact && <span className="text-xs">{mounted ? (activeOption?.label ?? 'System') : 'Theme'}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-36">
        {OPTIONS.map(({ value, label, Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className={cn('gap-2', current === value && 'font-medium')}
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{label}</span>
            {current === value && <span className="text-xs text-muted-foreground">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
