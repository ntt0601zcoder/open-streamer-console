import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ExternalLink, Loader2, Radio } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import type { Stream } from '@/api/types';
import { dashUrl, hlsUrl } from '@/lib/streamUrls';
import { RuntimeErrorIndicator } from './RuntimeErrorIndicator';
import { StreamStatusBadge } from './StreamStatusBadge';

const StreamPlayer = lazy(() =>
  import('./detail/StreamPlayer').then((m) => ({ default: m.StreamPlayer })),
);
const DashPlayer = lazy(() =>
  import('./detail/DashPlayer').then((m) => ({ default: m.DashPlayer })),
);

export type GridProto = 'hls' | 'dash';

interface StreamGridProps {
  streams: Stream[];
  filter: string;
  proto: GridProto;
}

export function StreamGrid({ streams, filter, proto }: StreamGridProps) {
  const filtered = streams
    .filter((s) => {
      if (!filter.trim()) return true;
      const q = filter.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.tags?.some((t) => t.toLowerCase().includes(q))
      );
    })
    .filter((s) => (proto === 'hls' ? s.protocols?.hls : s.protocols?.dash));

  const totalWithProto = streams.filter((s) =>
    proto === 'hls' ? s.protocols?.hls : s.protocols?.dash,
  ).length;
  const hiddenByProto = streams.length - totalWithProto;

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        {filter ? (
          <>
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm">No streams match "{filter}"</p>
          </>
        ) : (
          <>
            <Radio className="h-8 w-8" />
            <p className="text-sm">
              No streams have {proto.toUpperCase()} enabled
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {hiddenByProto > 0 && (
        <p className="text-xs text-muted-foreground">
          {hiddenByProto} stream{hiddenByProto !== 1 ? 's' : ''} hidden — {proto.toUpperCase()}{' '}
          not enabled.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filtered.map((stream) => (
          <StreamGridTile key={stream.code} stream={stream} proto={proto} />
        ))}
      </div>
    </div>
  );
}

function StreamGridTile({ stream, proto }: { stream: Stream; proto: GridProto }) {
  const status = stream.runtime?.status;
  const isRunning = status === 'active' || status === 'degraded';
  const externalUrl = proto === 'hls' ? hlsUrl(stream.code) : dashUrl(stream.code);
  // Hover-to-unmute: a grid of N tiles defaults to silent, the one under the
  // cursor speaks. Mouse leave restores the mute so the operator can pan to
  // another tile without audio overlap.
  const [hovered, setHovered] = useState(false);

  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Suspense fallback={<PlayerFallback />}>
          {proto === 'hls' ? (
            <StreamPlayer
              hlsUrl={hlsUrl(stream.code)}
              active={isRunning}
              streamCode={stream.code}
              defaultMuted
              controlledMuted={!hovered}
            />
          ) : (
            <DashPlayer
              dashUrl={dashUrl(stream.code)}
              active={isRunning}
              defaultMuted
              controlledMuted={!hovered}
            />
          )}
        </Suspense>
      </div>
      <HoverCard openDelay={250} closeDelay={120}>
        <HoverCardTrigger asChild>
          <div className="flex cursor-default items-center justify-between gap-2 px-3 py-2">
            <div className="min-w-0">
              <Link
                to={`/streams/${stream.code}`}
                className="block truncate text-sm font-medium hover:underline"
                title={stream.name || stream.code}
              >
                {stream.name || stream.code}
              </Link>
              <p className="truncate font-mono text-[11px] text-muted-foreground">
                {stream.code}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <StreamStatusBadge stream={stream} />
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in new tab"
                className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </HoverCardTrigger>
        <HoverCardContent
          side="right"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="w-[340px] border-2 bg-card p-0 text-xs"
        >
          <StreamInfoPanel stream={stream} />
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}

function PlayerFallback() {
  return (
    <div className="flex aspect-video w-full items-center justify-center bg-black">
      <Loader2 className="h-6 w-6 animate-spin text-white/40" />
    </div>
  );
}

function StreamInfoPanel({ stream }: { stream: Stream }) {
  const inputs = stream.inputs ?? [];
  const runtimeInputs = stream.runtime?.inputs ?? [];
  const activeInputPriority =
    stream.runtime?.override_input_priority ?? stream.runtime?.active_input_priority ?? null;
  const tc = stream.transcoder;
  const videoProfiles = tc?.video?.profiles ?? [];
  const videoCodec = tc?.video?.copy
    ? 'copy'
    : videoProfiles[0]?.codec || tc?.video?.profiles?.[0]?.codec || null;
  const audioCodec = tc?.audio?.copy ? 'copy' : tc?.audio?.codec || null;
  const dvr = stream.dvr;
  const enabledProtos = stream.protocols
    ? (Object.entries(stream.protocols) as [string, boolean | undefined][])
        .filter(([, v]) => v)
        .map(([k]) => k.toUpperCase())
    : [];
  const pushes = stream.push ?? [];
  const activePushes = stream.runtime?.publisher?.pushes?.filter((p) => p.status === 'active')
    .length ?? 0;
  const transcoderProfiles = stream.runtime?.transcoder?.profiles ?? [];
  const transcoderActive = !!tc && (stream.runtime?.pipeline_active ?? false);

  return (
    <div className="divide-y">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{stream.name || stream.code}</p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">{stream.code}</p>
        </div>
        <StreamStatusBadge stream={stream} />
      </div>

      <Section label="Input">
        {inputs.length === 0 ? (
          <span className="text-muted-foreground">No inputs</span>
        ) : (
          <ul className="space-y-1">
            {inputs.slice(0, 3).map((inp, i) => {
              const rt = runtimeInputs[i];
              const isActive = activeInputPriority === i;
              return (
                <li key={i} className="flex items-center gap-1.5">
                  {rt && (
                    <RuntimeErrorIndicator
                      size="sm"
                      status={rt.status}
                      errors={rt.errors}
                      label={`Input ${i + 1}${isActive ? ' (active)' : ''}`}
                      meta={rt.bitrate_kbps != null ? `${rt.bitrate_kbps} kbps` : undefined}
                    />
                  )}
                  <span className="truncate font-mono text-[11px] text-muted-foreground">
                    {inp.url}
                  </span>
                </li>
              );
            })}
            {inputs.length > 3 && (
              <li className="text-[11px] text-muted-foreground">
                +{inputs.length - 3} more
              </li>
            )}
          </ul>
        )}
      </Section>

      <Section label="Transcode">
        {!tc ? (
          <span className="text-muted-foreground">Disabled</span>
        ) : (
          <div className="space-y-1">
            {transcoderActive && transcoderProfiles.length > 0 && (
              <div className="flex items-center gap-1">
                {transcoderProfiles.map((p, i) => {
                  const errs = p.errors ?? [];
                  const restarts = p.restart_count ?? 0;
                  const label = p.track || `track_${(p.index ?? i) + 1}`;
                  const unhealthy =
                    p.status === 'unhealthy' || (!p.status && errs.length > 0);
                  return (
                    <RuntimeErrorIndicator
                      key={p.index ?? i}
                      size="sm"
                      status={unhealthy ? 'degraded' : 'active'}
                      errors={errs}
                      label={label}
                      meta={restarts > 0 ? `Restarts: ${restarts}` : undefined}
                    />
                  );
                })}
              </div>
            )}
            {(videoCodec || videoProfiles.length > 0) && (
              <p>
                <span className="text-muted-foreground">Video:</span>{' '}
                {videoCodec && <span className="font-medium">{videoCodec}</span>}
                {videoCodec && videoProfiles.length > 0 && (
                  <span className="text-muted-foreground"> · </span>
                )}
                {videoProfiles.length > 0 && (
                  <span className="font-medium">
                    {videoProfiles.length}{' '}
                    {videoProfiles.length === 1 ? 'rendition' : 'renditions'}
                  </span>
                )}
              </p>
            )}
            {audioCodec && (
              <p>
                <span className="text-muted-foreground">Audio:</span>{' '}
                <span className="font-medium">{audioCodec}</span>
              </p>
            )}
            {!videoCodec && !audioCodec && videoProfiles.length === 0 && (
              <span className="text-muted-foreground">Passthrough</span>
            )}
          </div>
        )}
      </Section>

      <Section label="DVR">
        {dvr?.enabled ? (
          <span>
            <span className="text-emerald-600 dark:text-emerald-400">Enabled</span>
            {dvr.retention_sec ? (
              <span className="text-muted-foreground"> · {dvr.retention_sec}s retention</span>
            ) : (
              <span className="text-muted-foreground"> · unlimited</span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">Disabled</span>
        )}
      </Section>

      <Section label="Output">
        {enabledProtos.length === 0 ? (
          <span className="text-muted-foreground">No output</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {enabledProtos.map((p) => (
              <Badge key={p} variant="secondary" className="h-4 px-1.5 text-[10px]">
                {p}
              </Badge>
            ))}
          </div>
        )}
        {pushes.length > 0 && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Push: {activePushes}/{pushes.filter((p) => p.enabled).length} active
          </p>
        )}
      </Section>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-3 py-2">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-xs">{children}</div>
    </div>
  );
}
