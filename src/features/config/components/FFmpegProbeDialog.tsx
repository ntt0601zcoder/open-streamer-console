import { AlertTriangle, CheckCircle2, FlaskConical, Loader2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { ProbeResult } from '@/api/config';
import { useProbeTranscoder } from '@/features/config/hooks/useServerConfig';
import { cn } from '@/lib/utils';

interface FFmpegProbeDialogProps {
  /** Path to probe; empty string = use $PATH. */
  ffmpegPath: string;
}

export function FFmpegProbeDialog({ ffmpegPath }: FFmpegProbeDialogProps) {
  const probe = useProbeTranscoder();
  const result = probe.data;

  function run() {
    probe.mutate({ ffmpeg_path: ffmpegPath });
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open && !probe.data && !probe.isPending) run();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FlaskConical className="h-4 w-4" />
          Probe FFmpeg
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            FFmpeg compatibility check
            {result &&
              (result.ok ? (
                <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">OK</Badge>
              ) : (
                <Badge variant="destructive">Issues</Badge>
              ))}
          </DialogTitle>
          <DialogDescription>
            Inspects the binary at <code className="font-mono">{ffmpegPath || '$PATH'}</code> and
            reports which encoders &amp; muxers are available. Read-only check; nothing is changed.
          </DialogDescription>
        </DialogHeader>

        {probe.isPending && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Probing…
          </div>
        )}

        {probe.error && !probe.isPending && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-destructive">
              {probe.error instanceof Error ? probe.error.message : 'Probe failed'}
            </p>
          </div>
        )}

        {result && !probe.isPending && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md border bg-muted/40 p-3 text-xs">
              <span className="text-muted-foreground">Path</span>
              <span className="break-all font-mono">{result.path || '—'}</span>
              <span className="text-muted-foreground">Version</span>
              <span className="break-all font-mono">{result.version || '—'}</span>
            </div>

            {(result.errors?.length ?? 0) > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-destructive">
                  Errors
                </p>
                <ul className="space-y-1">
                  {result.errors!.map((e, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs"
                    >
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                      <span className="break-words font-mono">{e}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(result.warnings?.length ?? 0) > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  Warnings
                </p>
                <ul className="space-y-1">
                  {result.warnings!.map((w, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs"
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <span className="break-words font-mono">{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <EncoderTable encoders={result.encoders} />
            <MuxerTable muxers={result.muxers} />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={run} disabled={probe.isPending}>
            {probe.isPending ? 'Probing…' : 'Re-probe'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EncoderTable({ encoders }: { encoders?: ProbeResult['encoders'] }) {
  if (!encoders || Object.keys(encoders).length === 0) return null;
  // Collect every hw column that appears in any codec row, preserve order seen.
  const hwSet: string[] = [];
  for (const row of Object.values(encoders)) {
    for (const hw of Object.keys(row)) {
      if (!hwSet.includes(hw)) hwSet.push(hw);
    }
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Encoders</p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-xs">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-1.5 text-left font-medium">Codec</th>
              {hwSet.map((hw) => (
                <th key={hw} className="px-3 py-1.5 text-left font-medium font-mono">
                  {hw}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {Object.entries(encoders).map(([codec, row]) => (
              <tr key={codec}>
                <td className="px-3 py-1.5 font-mono">{codec}</td>
                {hwSet.map((hw) => (
                  <td key={hw} className="px-3 py-1.5">
                    <SupportIcon ok={row[hw]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MuxerTable({ muxers }: { muxers?: ProbeResult['muxers'] }) {
  if (!muxers || Object.keys(muxers).length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Muxers</p>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(muxers).map(([name, ok]) => (
          <Badge
            key={name}
            variant="outline"
            className={cn(
              'gap-1 font-mono',
              ok
                ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : 'border-destructive/40 text-destructive',
            )}
          >
            <SupportIcon ok={ok} />
            {name}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function SupportIcon({ ok }: { ok: boolean | undefined }) {
  return ok ? (
    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
  ) : (
    <XCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
  );
}
