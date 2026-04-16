import { ChevronRight, Loader2, Play, RefreshCw, Square } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Stream } from '@/api/types';
import {
  useStartStream,
  useStopStream,
} from '@/features/streams/hooks/useStreams';
import { StreamStatusBadge } from '../StreamStatusBadge';

interface StreamDetailHeaderProps {
  stream: Stream;
}

export function StreamDetailHeader({ stream }: StreamDetailHeaderProps) {
  const start = useStartStream();
  const stop = useStopStream();

  const isRunning = stream.status === 'active' || stream.status === 'degraded';
  const isBusy = start.isPending || stop.isPending;

  function handleStartStop() {
    if (isRunning) {
      stop.mutate(stream.code);
    } else {
      start.mutate(stream.code);
    }
  }

  async function handleRestart() {
    await stop.mutateAsync(stream.code);
    start.mutate(stream.code);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/streams" className="hover:text-foreground transition-colors">
          Streams
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">{stream.code}</span>
      </nav>

      {/* Title row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-2xl font-semibold truncate">{stream.name}</h1>
          <StreamStatusBadge status={stream.status} />
          {stream.disabled && (
            <Badge variant="outline" className="text-muted-foreground">
              disabled
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isRunning && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={isBusy}
              onClick={() => void handleRestart()}
            >
              {stop.isPending && start.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Restart
            </Button>
          )}

          <Button
            size="sm"
            variant={isRunning ? 'destructive' : 'default'}
            className="gap-2"
            disabled={isBusy}
            onClick={handleStartStop}
          >
            {isBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isRunning ? (
              <Square className="h-3.5 w-3.5 fill-current" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            {isRunning ? 'Stop' : 'Start'}
          </Button>
        </div>
      </div>
    </div>
  );
}
