import type { ErrorEntry } from '@/api/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatRelativeIso } from '@/lib/format';
import { cn } from '@/lib/utils';

// Covers domain.StreamStatus + publisher.PushStatus + a generic fallback.
const COLOR_BY_STATUS: Record<string, string> = {
  active: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  reconnecting: 'bg-amber-500',
  starting: 'bg-blue-500',
  failed: 'bg-red-500',
  idle: 'bg-slate-400',
  stopped: 'bg-slate-300',
};

interface RuntimeErrorIndicatorProps {
  status?: string;
  errors?: ErrorEntry[];
  label: string;
  /** Optional secondary line shown under the label (e.g. "restart count: 2"). */
  meta?: string;
  size?: 'sm' | 'md';
  /**
   * Skip the "recent errors → amber" override. Set this when the caller has
   * an authoritative current-health signal separate from the errors list
   * (e.g. transcoder profiles emit `status: 'healthy'` after recovering, but
   * keep historical errors for context). Without it, a healthy profile with
   * stale errors would still render amber, contradicting the server.
   */
  errorsAreHistorical?: boolean;
}

export function RuntimeErrorIndicator({
  status,
  errors,
  label,
  meta,
  size = 'md',
  errorsAreHistorical = false,
}: RuntimeErrorIndicatorProps) {
  const recent = errors ?? [];
  // Tint amber when there are recent errors but status hasn't yet flipped to
  // degraded — UNLESS the caller flagged errors as historical, in which case
  // we trust the status.
  const dotColor =
    !errorsAreHistorical && recent.length > 0 && status === 'active'
      ? 'bg-amber-500'
      : (status && COLOR_BY_STATUS[status]) || 'bg-slate-400';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-block shrink-0 rounded-full',
            size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5',
            dotColor,
          )}
        />
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[360px] space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium">{label}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {status ?? 'unknown'}
          </p>
        </div>
        {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
        {recent.length === 0 ? (
          <p className="text-xs text-muted-foreground">No recent errors</p>
        ) : (
          <ul className="space-y-1">
            {recent.slice(0, 5).map((e, i) => (
              <li key={i} className="rounded border border-amber-500/30 bg-amber-500/10 p-1.5">
                <p className="break-words font-mono text-[11px] leading-snug text-amber-900 dark:text-amber-100">
                  {e.message}
                </p>
                <p className="mt-0.5 text-[10px] text-amber-700/80 dark:text-amber-300/70">
                  {formatRelativeIso(e.at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
