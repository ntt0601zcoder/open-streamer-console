import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hls, { type Level } from 'hls.js';
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
import { recordingsApi, type RecordingInfo } from '@/api/recordings';
import { cn } from '@/lib/utils';
import { usePlayerVolume } from '@/features/streams/hooks/usePlayerVolume';
import { TimelineSlider, type MsRange } from './TimelineSlider';
import { VolumeControl } from './VolumeControl';

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
  /** Stream code — used to build the timeshift URL when DVR is enabled. */
  streamCode: string;
  /** Polled DVR range — null/undefined disables timeshift controls. */
  recordingInfo?: RecordingInfo | null;
  /**
   * DVR segment duration in seconds (per-stream override or global default).
   * Combined with `segment_count` to estimate where actual on-disk data lives
   * within the broader [started_at, last_segment_at] window.
   */
  segmentDurationSec?: number;
}

export function StreamPlayer({
  hlsUrl,
  active,
  streamCode,
  recordingInfo,
  segmentDurationSec,
}: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaErrorCountRef = useRef(0);
  const [state, setState] = useState<PlayerState>('loading');
  const { volume, muted, setVolume, setMuted, toggleMute, apply: applyVolume } = usePlayerVolume();
  useEffect(() => {
    applyVolume(videoRef);
  }, [applyVolume]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number>(AUTO_LEVEL);
  const [autoLevel, setAutoLevel] = useState<number>(AUTO_LEVEL);

  // Timeshift state — null = follow live edge.
  const [timeshiftMs, setTimeshiftMs] = useState<number | null>(null);

  // Full slider window: recording boot → live edge. Server reports both as
  // wall-clock RFC3339 with timezone; Date.parse normalises to UTC ms.
  const dvrRange = useMemo(() => {
    if (!recordingInfo) return null;
    const startMs = Date.parse(recordingInfo.dvr_range.started_at);
    const lastMs = recordingInfo.dvr_range.last_segment_at
      ? Date.parse(recordingInfo.dvr_range.last_segment_at)
      : Date.now();
    if (!Number.isFinite(startMs) || !Number.isFinite(lastMs)) return null;
    if (lastMs <= startMs) return null;
    return { startMs, endMs: lastMs };
  }, [recordingInfo]);

  // Where the on-disk data actually lives: assume contiguous from `last_segment_at`
  // backwards by `segment_count × segment_duration`. Anything earlier (within the
  // boot→last span) is rendered grey — recording was off or pruned.
  const availableRanges = useMemo<MsRange[]>(() => {
    if (!dvrRange || !recordingInfo) return [];
    if (!segmentDurationSec || segmentDurationSec <= 0) return [];
    if (recordingInfo.segment_count <= 0) return [];
    const dataSpanMs = recordingInfo.segment_count * segmentDurationSec * 1000;
    const start = Math.max(dvrRange.startMs, dvrRange.endMs - dataSpanMs);
    return [{ start, end: dvrRange.endMs }];
  }, [dvrRange, recordingInfo, segmentDurationSec]);

  const gapRanges = useMemo<MsRange[]>(() => {
    if (!recordingInfo?.gaps) return [];
    return recordingInfo.gaps
      .map((g) => ({ start: Date.parse(g.start), end: Date.parse(g.end) }))
      .filter((g) => Number.isFinite(g.start) && Number.isFinite(g.end) && g.end > g.start);
  }, [recordingInfo]);

  // When the live edge advances and we're not in timeshift mode, do nothing —
  // `endMs` is recomputed from props, so the slider follows.

  // Source URL — live or timeshift VOD slice.
  // `from` uses second-level RFC3339 (the server parses with `time.RFC3339`,
  // not `RFC3339Nano`). We also nudge the requested time +1s so the server's
  // segment overlap test (segEnd > startTime) doesn't reject borderline picks.
  const sourceUrl = useMemo(() => {
    if (timeshiftMs == null) return hlsUrl;
    const safeMs = timeshiftMs + 1000;
    const fromIso = new Date(safeMs).toISOString().replace(/\.\d+Z$/, 'Z');
    return recordingsApi.timeshiftUrl(streamCode, { from: fromIso });
  }, [hlsUrl, streamCode, timeshiftMs]);

  // Track timeshift state in a ref so the HLS error handler (created once per
  // sourceUrl change) can read it without stale-closure issues.
  const timeshiftRef = useRef(timeshiftMs);
  useEffect(() => {
    timeshiftRef.current = timeshiftMs;
  }, [timeshiftMs]);

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
      hls.loadSource(sourceUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        setState('playing');
        mediaErrorCountRef.current = 0;
        setLevels(data.levels ?? []);
        setSelectedLevel(hls.currentLevel < 0 ? AUTO_LEVEL : hls.currentLevel);
        // Browsers block unmuted autoplay until the user has interacted with
        // the page; fall back to muted so the operator at least sees video.
        void video.play().catch(() => {
          video.muted = true;
          setMuted(true);
          void video.play().catch(() => {});
        });
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
        setAutoLevel(data.level);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;

        // Timeshift slice returned 404 — the requested window has no segments
        // (recording too fresh, retention pruned, or clock skew). Snap back
        // to live so the player doesn't sit stuck on the missing manifest.
        if (
          timeshiftRef.current != null &&
          data.type === Hls.ErrorTypes.NETWORK_ERROR &&
          data.response?.code === 404
        ) {
          setTimeshiftMs(null);
          return;
        }

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
    [sourceUrl],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active) return;

    setState('loading');

    // Safari / iOS — native HLS
    if (!Hls.isSupported()) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = sourceUrl;
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
  }, [sourceUrl, active, initHls]);

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
        playsInline
        style={{ display: state === 'playing' ? 'block' : 'none' }}
      />

      {/* Live controls overlay — visible on hover */}
      {state === 'playing' && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 px-3 pb-2 pt-3 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
          {dvrRange && (
            <TimelineSlider
              startMs={dvrRange.startMs}
              endMs={dvrRange.endMs}
              valueMs={timeshiftMs}
              onChange={setTimeshiftMs}
              availableRanges={availableRanges}
              gaps={gapRanges}
            />
          )}
          <div className="flex items-center justify-between">
            {!dvrRange && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-white">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    timeshiftMs == null ? 'bg-red-500 animate-pulse' : 'bg-white/40',
                  )}
                />
                {timeshiftMs == null ? 'LIVE' : 'TIMESHIFT'}
              </span>
            )}
            {dvrRange && <span className="flex-1" />}
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
            <VolumeControl
              volume={volume}
              muted={muted}
              onToggleMute={toggleMute}
              onVolumeChange={setVolume}
            />
          </div>
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
