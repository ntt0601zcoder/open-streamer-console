import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Stream } from '@/api/types';
import { useDeleteStream, useRestartStream } from '@/features/streams/hooks/useStreams';

export type StreamAction = 'delete' | 'restart';

interface ActionCopy {
  title: (name: string) => string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  successMessage: (code: string) => string;
  variant: 'destructive' | 'default';
}

const COPY: Record<StreamAction, ActionCopy> = {
  delete: {
    title: (n) => `Delete "${n}"?`,
    description:
      'This permanently deletes the stream and all of its configuration. This action cannot be undone.',
    confirmLabel: 'Delete',
    pendingLabel: 'Deleting…',
    successMessage: (c) => `Stream "${c}" deleted`,
    variant: 'destructive',
  },
  restart: {
    title: (n) => `Restart "${n}"?`,
    description:
      'This stops the current pipeline and starts it again. Live viewers may briefly drop.',
    confirmLabel: 'Restart',
    pendingLabel: 'Restarting…',
    successMessage: (c) => `Stream "${c}" restarted`,
    variant: 'default',
  },
};

interface StreamActionConfirmDialogProps {
  stream: Pick<Stream, 'code' | 'name'>;
  action: StreamAction;
  trigger: ReactNode;
  /** Optional path to navigate to after success (e.g. '/streams' after delete). */
  redirectTo?: string;
}

export function StreamActionConfirmDialog({
  stream,
  action,
  trigger,
  redirectTo,
}: StreamActionConfirmDialogProps) {
  const navigate = useNavigate();
  const del = useDeleteStream();
  const restart = useRestartStream();
  const mut = action === 'delete' ? del : restart;
  const copy = COPY[action];

  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const matches = confirmText === stream.code;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setConfirmText('');
  }

  function handleConfirm() {
    if (!matches) return;
    mut.mutate(stream.code, {
      onSuccess: () => {
        toast.success(copy.successMessage(stream.code));
        setOpen(false);
        if (redirectTo) navigate(redirectTo);
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : `${copy.confirmLabel} failed`),
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title(stream.name)}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          <Label htmlFor={`confirm-${action}-code`} className="text-sm font-normal">
            Type{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">
              {stream.code}
            </code>{' '}
            to confirm:
          </Label>
          <Input
            id={`confirm-${action}-code`}
            autoFocus
            placeholder={stream.code}
            className="font-mono"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matches && !mut.isPending) handleConfirm();
            }}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={copy.variant}
            disabled={!matches || mut.isPending}
            onClick={handleConfirm}
          >
            {mut.isPending ? copy.pendingLabel : copy.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
