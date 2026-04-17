import { ChevronRight, Loader2, Play, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Stream } from '@/api/types';
import { useRestartStream } from '@/features/streams/hooks/useStreams';
import { StreamStatusBadge } from '../StreamStatusBadge';

interface StreamDetailHeaderProps {
  stream: Stream;
}

export function StreamDetailHeader({ stream }: StreamDetailHeaderProps) {
  const restart = useRestartStream();
  const isRunning = stream.status === 'active' || stream.status === 'degraded';

  return (
    <div className="flex flex-col gap-3">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/streams" className="hover:text-foreground transition-colors">
          Streams
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">{stream.code}</span>
      </nav>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-2xl font-semibold truncate">{stream.name}</h1>
          <StreamStatusBadge stream={stream} />
          {stream.disabled && (
            <Badge variant="outline" className="text-muted-foreground">
              disabled
            </Badge>
          )}
        </div>

        <Button
          size="sm"
          variant={isRunning ? 'outline' : 'default'}
          className="gap-2 shrink-0"
          disabled={restart.isPending}
          onClick={() =>
            restart.mutate(stream.code, {
              onError: (err) => toast.error(err.message),
            })
          }
        >
          {restart.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isRunning ? (
            <RefreshCw className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current" />
          )}
          {isRunning ? 'Restart' : 'Start'}
        </Button>
      </div>
    </div>
  );
}
