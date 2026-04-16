import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Loader2, VideoOff, WifiOff } from 'lucide-react';

type PlayerState = 'loading' | 'playing' | 'error' | 'unsupported';

interface StreamPlayerProps {
  hlsUrl: string;
  /** Pause polling & destroy HLS when false (stream not running) */
  active: boolean;
}

export function StreamPlayer({ hlsUrl, active }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [state, setState] = useState<PlayerState>('loading');
  const [errorDetail, setErrorDetail] = useState<string>('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active) return;

    setState('loading');
    setErrorDetail('');

    // Safari / iOS — native HLS support
    if (!Hls.isSupported()) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = hlsUrl;
        video.addEventListener('canplay', () => setState('playing'), { once: true });
        video.addEventListener('error', () => {
          setState('error');
          setErrorDetail('Native HLS error');
        }, { once: true });
      } else {
        setState('unsupported');
      }
      return;
    }

    // hls.js path (Chrome, Firefox, …)
    const hls = new Hls({
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 6,
      maxBufferLength: 10,
    });

    hlsRef.current = hls;
    hls.loadSource(hlsUrl);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      setState('playing');
      void video.play().catch(() => {
        // Autoplay blocked — still show controls so user can click play
      });
    });

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          // Stream not yet ready — keep retrying silently
          hls.startLoad();
        } else {
          setState('error');
          setErrorDetail(data.details ?? 'Unknown HLS error');
        }
      }
    });

    return () => {
      hls.destroy();
      hlsRef.current = null;
    };
  }, [hlsUrl, active]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
      {/* Video element — always mounted so hls.js can attach */}
      <video
        ref={videoRef}
        className="h-full w-full"
        controls
        muted
        playsInline
        style={{ display: state === 'playing' ? 'block' : 'none' }}
      />

      {/* Overlay states */}
      {state === 'loading' && active && (
        <Overlay>
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
          <p className="text-sm text-white/60">Connecting to stream…</p>
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
          {errorDetail && (
            <p className="mt-1 font-mono text-xs text-white/40">{errorDetail}</p>
          )}
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
