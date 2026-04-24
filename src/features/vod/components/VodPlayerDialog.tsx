import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { absoluteUrl, vodApi, type VODFileEntry } from '@/api/vod';
import { copyText } from '@/lib/clipboard';
import { VodFilePlayer } from './VodFilePlayer';

interface VodPlayerDialogProps {
  mountName: string;
  file: VODFileEntry;
  onClose: () => void;
}

export function VodPlayerDialog({ mountName, file, onClose }: VodPlayerDialogProps) {
  const playSrc = file.play_url ? absoluteUrl(file.play_url) : vodApi.rawUrl(mountName, file.path);
  const ingestUrl = file.ingest_url;

  async function copy(value: string, label: string) {
    const ok = await copyText(value);
    if (ok) toast.success(`${label} copied`);
    else toast.error('Copy failed — your browser blocked clipboard access');
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate font-mono text-sm" title={file.path}>
            {file.path}
          </DialogTitle>
        </DialogHeader>

        <VodFilePlayer src={playSrc} />

        <div className="space-y-3 pt-2">
          <UrlRow
            label="Play URL"
            value={playSrc}
            onCopy={() => void copy(playSrc, 'Play URL')}
          />
          {ingestUrl && (
            <UrlRow
              label="Ingest URL"
              value={ingestUrl}
              onCopy={() => void copy(ingestUrl, 'Ingest URL')}
              hint="Use as a stream input to re-broadcast this file"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UrlRow({
  label,
  value,
  onCopy,
  hint,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  hint?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex items-center gap-1">
        <code className="flex-1 truncate rounded-md border bg-muted/50 px-2 py-1.5 font-mono text-xs">
          {value}
        </code>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0"
          onClick={onCopy}
          title="Copy"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" asChild title="Open">
          <a href={value} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}
