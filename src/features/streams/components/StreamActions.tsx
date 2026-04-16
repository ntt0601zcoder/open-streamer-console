import { Loader2, Play, Square, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useDeleteStream,
  useStartStream,
  useStopStream,
} from '@/features/streams/hooks/useStreams';
import type { Stream } from '@/api/types';

interface StreamActionsProps {
  stream: Stream;
}

export function StreamActions({ stream }: StreamActionsProps) {
  const navigate = useNavigate();
  const start = useStartStream();
  const stop = useStopStream();
  const del = useDeleteStream();

  const isRunning = stream.status === 'active' || stream.status === 'degraded';
  const isBusy = start.isPending || stop.isPending;

  function handleStartStop() {
    const onError = (err: Error) => toast.error(err.message);
    if (isRunning) {
      stop.mutate(stream.code, { onError });
    } else {
      start.mutate(stream.code, { onError });
    }
  }

  function handleDelete() {
    del.mutate(stream.code, {
      onSuccess: () => void navigate('/streams'),
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        size="icon"
        variant={isRunning ? 'destructive' : 'default'}
        className="h-7 w-7"
        disabled={isBusy}
        onClick={handleStartStop}
        title={isRunning ? 'Stop stream' : 'Start stream'}
      >
        {isBusy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isRunning ? (
          <Square className="h-3.5 w-3.5 fill-current" />
        ) : (
          <Play className="h-3.5 w-3.5 fill-current" />
        )}
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            title="Delete stream"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{stream.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the stream and all its configuration. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
