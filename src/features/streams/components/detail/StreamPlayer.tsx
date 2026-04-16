import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Loader2, RefreshCw, VideoOff, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

type PlayerState = 'loading' | 'playing' | 'retrying' | 'error' | 'unsupported';

interface StreamPlayerProps {
  hlsUrl: string;
  active: boolean;
}

export function StreamPlayer({ hlsUrl, active }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaErrorCountRef = useRef(0);
  const [state, setState] = useState<PlayerState>('loading');

  function clearRetryTimer() {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }

  function initHls(video: HTMLVideoElement) {
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }
    mediaErrorCountRef.current = 0;

    const hls = new Hls({
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 8,
      maxBufferLength: 15,
      fragLoadingRetryDelay: 1000,
      manifestLoadingRetryDelay: 1000,
    });

    hlsRef.current = hls;
    hls.loadSource(hlsUrl);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      setState('playing');
      mediaErrorCountRef.current = 0;
      void video.play().catch(() => {});
    });

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return;

      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        // Network hiccup — startLoad is enough
        hls.startLoad();
      } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        mediaErrorCountRef.current += 1;
        if (mediaErrorCountRef.current === 1) {
          // First attempt: soft recovery
          hls.recoverMediaError();
        } else {
          // Second attempt: full reinit after short delay
          setState('retrying');
          clearRetryTimer();
          retryTimerRef.current = setTimeout(() => {
            initHls(video);
          }, 3000);
        }
      } else {
        // Unrecoverable — wait then reinit
        setState('retrying');
        clearRetryTimer();
        retryTimerRef.current = setTimeout(() => {
          initHls(video);
        }, 5000);
      }
    });
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active) return;

    setState('loading');

    // Safari / iOS — native HLS
    if (!Hls.isSupported()) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = hlsUrl;
        video.addEventListener('canplay', () => setState('playing'), { once: true });
        video.addEventListener('error', () => setState('error'), { once: true });
      } else {
        setState('unsupported');
      }
      return;
    }

    initHls(video);

    return () => {
      clearRetryTimer();
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hlsUrl, active]);

  function manualRetry() {
    const video = videoRef.current;
    if (!video) return;
    clearRetryTimer();
    setState('loading');
    initHls(video);
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
      <video
        ref={videoRef}
        className="h-full w-full"
        controls
        muted
        playsInline
        style={{ display: state === 'playing' ? 'block' : 'none' }}
      />

      {(state === 'loading' || state === 'retrying') && active && (
        <Overlay>
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
          <p className="text-sm text-white/60">
            {state === 'retrying' ? 'Reconnecting…' : 'Connecting to stream…'}
          </p>
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
          <p className="text-sm text-white/70">Failed to load stream</p>
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

      {state === 'unsupported' && (
        <Overlay>
          <VideoOff className="h-8 w-8 text-white/40" />
          <p className="text-sm text-white/60">HLS not supported in this browser</p>
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
