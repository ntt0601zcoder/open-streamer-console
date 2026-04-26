import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  CheckCircle2,
  Clock,
  ListMinus,
  ListPlus,
  Play,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { SwitchEvent, SwitchReason } from '@/api/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRelativeIso } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ReasonStyle {
  icon: LucideIcon;
  label: string;
  /** Tailwind classes for icon color. */
  tone: string;
}

const REASON: Record<SwitchReason, ReasonStyle> = {
  initial: { icon: Play, label: 'Initial', tone: 'text-muted-foreground' },
  error: { icon: AlertTriangle, label: 'Error', tone: 'text-red-500' },
  timeout: { icon: Clock, label: 'Timeout', tone: 'text-amber-500' },
  manual: { icon: UserRound, label: 'Manual', tone: 'text-blue-500' },
  failback: { icon: ArrowDownToLine, label: 'Failback', tone: 'text-emerald-500' },
  recovery: { icon: CheckCircle2, label: 'Recovery', tone: 'text-emerald-500' },
  input_added: { icon: ListPlus, label: 'Input added', tone: 'text-muted-foreground' },
  input_removed: { icon: ListMinus, label: 'Input removed', tone: 'text-muted-foreground' },
};

function endpointLabel(idx: number | undefined): string {
  return idx == null || idx < 0 ? '—' : `Input ${idx + 1}`;
}

interface InputSwitchHistoryProps {
  switches: SwitchEvent[];
}

export function InputSwitchHistory({ switches }: InputSwitchHistoryProps) {
  if (switches.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent input switches</CardTitle>
        <CardDescription>
          Rolling history of active-input changes (newest first, capped server-side).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {switches.map((sw, i) => {
          const style = sw.reason ? REASON[sw.reason] : undefined;
          const Icon = style?.icon;
          return (
            <div
              key={`${sw.at}-${i}`}
              className="flex items-start gap-3 rounded-md border bg-muted/30 px-3 py-2"
            >
              {Icon && (
                <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', style?.tone)} />
              )}
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">{endpointLabel(sw.from)}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{endpointLabel(sw.to)}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{style?.label ?? sw.reason ?? '—'}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {formatRelativeIso(sw.at)}
                  </span>
                </div>
                {sw.detail && (
                  <p className="break-words font-mono text-[11px] text-muted-foreground">
                    {sw.detail}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
