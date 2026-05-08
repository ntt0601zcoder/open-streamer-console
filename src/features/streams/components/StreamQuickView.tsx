import { lazy, Suspense, useMemo, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import type { Stream } from '@/api/types';
import { dashUrl, hlsUrl } from '@/lib/streamUrls';
import { cn } from '@/lib/utils';

const StreamPlayer = lazy(() =>
  import('./detail/StreamPlayer').then((m) => ({ default: m.StreamPlayer })),
);
const DashPlayer = lazy(() =>
  import('./detail/DashPlayer').then((m) => ({ default: m.DashPlayer })),
);

type PlayerProto = 'hls' | 'dash';

interface StreamQuickViewProps {
  stream: Stream;
  children: React.ReactNode;
}

export function StreamQuickView({ stream, children }: StreamQuickViewProps) {
  const [open, setOpen] = useState(false);

  const status = stream.runtime?.status;
  const isRunning = status === 'active' || status === 'degraded';
  const hlsEnabled = stream.protocols?.hls ?? false;
  const dashEnabled = stream.protocols?.dash ?? false;

  const availableProtos = useMemo<PlayerProto[]>(() => {
    const out: PlayerProto[] = [];
    if (hlsEnabled) out.push('hls');
    if (dashEnabled) out.push('dash');
    return out;
  }, [hlsEnabled, dashEnabled]);

  const [proto, setProto] = useState<PlayerProto>(() => availableProtos[0] ?? 'hls');
  const effectiveProto: PlayerProto | null = availableProtos.includes(proto)
    ? proto
    : (availableProtos[0] ?? null);

  const externalUrl =
    effectiveProto === 'hls'
      ? hlsUrl(stream.code)
      : effectiveProto === 'dash'
        ? dashUrl(stream.code)
        : null;

  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={250} closeDelay={150}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="start"
        sideOffset={12}
        className="w-[420px] space-y-2 p-2"
        // Don't fire row navigation when interacting with the popover.
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="truncate text-xs font-medium">
            {stream.code}
            {stream.name && (
              <span className="ml-1.5 font-normal text-muted-foreground">· {stream.name}</span>
            )}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {availableProtos.length > 1 && effectiveProto != null && (
              <ProtocolSwitcher
                protocols={availableProtos}
                value={effectiveProto}
                onChange={setProto}
              />
            )}
            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Open in new tab"
                className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {effectiveProto == null ? (
          <NoProtocolPlaceholder />
        ) : !open ? (
          // Defer player mount to first open so we don't pay the hls.js / dashjs
          // chunk + media setup cost when the user is just scrolling the table.
          <PlayerFallback />
        ) : (
          <Suspense fallback={<PlayerFallback />}>
            {effectiveProto === 'hls' ? (
              <StreamPlayer
                hlsUrl={hlsUrl(stream.code)}
                active={isRunning}
                streamCode={stream.code}
              />
            ) : (
              <DashPlayer dashUrl={dashUrl(stream.code)} active={isRunning} />
            )}
          </Suspense>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

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
    <div className="inline-flex shrink-0 rounded border bg-muted/40 p-0.5">
      {protocols.map((p) => (
        <button
          key={p}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(p);
          }}
          className={cn(
            'rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide transition-colors',
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
      <Loader2 className="h-7 w-7 animate-spin text-white/40" />
    </div>
  );
}

function NoProtocolPlaceholder() {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-md bg-muted text-muted-foreground">
      <p className="text-xs">No browser-playable protocol</p>
      <p className="text-[10px]">Enable HLS or DASH on this stream</p>
    </div>
  );
}
