import { useEffect, useRef, useState } from 'react';
import { MediaPlayer, type MediaPlayerClass } from 'dashjs';
import { Loader2, RefreshCw, VideoOff, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlayerVolume } from '@/features/streams/hooks/usePlayerVolume';
import { VolumeControl } from './VolumeControl';

type PlayerState = 'loading' | 'playing' | 'retrying' | 'error';

interface DashPlayerProps {
  dashUrl: string;
  active: boolean;
}

export function DashPlayer({ dashUrl, active }: DashPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<MediaPlayerClass | null>(null);
  const [state, setState] = useState<PlayerState>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const { volume, muted, setVolume, setMuted, toggleMute, apply: applyVolume } = usePlayerVolume();

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

    // dashjs v5 prefers the explicit attachView + attachSource pattern over
    // the legacy three-arg initialize() — the latter occasionally races with
    // the manifest fetch in StrictMode (double-mount in dev), leaving the
    // <video> element unwired.
    player.initialize();
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

  return (
    <div className="group relative aspect-video w-full overflow-hidden rounded-md bg-black">
      <video ref={videoRef} className="h-full w-full" playsInline autoPlay />

      {state === 'playing' && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex items-center gap-1.5 text-xs font-medium text-white">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            LIVE · DASH
          </span>
          <VolumeControl
            volume={volume}
            muted={muted}
            onToggleMute={toggleMute}
            onVolumeChange={setVolume}
          />
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
