import { lazy, Suspense, useMemo, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Stream } from '@/api/types';
import { dashUrl, hlsUrl } from '@/lib/streamUrls';
import { cn } from '@/lib/utils';
import { useConfigDefaults } from '@/features/config/hooks/useServerConfig';
import { useRecordingInfo } from '@/features/streams/hooks/useRecordingInfo';
import { InputBytesChart } from './InputBytesChart';
import { MediaSummaryCard } from './MediaSummaryCard';

// Lazy-load each player so the heavy media library (hls.js / dashjs) is only
// fetched when the operator selects that protocol — keeps the main stream-detail
// bundle slim.
const StreamPlayer = lazy(() =>
  import('./StreamPlayer').then((m) => ({ default: m.StreamPlayer })),
);
const DashPlayer = lazy(() =>
  import('./DashPlayer').then((m) => ({ default: m.DashPlayer })),
);

interface StreamPreviewProps {
  stream: Stream;
}

type PlayerProto = 'hls' | 'dash';

export function StreamPreview({ stream }: StreamPreviewProps) {
  const status = stream.runtime?.status;
  const isRunning = status === 'active' || status === 'degraded';
  const hlsEnabled = stream.protocols?.hls ?? false;
  const dashEnabled = stream.protocols?.dash ?? false;
  const dvrEnabled = stream.dvr?.enabled ?? false;

  const availableProtos = useMemo<PlayerProto[]>(() => {
    const out: PlayerProto[] = [];
    if (hlsEnabled) out.push('hls');
    if (dashEnabled) out.push('dash');
    return out;
  }, [hlsEnabled, dashEnabled]);

  const [proto, setProto] = useState<PlayerProto>(() => availableProtos[0] ?? 'hls');
  // If protocols are toggled off live, fall back to whichever is still on.
  const effectiveProto: PlayerProto | null = availableProtos.includes(proto)
    ? proto
    : (availableProtos[0] ?? null);

  const { data: recordingInfo } = useRecordingInfo(
    stream.code,
    dvrEnabled && hlsEnabled && effectiveProto === 'hls',
  );
  const { data: defaults } = useConfigDefaults();
  const segmentDurationSec =
    (stream.dvr?.segment_duration && stream.dvr.segment_duration > 0
      ? stream.dvr.segment_duration
      : defaults?.dvr?.segment_duration) ?? 4;

  const externalUrl =
    effectiveProto === 'hls'
      ? hlsUrl(stream.code)
      : effectiveProto === 'dash'
        ? dashUrl(stream.code)
        : null;

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* Player */}
      <Card className="lg:col-span-3">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Preview</CardTitle>
            {isRunning && externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Open in player
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {effectiveProto == null ? (
            <NoProtocolPlaceholder />
          ) : (
            <Suspense fallback={<PlayerFallback />}>
              {effectiveProto === 'hls' ? (
                <StreamPlayer
                  hlsUrl={hlsUrl(stream.code)}
                  active={isRunning}
                  streamCode={stream.code}
                  recordingInfo={recordingInfo}
                  segmentDurationSec={segmentDurationSec}
                />
              ) : (
                <DashPlayer dashUrl={dashUrl(stream.code)} active={isRunning} />
              )}
            </Suspense>
          )}

          {availableProtos.length > 1 && (
            <ProtocolSwitcher
              protocols={availableProtos}
              value={effectiveProto ?? availableProtos[0]!}
              onChange={setProto}
            />
          )}
        </CardContent>
      </Card>

      {/* Right column: media summary + throughput chart */}
      <div className="flex flex-col gap-3 lg:col-span-2">
        <MediaSummaryCard media={stream.runtime?.media} />
        <div className="min-h-0 flex-1">
          <InputBytesChart streamCode={stream.code} />
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ProtocolSwitcher({
  protocols,
  value,
  onChange,
}: {
  protocols: PlayerProto[];
  value: PlayerProto;
  onChange: (p: PlayerProto) => void;
}) {
  return (
    <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
      {protocols.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn(
            'rounded px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors',
            value === p
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

function PlayerFallback() {
  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-md bg-black">
      <Loader2 className="h-8 w-8 animate-spin text-white/40" />
    </div>
  );
}

function NoProtocolPlaceholder() {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-md bg-muted text-muted-foreground">
      <p className="text-sm">No browser-playable protocol enabled</p>
      <p className="text-xs">Enable HLS or DASH in the Output tab to view the preview</p>
    </div>
  );
}
