import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Loader2, VideoOff } from 'lucide-react';

interface VodFilePlayerProps {
  src: string;
}

export function VodFilePlayer({ src }: VodFilePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'unsupported'>('loading');

  const isHls = /\.m3u8($|\?)/i.test(src);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setState('loading');

    if (!isHls) {
      video.src = src;
      const onCanPlay = () => setState('ready');
      const onError = () => setState('error');
      video.addEventListener('canplay', onCanPlay, { once: true });
      video.addEventListener('error', onError, { once: true });
      return () => {
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('error', onError);
      };
    }

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => setState('ready'));
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) setState('error');
      });
      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      const onCanPlay = () => setState('ready');
      video.addEventListener('canplay', onCanPlay, { once: true });
      return () => video.removeEventListener('canplay', onCanPlay);
    }

    setState('unsupported');
  }, [src, isHls]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
      <video ref={videoRef} className="h-full w-full" controls playsInline preload="metadata" />

      {state === 'loading' && (
        <Overlay>
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
        </Overlay>
      )}

      {state === 'error' && (
        <Overlay>
          <VideoOff className="h-8 w-8 text-red-400" />
          <p className="text-sm text-white/70">Failed to load file</p>
        </Overlay>
      )}

      {state === 'unsupported' && (
        <Overlay>
          <VideoOff className="h-8 w-8 text-white/40" />
          <p className="text-sm text-white/60">Format not supported in this browser</p>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
      {children}
    </div>
  );
}
