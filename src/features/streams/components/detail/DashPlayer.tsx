import { useEffect, useRef, useState } from 'react';
import { MediaPlayer, type MediaPlayerClass, type Representation } from 'dashjs';
import { Loader2, RefreshCw, Settings, VideoOff, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePlayerVolume } from '@/features/streams/hooks/usePlayerVolume';
import { VolumeControl } from './VolumeControl';

type PlayerState = 'loading' | 'playing' | 'retrying' | 'error';

const AUTO = '__auto__';

function formatRep(r: Representation): string {
  const height = r.height || undefined;
  const mbps = r.bitrateInKbit ? (r.bitrateInKbit / 1000).toFixed(1) : null;
  if (height && mbps) return `${height}p · ${mbps} Mbps`;
  if (height) return `${height}p`;
  if (mbps) return `${mbps} Mbps`;
  return r.id;
}

interface DashPlayerProps {
  dashUrl: string;
  active: boolean;
  /** Start muted (default false). Used by the grid view to prevent N tiles
      blasting audio simultaneously. */
  defaultMuted?: boolean;
  /** Parent-controlled mute override (e.g. hover-to-unmute in the grid). */
  controlledMuted?: boolean;
}

export function DashPlayer({ dashUrl, active, defaultMuted, controlledMuted }: DashPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<MediaPlayerClass | null>(null);
  const [state, setState] = useState<PlayerState>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  // Video representations + the operator's pick. `selected === AUTO` means
  // adaptive (dashjs ABR re-enabled); otherwise a pinned representation id.
  const [videoReps, setVideoReps] = useState<Representation[]>([]);
  const [selectedRepId, setSelectedRepId] = useState<string>(AUTO);
  // The representation actually on screen — drives the "Auto (720p)" label.
  const [currentRepId, setCurrentRepId] = useState<string | null>(null);
  const {
    volume,
    muted,
    setVolume,
    setMuted,
    toggleMute,
    apply: applyVolume,
  } = usePlayerVolume({
    defaultMuted,
    controlledMuted,
  });

  // Reflect volume/muted onto the <video> as state changes.
  useEffect(() => {
    applyVolume(videoRef);
  }, [applyVolume]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active) return;
    setState('loading');
    setErrorMsg('');

    const player = MediaPlayer().create();
    playerRef.current = player;
    setVideoReps([]);
    setSelectedRepId(AUTO);
    setCurrentRepId(null);

    function refreshRepresentations() {
      try {
        const reps = player.getRepresentationsByType('video') ?? [];
        // Sort ascending by bitrate so the dropdown reads low → high.
        const sorted = [...reps].sort((a, b) => (a.bitrateInKbit ?? 0) - (b.bitrateInKbit ?? 0));
        setVideoReps(sorted);
        // ABR is on by default — keep the dropdown on "Auto" and only track
        // which representation is currently on screen for the label.
        const cur = player.getCurrentRepresentationForType('video');
        if (cur?.id) setCurrentRepId(cur.id);
      } catch {
        /* representations not ready yet — STREAM_INITIALIZED retries */
      }
    }

    function onPlaying() {
      setState('playing');
      setErrorMsg('');
    }
    function onCanplay() {
      // Browsers block unmuted autoplay until the user has interacted with
      // the page. Try playing as-is; if blocked, fall back to muted so the
      // operator at least sees video and can unmute via the volume control.
      if (!video) return;
      void video.play().catch(() => {
        if (!video) return;
        video.muted = true;
        setMuted(true);
        void video.play().catch(() => {});
      });
    }
    function onVideoError() {
      const err = video?.error;
      setErrorMsg(err ? `Video error (code ${err.code}): ${err.message}` : 'Video error');
      setState('error');
    }
    function onDashError(e: unknown) {
      const obj = e as { error?: unknown; event?: { message?: string }; message?: string };
      const inner = obj?.error;
      const msg =
        (typeof inner === 'object' && inner && 'message' in inner
          ? String((inner as { message?: string }).message ?? '')
          : '') ||
        obj?.event?.message ||
        obj?.message ||
        'DASH error';
      setErrorMsg(msg);
      setState('error');
    }

    video.addEventListener('playing', onPlaying);
    video.addEventListener('canplay', onPlaying);
    video.addEventListener('canplay', onCanplay);
    video.addEventListener('error', onVideoError);
    const events = MediaPlayer.events as unknown as Record<string, string>;
    if (events.ERROR) player.on(events.ERROR, onDashError);
    // Representations become known once the stream initialises; keep the
    // dropdown's "current" label in sync as ABR / manual switches render.
    if (events.STREAM_INITIALIZED) player.on(events.STREAM_INITIALIZED, refreshRepresentations);
    if (events.QUALITY_CHANGE_RENDERED) {
      player.on(events.QUALITY_CHANGE_RENDERED, (e: unknown) => {
        const rep = (e as { newRepresentation?: { id?: string } })?.newRepresentation;
        if (rep?.id) setCurrentRepId(rep.id);
      });
    }
    // Belt-and-suspenders: dashjs's own PLAYBACK_PLAYING fires even in
    // edge cases where the <video> element doesn't surface a 'playing'
    // event (e.g. seek-on-attach into an already-buffered range). Without
    // this, the spinner could remain on screen despite playback running.
    if (events.PLAYBACK_PLAYING) player.on(events.PLAYBACK_PLAYING, onPlaying);
    // Autoplay rejection in v5 is reported via PLAYBACK_NOT_ALLOWED rather
    // than the <video> 'play()' rejection — handle it identically (mute,
    // retry) so the user sees video instead of a stuck loading state.
    if (events.PLAYBACK_NOT_ALLOWED) {
      player.on(events.PLAYBACK_NOT_ALLOWED, () => {
        const v = videoRef.current;
        if (!v) return;
        v.muted = true;
        setMuted(true);
        void v.play().catch(() => {});
      });
    }

    // dashjs v5 prefers the explicit attachView + attachSource pattern over
    // the legacy three-arg initialize() — the latter occasionally races with
    // the manifest fetch in StrictMode (double-mount in dev), leaving the
    // <video> element unwired.
    player.initialize();
    // Open-Streamer's DASH packager emits MPDs whose segment timeline
    // can drift ahead of wallclock when input bursts push frames in
    // batches — dashjs computes target playback time as
    //   (now − AST) − liveDelay
    // so a too-large liveDelay lands BEFORE the earliest available
    // segment in the manifest (gap_first can be as small as ~−3 s
    // empirically) and dashjs hangs at "manifest-loaded, waiting for
    // liveDelay-aligned segment". The manifest's PT12S SPD overshoots
    // for the same reason, so we ignore it and pick liveDelay by hand.
    //
    // Going too tight (liveDelay ≤ 3 s, less than one segment of
    // headroom) on the other hand causes frequent stalls — any
    // segment-arrival jitter or PTS discontinuity from the upstream
    // pull starves the playback head and dashjs visibly freezes then
    // skips a segment via the gap jumper. ~1.5 segments of headroom
    // (6 s on a 4 s-segment ladder) keeps the buffer non-empty without
    // overshooting the available window.
    //
    //   - useSuggestedPresentationDelay=false: SPD=12s lands before our
    //     content window for this server's packager.
    //   - liveDelay=6: 1.5 segments behind live — enough headroom for
    //     normal jitter without landing before the available window.
    //   - liveCatchup: smooth speed-up / slow-down (±5 %) so drift
    //     correction happens gradually instead of via hard seeks.
    //   - initialBufferLevel=2: wait for ~half a segment of buffer
    //     before playing so we don't immediately stall on a fast start.
    //   - jumpGaps / jumpLargeGaps: still recover from real holes the
    //     PTS rebaser produces during upstream resyncs, but with the
    //     larger headroom they fire much less often.
    // Stability over latency: the prior aggressive config (liveDelay=2 +
    // jumpGaps) chased the live edge so tightly that PTS jitter from the
    // upstream pull caused frequent freeze-then-skip behaviour. Native /
    // VLC playback of the same MPD was smooth, so the fix is to relax
    // dashjs rather than touch the server.
    //
    //   - liveDelay=10: ~2.5 segments of headroom (matches MPD SPD=12s
    //     within margin) so normal segment-arrival jitter never starves
    //     the playback head.
    //   - liveCatchup ±5 %: drift correction by gentle rate adjustment.
    //   - buffer: keep ~12 s ahead of playhead, 4 s of startup buffer.
    //   - gaps.jumpGaps OFF: dashjs's gap jumper was the visible
    //     "freeze + jump 1 segment" symptom. With a larger live delay
    //     the buffer absorbs small holes, so disable the hard seek.
    //     jumpLargeGaps stays on as a last-resort recovery.
    //   - abr.autoSwitchBitrate.video ON: adaptive quality by default so the
    //     player picks the rendition that fits the client's bandwidth. The
    //     quality dropdown lets operators pin a specific rendition (which
    //     flips this off for the session) or return to Auto.
    player.updateSettings({
      streaming: {
        delay: {
          useSuggestedPresentationDelay: false,
          liveDelay: 10,
        },
        liveCatchup: {
          enabled: true,
          playbackRate: { min: -0.05, max: 0.05 },
        },
        buffer: {
          initialBufferLevel: 4,
          bufferTimeAtTopQuality: 12,
          bufferTimeAtTopQualityLongForm: 12,
          fastSwitchEnabled: false,
        },
        gaps: {
          jumpGaps: false,
          jumpLargeGaps: true,
        },
        abr: {
          autoSwitchBitrate: { video: true, audio: false },
        },
      },
    });
    player.setAutoPlay(true);
    player.attachView(video);
    player.attachSource(dashUrl);

    return () => {
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('canplay', onPlaying);
      video.removeEventListener('canplay', onCanplay);
      video.removeEventListener('error', onVideoError);
      try {
        player.reset();
      } catch {
        /* noop */
      }
      playerRef.current = null;
    };
  }, [dashUrl, active]);

  function manualRetry() {
    const video = videoRef.current;
    const player = playerRef.current;
    if (!video || !player) return;
    setState('loading');
    try {
      player.attachSource(dashUrl);
    } catch {
      setState('error');
    }
  }

  function selectQuality(value: string) {
    const player = playerRef.current;
    if (!player) return;
    setSelectedRepId(value);
    if (value === AUTO) {
      // Re-enable adaptive switching (off by default for grid stability).
      player.updateSettings({
        streaming: { abr: { autoSwitchBitrate: { video: true } } },
      });
      return;
    }
    // Pin a rendition: disable ABR first so it doesn't immediately swap back,
    // then force-replace the buffer with the chosen representation.
    player.updateSettings({
      streaming: { abr: { autoSwitchBitrate: { video: false } } },
    });
    try {
      player.setRepresentationForTypeById('video', value, true);
      setCurrentRepId(value);
    } catch {
      /* representation gone (manifest reload) — ignore, ABR list refreshes */
    }
  }

  const triggerLabel =
    selectedRepId === AUTO
      ? `Auto${(() => {
          const cur = videoReps.find((r) => r.id === currentRepId);
          return cur ? ` (${formatRep(cur)})` : '';
        })()}`
      : (() => {
          const r = videoReps.find((r) => r.id === selectedRepId);
          return r ? formatRep(r) : 'Quality';
        })();

  return (
    <div className="group relative aspect-video w-full overflow-hidden rounded-md bg-black">
      <video ref={videoRef} className="h-full w-full" playsInline autoPlay />

      {state === 'playing' && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex items-center gap-1.5 text-xs font-medium text-white">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            LIVE · DASH
          </span>
          <div className="flex items-center gap-1">
            {videoReps.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1.5 px-2 text-xs text-white/80 hover:text-white hover:bg-white/20"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    {triggerLabel}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  <DropdownMenuLabel>Quality</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={selectedRepId} onValueChange={selectQuality}>
                    <DropdownMenuRadioItem value={AUTO}>Auto</DropdownMenuRadioItem>
                    {videoReps.map((r) => (
                      <DropdownMenuRadioItem key={r.id} value={r.id}>
                        {formatRep(r)}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <VolumeControl
              volume={volume}
              muted={muted}
              onToggleMute={toggleMute}
              onVolumeChange={setVolume}
            />
          </div>
        </div>
      )}

      {state === 'loading' && active && (
        <Overlay>
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
          <p className="text-sm text-white/60">Connecting to DASH stream…</p>
        </Overlay>
      )}

      {!active && (
        <Overlay>
          <VideoOff className="h-8 w-8 text-white/40" />
          <p className="text-sm text-white/40">Stream not running</p>
        </Overlay>
      )}

      {state === 'error' && (
        <Overlay>
          <WifiOff className="h-8 w-8 text-red-400" />
          <p className="text-sm text-white/70">Failed to load DASH stream</p>
          {errorMsg && (
            <p className="max-w-sm px-3 text-center font-mono text-[10px] text-white/40">
              {errorMsg}
            </p>
          )}
          <Button
            size="sm"
            variant="outline"
            className="mt-2 gap-1.5 border-white/20 bg-white/10 text-white hover:bg-white/20"
            onClick={manualRetry}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
      {children}
    </div>
  );
}
