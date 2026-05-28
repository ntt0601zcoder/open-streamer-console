import type { ErrorEntry } from '@/api/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatRelativeIso } from '@/lib/format';
import { cn } from '@/lib/utils';

// Covers domain.StreamStatus + publisher.PushStatus + a generic fallback.
// Each entry pairs a solid (filled) and outline (border-only) variant so a
// caller can show "currently consumed" vs "healthy stand-by" without dropping
// the status colour entirely.
const COLOR_BY_STATUS: Record<string, { solid: string; outline: string }> = {
  active: { solid: 'bg-emerald-500 border-emerald-500', outline: 'border-emerald-500/60' },
  degraded: { solid: 'bg-amber-500 border-amber-500', outline: 'border-amber-500/60' },
  reconnecting: { solid: 'bg-amber-500 border-amber-500', outline: 'border-amber-500/60' },
  starting: { solid: 'bg-blue-500 border-blue-500', outline: 'border-blue-500/60' },
  failed: { solid: 'bg-red-500 border-red-500', outline: 'border-red-500/60' },
  idle: { solid: 'bg-slate-400 border-slate-400', outline: 'border-slate-400/60' },
  stopped: { solid: 'bg-slate-300 border-slate-300', outline: 'border-slate-300/60' },
};
const FALLBACK = { solid: 'bg-slate-400 border-slate-400', outline: 'border-slate-400/60' };

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
  /**
   * When set, switches between solid (true) and outline (false) variants so
   * a row showing multiple healthy items can still surface which one the
   * pipeline is actively consuming. Leave undefined for callers that don't
   * have an "active" vs "stand-by" distinction (transcoder profiles,
   * publisher pushes, etc.) — they keep the solid behaviour.
   */
  isActive?: boolean;
}

export function RuntimeErrorIndicator({
  status,
  errors,
  label,
  meta,
  size = 'md',
  errorsAreHistorical = false,
  isActive,
}: RuntimeErrorIndicatorProps) {
  const recent = errors ?? [];
  // Tint amber when there are recent errors but status hasn't yet flipped to
  // degraded — UNLESS the caller flagged errors as historical, in which case
  // we trust the status.
  const effectiveStatus =
    !errorsAreHistorical && recent.length > 0 && status === 'active' ? 'degraded' : status;
  const palette = (effectiveStatus && COLOR_BY_STATUS[effectiveStatus]) || FALLBACK;
  // Active = solid (the pipeline is consuming this entry). Standby = outline
  // (healthy but not currently consumed). Undefined keeps the legacy solid
  // styling for callers that don't expose the active/standby distinction.
  const dotClass =
    isActive === false ? `bg-transparent border-2 ${palette.outline}` : palette.solid;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-block shrink-0 rounded-full border',
            size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5',
            dotClass,
          )}
        />
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[360px] space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium">{label}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {status ?? 'unknown'}
            {isActive === false ? ' · stand-by' : ''}
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
