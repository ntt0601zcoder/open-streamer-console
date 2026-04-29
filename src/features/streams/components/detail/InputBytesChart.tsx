import { useMemo } from 'react';
import { Activity, AlertCircle } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip as InfoTooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useInputBytesRate } from '@/features/streams/hooks/useInputBytesRate';
import { cn } from '@/lib/utils';

interface InputBytesChartProps {
  streamCode: string;
}

const PROTO_COLORS: Record<string, string> = {
  rtmp: '#3b82f6',
  rtsp: '#a855f7',
  srt: '#14b8a6',
  hls: '#f97316',
  dash: '#84cc16',
  http: '#0ea5e9',
  unknown: '#6b7280',
};

function colorFor(proto: string): string {
  return PROTO_COLORS[proto] ?? '#6b7280';
}

function formatRate(bytesPerSec: number): string {
  const bits = bytesPerSec * 8;
  if (bits < 1_000) return `${bits.toFixed(0)} bps`;
  if (bits < 1_000_000) return `${(bits / 1_000).toFixed(1)} kbps`;
  if (bits < 1_000_000_000) return `${(bits / 1_000_000).toFixed(2)} Mbps`;
  return `${(bits / 1_000_000_000).toFixed(2)} Gbps`;
}

/** Compact axis label — single token, no unit suffix wrapping. "4.8M" / "120K" / "0". */
function formatRateAxis(bytesPerSec: number): string {
  const bits = bytesPerSec * 8;
  if (bits === 0) return '0';
  if (bits < 1_000) return `${bits.toFixed(0)}`;
  if (bits < 1_000_000) return `${(bits / 1_000).toFixed(0)}K`;
  if (bits < 1_000_000_000) {
    const mb = bits / 1_000_000;
    return mb >= 10 ? `${mb.toFixed(0)}M` : `${mb.toFixed(1)}M`;
  }
  const gb = bits / 1_000_000_000;
  return gb >= 10 ? `${gb.toFixed(0)}G` : `${gb.toFixed(1)}G`;
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function InputBytesChart({ streamCode }: InputBytesChartProps) {
  const { points, error, stale } = useInputBytesRate(streamCode);

  const protocols = useMemo(() => {
    const set = new Set<string>();
    for (const p of points) {
      for (const proto of Object.keys(p.byProtocol)) set.add(proto);
    }
    return [...set].sort();
  }, [points]);

  const data = useMemo(
    () =>
      points.map((p) => ({
        t: p.t,
        total: p.total,
        ...p.byProtocol,
      })),
    [points],
  );

  const latest = points.at(-1);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-1.5 text-xs font-medium">
            <Activity className="h-3.5 w-3.5 text-emerald-500" />
            Input throughput
          </CardTitle>
          {latest && (
            <div className="flex items-center gap-1.5">
              {stale && (
                <InfoTooltip>
                  <TooltipTrigger asChild>
                    <AlertCircle className="h-3 w-3 text-amber-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    No fresh sample — /metrics is failing or slow.
                  </TooltipContent>
                </InfoTooltip>
              )}
              <span
                className={cn(
                  'text-xs font-semibold tabular-nums',
                  stale
                    ? 'text-muted-foreground line-through'
                    : 'text-emerald-600 dark:text-emerald-400',
                )}
              >
                {formatRate(latest.total)}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex min-h-[200px] flex-1 flex-col p-2 pt-0">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            {error.message}
          </div>
        )}

        {!error && points.length < 2 && (
          <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
            Collecting samples…
          </div>
        )}

        {points.length >= 2 && (
          <div className="min-h-0 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="t"
                  tickFormatter={formatTime}
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  scale="time"
                  stroke="currentColor"
                  className="text-muted-foreground"
                  tick={{ fill: 'currentColor', fontSize: 9 }}
                  minTickGap={40}
                />
                <YAxis
                  tickFormatter={formatRateAxis}
                  stroke="currentColor"
                  className="text-muted-foreground"
                  tick={{ fill: 'currentColor', fontSize: 9 }}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  labelFormatter={(t) => formatTime(t as number)}
                  formatter={(value, name) =>
                    [formatRate(Number(value)), String(name)] as [string, string]
                  }
                />
                {protocols.length > 1 && (
                  <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                )}
                {protocols.length > 1 && (
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="total"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
                {protocols.map((proto) => (
                  <Line
                    key={proto}
                    type="monotone"
                    dataKey={proto}
                    name={proto}
                    stroke={colorFor(proto)}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
