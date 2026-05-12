import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ExternalLink, Loader2, Radio } from 'lucide-react';
import type { Stream } from '@/api/types';
import { dashUrl, hlsUrl } from '@/lib/streamUrls';
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

  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <Suspense fallback={<PlayerFallback />}>
        {proto === 'hls' ? (
          <StreamPlayer
            hlsUrl={hlsUrl(stream.code)}
            active={isRunning}
            streamCode={stream.code}
            defaultMuted
          />
        ) : (
          <DashPlayer dashUrl={dashUrl(stream.code)} active={isRunning} defaultMuted />
        )}
      </Suspense>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-0">
          <Link
            to={`/streams/${stream.code}`}
            className="block truncate text-sm font-medium hover:underline"
          >
            {stream.code}
          </Link>
          {stream.name && (
            <p className="truncate text-[11px] text-muted-foreground">{stream.name}</p>
          )}
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
