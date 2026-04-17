import { cn } from '@/lib/utils';
import type { StreamStatus } from '@/api/types';

interface StreamStatusBadgeProps {
  status: StreamStatus;
}

const config: Record<StreamStatus, { label: string; dot: string; text: string }> = {
  active: {
    label: 'Active',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  degraded: { label: 'Degraded', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400' },
  idle: { label: 'Idle', dot: 'bg-slate-400', text: 'text-slate-500 dark:text-slate-400' },
  stopped: { label: 'Stopped', dot: 'bg-slate-300', text: 'text-slate-400 dark:text-slate-500' },
};

export function StreamStatusBadge({ status }: StreamStatusBadgeProps) {
  const { label, dot, text } = config[status] ?? config.idle;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', text)}>
      <span className={cn('h-2 w-2 rounded-full', dot)} />
      {label}
    </span>
  );
}
