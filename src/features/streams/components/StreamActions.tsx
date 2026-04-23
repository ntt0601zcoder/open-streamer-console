import { Loader2, Play, RefreshCw, Trash2 } from 'lucide-react';
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
import { useDeleteStream, useRestartStream } from '@/features/streams/hooks/useStreams';
import type { Stream } from '@/api/types';

interface StreamActionsProps {
  stream: Stream;
}

export function StreamActions({ stream }: StreamActionsProps) {
  const navigate = useNavigate();
  const restart = useRestartStream();
  const del = useDeleteStream();

  const status = stream.runtime?.status;
  const isRunning = status === 'active' || status === 'degraded';
  const onError = (err: Error) => toast.error(err.message);

  return (
    <div className="flex items-center gap-1">
      <Button
        size="icon"
        variant={isRunning ? 'outline' : 'default'}
        className="h-7 w-7"
        disabled={restart.isPending}
        onClick={() => restart.mutate(stream.code, { onError })}
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
              onClick={() =>
                del.mutate(stream.code, {
                  onSuccess: () => void navigate('/streams'),
                  onError,
                })
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
