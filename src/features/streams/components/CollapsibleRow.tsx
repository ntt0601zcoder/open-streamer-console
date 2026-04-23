import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleRowProps {
  /** Title block shown beside the chevron. */
  header: ReactNode;
  /** Inline controls shown on the right of the header (toggle, delete, …). */
  actions?: ReactNode;
  /** Body content, hidden when collapsed. */
  children: ReactNode;
  /** Initial collapsed state. Default: false. */
  defaultCollapsed?: boolean;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

export function CollapsibleRow({
  header,
  actions,
  children,
  defaultCollapsed = false,
  className,
}: CollapsibleRowProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className={cn('rounded-lg border', className)}>
      <div className="flex items-stretch border-b bg-muted/40">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex flex-1 items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-muted/60"
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          {header}
        </button>
        {actions && (
          <div className="flex items-center gap-2 px-2" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>
      {!collapsed && children}
    </div>
  );
}
