import { ArrowRight, Music, Radio, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  MediaTrackKind,
  type MediaSummary,
  type MediaTrackInfo,
} from '@/api/types';
import { cn } from '@/lib/utils';

interface MediaSummaryCardProps {
  media?: MediaSummary;
}

function formatKbps(kbps?: number): string {
  if (!kbps || kbps <= 0) return '—';
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(2)} Mbit/s`;
  return `${kbps} kbit/s`;
}

function qualityLabel(tracks: MediaTrackInfo[]): string | null {
  let maxH = 0;
  for (const t of tracks) {
    if (t.kind === MediaTrackKind.video && t.height) {
      maxH = Math.max(maxH, t.height);
    }
  }
  if (maxH === 0) return null;
  if (maxH >= 2160) return '4K';
  if (maxH >= 1080) return 'FHD';
  if (maxH >= 720) return 'HD';
  return 'SD';
}

export function MediaSummaryCard({ media }: MediaSummaryCardProps) {
  const inputs = media?.inputs ?? [];
  const outputs = media?.outputs ?? [];
  const quality = qualityLabel(inputs);

  return (
    <Card>
      <CardContent className="space-y-3 p-3">
        {/* Header: quality badge + In→Out bitrate */}
        <div className="flex items-center justify-between gap-2 text-xs">
          {quality ? (
            <Badge
              variant="outline"
              className="border-emerald-500/40 bg-emerald-500/10 text-[10px] font-semibold tracking-wide text-emerald-700 dark:text-emerald-300"
            >
              {quality}
            </Badge>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1.5 text-xs tabular-nums">
            <span className="text-sky-600 dark:text-sky-400">
              {formatKbps(media?.input_bitrate_kbps)}
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-emerald-600 dark:text-emerald-400">
              {formatKbps(media?.output_bitrate_kbps)}
            </span>
          </div>
        </div>

        {/* Two-column tracks */}
        <div className="grid grid-cols-2 gap-3">
          <TrackColumn title="Input" tracks={inputs} accent="text-sky-500" />
          <TrackColumn title="Output" tracks={outputs} accent="text-emerald-500" />
        </div>
      </CardContent>
    </Card>
  );
}

interface TrackColumnProps {
  title: string;
  tracks: MediaTrackInfo[];
  accent: string;
}

function TrackColumn({ title, tracks, accent }: TrackColumnProps) {
  return (
    <div className="space-y-1.5">
      <p
        className={cn(
          'text-[10px] font-semibold uppercase tracking-wide',
          accent,
        )}
      >
        {title} media
      </p>
      {tracks.length === 0 ? (
        <p className="text-[11px] italic text-muted-foreground">No tracks reported</p>
      ) : (
        <ul className="space-y-1">
          {tracks.map((t, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] leading-tight">
              <TrackIcon kind={t.kind} />
              <TrackLine track={t} index={trackIndex(tracks, i)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** v1, v2, a1, a2 numbering scoped per kind. */
function trackIndex(all: MediaTrackInfo[], pos: number): number {
  let n = 0;
  for (let i = 0; i <= pos; i++) {
    if (all[i]?.kind === all[pos]?.kind) n += 1;
  }
  return n;
}

function TrackIcon({ kind }: { kind?: MediaTrackKind }) {
  if (kind === MediaTrackKind.video) {
    return <Video className="mt-0.5 h-3 w-3 shrink-0 text-sky-500" />;
  }
  if (kind === MediaTrackKind.audio) {
    return <Music className="mt-0.5 h-3 w-3 shrink-0 text-purple-500" />;
  }
  return <Radio className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />;
}

function TrackLine({ track, index }: { track: MediaTrackInfo; index: number }) {
  const isVideo = track.kind === MediaTrackKind.video;
  const prefix = isVideo ? `v${index}` : track.kind === MediaTrackKind.audio ? `a${index}` : '?';
  const codec = track.codec ?? 'unknown';
  const res = isVideo && track.width && track.height ? `${track.width}×${track.height}` : '';
  const rate = track.bitrate_kbps ? `(${track.bitrate_kbps} kbit/s)` : '';
  return (
    <span className="font-mono">
      <span className="text-muted-foreground">{prefix}</span>{' '}
      <span className="uppercase">{codec}</span>{' '}
      {res && <span>{res} </span>}
      {rate && <span className="text-muted-foreground">{rate}</span>}
    </span>
  );
}
