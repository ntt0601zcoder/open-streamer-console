import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Lock, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SessionProto, type PlaySession, type SessionStats } from '@/api/types';
import { useKickSession, useSessions } from '@/features/streams/hooks/useSessions';
import { formatBytes, formatDurationSince, formatRelativeIso } from '@/lib/format';
import { cn } from '@/lib/utils';

const PROTO_ALL = '__all__';
const STATUS_ALL = '__all__';

const PROTO_OPTIONS = Object.values(SessionProto);

export function SessionsPage() {
  const [proto, setProto] = useState<string>(PROTO_ALL);
  const [status, setStatus] = useState<string>('active');
  const [streamFilter, setStreamFilter] = useState<string>('');

  const { data, isLoading, error, refetch, isRefetching } = useSessions({
    proto: proto === PROTO_ALL ? undefined : (proto as SessionProto),
    status: status === STATUS_ALL ? undefined : (status as 'active' | 'closed'),
  });

  const allSessions = data?.sessions ?? [];
  const sessions = streamFilter
    ? allSessions.filter((s) =>
        s.stream_code.toLowerCase().includes(streamFilter.toLowerCase()),
      )
    : allSessions;
  const stats = data?.stats;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Sessions</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Live and recently-closed players across every stream. Polled every 5 s.
        </p>
      </div>

      <StatsBar stats={stats} />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">All sessions</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                placeholder="Filter by stream code…"
                value={streamFilter}
                onChange={(e) => setStreamFilter(e.target.value)}
                className="h-8 rounded-md border bg-background px-3 text-xs placeholder:italic placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Select value={proto} onValueChange={setProto}>
                <SelectTrigger className="h-8 w-[110px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PROTO_ALL}>All protocols</SelectItem>
                  {PROTO_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p} className="font-mono uppercase">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 w-[110px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={STATUS_ALL}>All status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => void refetch()}
                disabled={isRefetching}
                title="Refresh"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isRefetching && 'animate-spin')} />
              </Button>
            </div>
          </div>
          <CardDescription className="mt-2">
            {sessions.length === allSessions.length
              ? `${sessions.length} session${sessions.length === 1 ? '' : 's'}`
              : `${sessions.length} of ${allSessions.length} session${
                  allSessions.length === 1 ? '' : 's'
                } match`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error instanceof Error ? error.message : 'Failed to load sessions'}
            </div>
          )}

          {isLoading && !data && (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading sessions…
            </div>
          )}

          {data && sessions.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No sessions match the current filter.
            </p>
          )}

          {sessions.length > 0 && <SessionTable sessions={sessions} />}
        </CardContent>
      </Card>
    </div>
  );
}

function StatsBar({ stats }: { stats?: SessionStats }) {
  if (!stats) return null;
  const items = [
    { label: 'Active', value: stats.active ?? 0, accent: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Opened total', value: stats.opened_total ?? 0 },
    { label: 'Closed total', value: stats.closed_total ?? 0 },
    { label: 'Idle-closed', value: stats.idle_closed_total ?? 0 },
    { label: 'Kicked', value: stats.kicked_total ?? 0 },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {items.map((it) => (
        <Card key={it.label}>
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{it.label}</p>
            <p className={cn('text-xl font-semibold', it.accent)}>{it.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SessionTable({ sessions }: { sessions: PlaySession[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Proto</TableHead>
            <TableHead>Stream</TableHead>
            <TableHead>Identity</TableHead>
            <TableHead className="hidden md:table-cell">User-Agent</TableHead>
            <TableHead className="text-right">Bytes</TableHead>
            <TableHead>Open</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[60px] text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SessionRow({ session }: { session: PlaySession }) {
  const kick = useKickSession();
  const isActive = !session.closed_at;
  const uptime = session.opened_at ? formatDurationSince(session.opened_at) : '—';

  function handleKick() {
    kick.mutate(session.id, {
      onSuccess: () => toast.success(`Session ${shortId(session.id)} kicked`),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Kick failed'),
    });
  }

  return (
    <TableRow>
      <TableCell>
        <Badge variant="secondary" className="font-mono uppercase">
          {session.proto}
        </Badge>
        {session.secure && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Lock className="ml-1 inline h-3 w-3 text-emerald-500" />
            </TooltipTrigger>
            <TooltipContent>TLS / SRTS / RTMPS</TooltipContent>
          </Tooltip>
        )}
      </TableCell>
      <TableCell>
        <Link
          to={`/streams/${session.stream_code}`}
          className="font-mono text-xs hover:underline"
        >
          {session.stream_code}
        </Link>
      </TableCell>
      <TableCell className="space-y-0.5">
        <div className="flex items-center gap-1.5 text-xs">
          {session.country && (
            <Badge variant="outline" className="h-4 px-1 text-[10px] font-mono">
              {session.country}
            </Badge>
          )}
          <span className="font-mono">{session.ip || '—'}</span>
        </div>
        {session.user_name && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{session.user_name}</span>
            {session.named_by && (
              <span className="ml-1 text-[10px]">· {session.named_by}</span>
            )}
          </p>
        )}
      </TableCell>
      <TableCell className="hidden max-w-[280px] md:table-cell">
        <p className="truncate text-xs text-muted-foreground" title={session.user_agent}>
          {session.user_agent || '—'}
        </p>
      </TableCell>
      <TableCell className="text-right font-mono text-xs">
        {session.bytes != null ? formatBytes(session.bytes) : '—'}
      </TableCell>
      <TableCell>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs text-muted-foreground">{uptime}</span>
          </TooltipTrigger>
          <TooltipContent>
            opened {session.opened_at ? formatRelativeIso(session.opened_at) : '—'}
          </TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell>
        {isActive ? (
          <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">active</Badge>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="cursor-help">
                {session.close_reason ?? 'closed'}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              closed {session.closed_at ? formatRelativeIso(session.closed_at) : ''}
            </TooltipContent>
          </Tooltip>
        )}
      </TableCell>
      <TableCell className="text-right">
        {isActive && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={handleKick}
            disabled={kick.isPending && kick.variables === session.id}
            title="Kick session"
          >
            {kick.isPending && kick.variables === session.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function shortId(id: string): string {
  return id.length > 12 ? id.slice(0, 12) + '…' : id;
}
