import { useCallback, useEffect, useRef, useState } from 'react';
import Hls, { type Level } from 'hls.js';
import { Loader2, RefreshCw, Settings, VideoOff, Volume2, VolumeOff, WifiOff } from 'lucide-react';
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

type PlayerState = 'loading' | 'playing' | 'retrying' | 'error' | 'unsupported';

const AUTO_LEVEL = -1;

function formatLevel(level: Level): string {
  const height = level.height || level.attrs?.RESOLUTION?.split('x')[1];
  const bitrateMbps = level.bitrate ? (level.bitrate / 1_000_000).toFixed(1) : null;
  if (height && bitrateMbps) return `${height}p · ${bitrateMbps} Mbps`;
  if (height) return `${height}p`;
  if (bitrateMbps) return `${bitrateMbps} Mbps`;
  return level.name ?? 'Unknown';
}

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
  const [muted, setMuted] = useState(true);
  const [levels, setLevels] = useState<Level[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number>(AUTO_LEVEL);
  const [autoLevel, setAutoLevel] = useState<number>(AUTO_LEVEL);

  function clearRetryTimer() {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }

  const initHls = useCallback(
    (video: HTMLVideoElement) => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      mediaErrorCountRef.current = 0;

      const hls = new Hls({
        // Live sync — stay near the edge but leave enough slack for catch-up
        // so we don't constantly force-seek on minor network jitter.
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        liveDurationInfinity: true,

        // Forward buffer: larger than the previous 15s so a brief network or
        // decode hiccup doesn't starve the media element and freeze playback.
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        // Replaces deprecated liveBackBufferLength (removed in hls.js ≥ 1.4).
        backBufferLength: 30,

        // Stall recovery — nudge aggressively when the video reports `waiting`
        // despite data being present (PTS holes, container splice points).
        // Native HLS players (VLC, browser extensions) tolerate these by
        // default; MSE is stricter, so we ask hls.js to try harder.
        nudgeOffset: 0.1,
        nudgeMaxRetry: 10,
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,

        // Network / manifest retry
        fragLoadingRetryDelay: 1000,
        manifestLoadingRetryDelay: 1000,
      });

      hlsRef.current = hls;
      setLevels([]);
      setSelectedLevel(AUTO_LEVEL);
      setAutoLevel(AUTO_LEVEL);
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        setState('playing');
        mediaErrorCountRef.current = 0;
        setLevels(data.levels ?? []);
        setSelectedLevel(hls.currentLevel < 0 ? AUTO_LEVEL : hls.currentLevel);
        void video.play().catch(() => {});
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
        setAutoLevel(data.level);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          mediaErrorCountRef.current += 1;
          if (mediaErrorCountRef.current === 1) {
            hls.recoverMediaError();
          } else {
            setState('retrying');
            clearRetryTimer();
            retryTimerRef.current = setTimeout(() => initHls(video), 3000);
          }
        } else {
          setState('retrying');
          clearRetryTimer();
          retryTimerRef.current = setTimeout(() => initHls(video), 5000);
        }
      });
    },
    [hlsUrl],
  );

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
  }, [hlsUrl, active, initHls]);

  // Stall watchdog — hls.js's internal nudging occasionally gives up on small
  // MSE hiccups. If the video is waiting for data but the buffer already has
  // playable data past currentTime, nudge past the gap; if it's an actual
  // live-edge underrun, seek to liveSyncPosition.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active || state !== 'playing') return;

    let waitingSince = 0;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    function bufferedAhead(): number {
      if (!video) return 0;
      for (let i = 0; i < video.buffered.length; i++) {
        const start = video.buffered.start(i);
        const end = video.buffered.end(i);
        if (video.currentTime >= start - 0.1 && video.currentTime <= end) {
          return end - video.currentTime;
        }
      }
      return 0;
    }

    function unstick() {
      if (!video) return;
      const ahead = bufferedAhead();
      if (ahead > 0.5) {
        // Nudge past PTS gap; small step avoids an audible glitch.
        video.currentTime = Math.min(video.currentTime + 0.2, video.currentTime + ahead);
        return;
      }
      // No buffered data ahead — jump to the live edge to resume from fresh segments.
      const livePos = hlsRef.current?.liveSyncPosition;
      if (livePos != null && livePos > video.currentTime) {
        video.currentTime = livePos;
      }
    }

    function onWaiting() {
      waitingSince = Date.now();
      if (intervalId) return;
      intervalId = setInterval(() => {
        if (!video || video.readyState >= 3 /* HAVE_FUTURE_DATA */) {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          return;
        }
        // Give hls.js ~3s to recover on its own before forcing the issue.
        if (Date.now() - waitingSince >= 3000) {
          unstick();
        }
      }, 1000);
    }

    function onPlaying() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    return () => {
      if (intervalId) clearInterval(intervalId);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
    };
  }, [active, state]);

  function manualRetry() {
    const video = videoRef.current;
    if (!video) return;
    clearRetryTimer();
    setState('loading');
    initHls(video);
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  function selectQuality(value: string) {
    const level = Number(value);
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = level;
    setSelectedLevel(level);
  }

  return (
    <div className="group relative aspect-video w-full overflow-hidden rounded-md bg-black">
      <video
        ref={videoRef}
        className="h-full w-full"
        muted
        playsInline
        style={{ display: state === 'playing' ? 'block' : 'none' }}
      />

      {/* Live controls overlay — visible on hover */}
      {state === 'playing' && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex items-center gap-1.5 text-xs font-medium text-white">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </span>
          <div className="flex items-center gap-1">
            {levels.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1.5 px-2 text-xs text-white/80 hover:text-white hover:bg-white/20"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    {selectedLevel === AUTO_LEVEL
                      ? `Auto${autoLevel >= 0 && levels[autoLevel] ? ` (${formatLevel(levels[autoLevel])})` : ''}`
                      : levels[selectedLevel]
                        ? formatLevel(levels[selectedLevel])
                        : 'Quality'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  <DropdownMenuLabel>Quality</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={String(selectedLevel)}
                    onValueChange={selectQuality}
                  >
                    <DropdownMenuRadioItem value={String(AUTO_LEVEL)}>Auto</DropdownMenuRadioItem>
                    {levels.map((level, index) => (
                      <DropdownMenuRadioItem key={index} value={String(index)}>
                        {formatLevel(level)}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20"
              onClick={toggleMute}
            >
              {muted ? <VolumeOff className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

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
