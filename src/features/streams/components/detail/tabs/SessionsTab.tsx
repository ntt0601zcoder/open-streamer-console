import { useState } from 'react';
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
import { SessionProto, type PlaySession, type Stream } from '@/api/types';
import { useKickSession, useStreamSessions } from '@/features/streams/hooks/useSessions';
import { formatBytes, formatDurationSince, formatRelativeIso } from '@/lib/format';
import { cn } from '@/lib/utils';

const PROTO_ALL = '__all__';
const STATUS_ALL = '__all__';

const PROTO_OPTIONS = Object.values(SessionProto);

interface SessionsTabProps {
  stream: Stream;
}

export function SessionsTab({ stream }: SessionsTabProps) {
  const [proto, setProto] = useState<string>(PROTO_ALL);
  const [status, setStatus] = useState<string>('active');

  const { data, isLoading, error, refetch, isRefetching } = useStreamSessions(stream.code, {
    proto: proto === PROTO_ALL ? undefined : (proto as SessionProto),
    status: status === STATUS_ALL ? undefined : (status as 'active' | 'closed'),
  });

  const sessions = data?.sessions ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Play sessions</CardTitle>
              <CardDescription>
                Live and recently-closed players watching this stream. Polled every 5s.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
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

function SessionTable({ sessions }: { sessions: PlaySession[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Proto</TableHead>
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
