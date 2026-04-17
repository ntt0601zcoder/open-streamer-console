import { cn } from '@/lib/utils';
import type { Stream, StreamStatus } from '@/api/types';

interface StreamStatusBadgeProps {
  stream: Pick<Stream, 'status' | 'runtime'>;
}

type BadgeStyle = { label: string; dot: string; text: string };

const config: Record<StreamStatus, BadgeStyle> = {
  active: {
    label: 'Active',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  degraded: { label: 'Degraded', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400' },
  idle: { label: 'Idle', dot: 'bg-slate-400', text: 'text-slate-500 dark:text-slate-400' },
  stopped: { label: 'Stopped', dot: 'bg-slate-300', text: 'text-slate-400 dark:text-slate-500' },
};

const exhaustedStyle: BadgeStyle = {
  label: 'Exhausted',
  dot: 'bg-red-500',
  text: 'text-red-700 dark:text-red-400',
};

export function StreamStatusBadge({ stream }: StreamStatusBadgeProps) {
  const { label, dot, text } = stream.runtime?.exhausted
    ? exhaustedStyle
    : (config[stream.status] ?? config.idle);
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', text)}>
      <span className={cn('h-2 w-2 rounded-full', dot)} />
      {label}
    </span>
  );
}
