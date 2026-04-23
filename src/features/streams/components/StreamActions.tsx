import { Loader2, Play, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRestartStream } from '@/features/streams/hooks/useStreams';
import { StreamActionConfirmDialog } from '@/features/streams/components/StreamActionConfirmDialog';
import type { Stream } from '@/api/types';

interface StreamActionsProps {
  stream: Stream;
}

export function StreamActions({ stream }: StreamActionsProps) {
  const restart = useRestartStream();

  const status = stream.runtime?.status;
  const isRunning = status === 'active' || status === 'degraded';

  return (
    <div className="flex items-center gap-1">
      <StreamActionConfirmDialog
        stream={stream}
        action="restart"
        trigger={
          <Button
            size="icon"
            variant={isRunning ? 'outline' : 'default'}
            className="h-7 w-7"
            disabled={restart.isPending}
            onClick={(e) => e.stopPropagation()}
            title={isRunning ? 'Restart stream' : 'Start stream'}
          >
            {restart.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isRunning ? (
              <RefreshCw className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
          </Button>
        }
      />

      <StreamActionConfirmDialog
        stream={stream}
        action="delete"
        trigger={
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            title="Delete stream"
            onClick={(e) => e.stopPropagation()}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        }
      />
    </div>
  );
}
