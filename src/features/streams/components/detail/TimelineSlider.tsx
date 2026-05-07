import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MsRange {
  start: number;
  end: number;
}

interface TimelineSliderProps {
  /** Recording boot time — ms epoch. Left edge of the slider. */
  startMs: number;
  /** Most recent point (live edge) — ms epoch. Right edge of the slider. */
  endMs: number;
  /** Currently selected position — ms epoch; null = follow live edge. */
  valueMs: number | null;
  /** Time-window snap distance from `endMs` that switches the player back to live (ms). */
  liveSnapMs?: number;
  onChange: (ms: number | null) => void;
  /** Ranges where DVR data is on disk — drawn green. */
  availableRanges?: MsRange[];
  /** Server-reported gaps inside DVR data — drawn red. */
  gaps?: MsRange[];
}

export function TimelineSlider({
  startMs: dataStartMs,
  endMs: dataEndMs,
  valueMs,
  liveSnapMs = 5_000,
  onChange,
  availableRanges,
  gaps,
}: TimelineSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hoverMs, setHoverMs] = useState<number | null>(null);

  const fullRange = Math.max(dataEndMs - dataStartMs, 1);

  // Default view: snap exactly to the available DVR range so every position
  // along the slider is seekable. Wheel/zoom-out lets the operator inspect
  // the broader history; the focused default keeps the affordance honest —
  // clicking anywhere on the visible track lands inside green.
  const focusedView = useMemo(() => {
    const last = availableRanges?.[availableRanges.length - 1];
    if (!last) return { s: dataStartMs, e: dataEndMs };
    const greenSpan = Math.max(last.end - last.start, 60_000);
    const e = last.end;
    const s = e - greenSpan;
    return {
      s: Math.max(s, dataStartMs),
      e: Math.min(e, dataEndMs),
    };
  }, [availableRanges, dataStartMs, dataEndMs]);

  const [viewStart, setViewStart] = useState(focusedView.s);
  const [viewEnd, setViewEnd] = useState(focusedView.e);

  // While the user hasn't manually panned/zoomed, keep tracking the focused
  // view so the slider stays at 70%-green even as new segments arrive.
  const userInteractedRef = useRef(false);
  useEffect(() => {
    if (userInteractedRef.current) return;
    setViewStart(focusedView.s);
    setViewEnd(focusedView.e);
  }, [focusedView.s, focusedView.e]);

  const visibleRange = Math.max(viewEnd - viewStart, 1);
  const liveValue = valueMs == null ? dataEndMs : valueMs;
  const isLive = valueMs == null;
  const playheadPercent = ((liveValue - viewStart) / visibleRange) * 100;
  const playheadInView = playheadPercent >= 0 && playheadPercent <= 100;

  function pageXToMs(pageX: number): number {
    const track = trackRef.current;
    if (!track) return liveValue;
    const rect = track.getBoundingClientRect();
    const ratio = clampPct(((pageX - rect.left) / rect.width) * 100) / 100;
    return viewStart + ratio * visibleRange;
  }

  // Pan / zoom helpers — keep view inside [dataStartMs, dataEndMs]. Any
  // manual call flips off the auto-focus tracker.
  const setView = useCallback(
    (nextStart: number, nextEnd: number, opts?: { manual?: boolean }) => {
      let s = nextStart;
      let e = nextEnd;
      const span = e - s;
      if (span <= 0) return;
      if (s < dataStartMs) {
        s = dataStartMs;
        e = s + span;
      }
      if (e > dataEndMs) {
        e = dataEndMs;
        s = e - span;
      }
      if (s < dataStartMs) s = dataStartMs;
      if (opts?.manual !== false) userInteractedRef.current = true;
      setViewStart(s);
      setViewEnd(e);
    },
    [dataStartMs, dataEndMs],
  );

  const resetZoom = useCallback(() => {
    userInteractedRef.current = false;
    setViewStart(focusedView.s);
    setViewEnd(focusedView.e);
  }, [focusedView.s, focusedView.e]);

  // Wheel: deltaY = zoom (centered on cursor), deltaX = pan.
  // Use a ref-attached non-passive listener so we can preventDefault and
  // stop the page from scrolling when zooming the timeline.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    function onWheel(e: WheelEvent) {
      if (!track) return;
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (horizontal) {
        e.preventDefault();
        const rect = track.getBoundingClientRect();
        const panRatio = e.deltaX / rect.width;
        const dt = panRatio * visibleRange;
        setView(viewStart + dt, viewEnd + dt);
        return;
      }
      // Zoom (deltaY) — only if we're already focused / hovering. Skip when
      // the gesture is a normal vertical page scroll (small deltaY < 1).
      if (Math.abs(e.deltaY) < 1) return;
      e.preventDefault();
      const rect = track.getBoundingClientRect();
      const cursorRatio = clampPct(((e.clientX - rect.left) / rect.width) * 100) / 100;
      const cursorMs = viewStart + cursorRatio * visibleRange;
      // Negative deltaY = zoom in (smaller range). 1 wheel notch ≈ 12% per step.
      const factor = Math.exp(e.deltaY * 0.0015);
      const nextSpan = Math.min(
        Math.max(visibleRange * factor, 10_000), // min 10s window
        fullRange,
      );
      const nextStart = cursorMs - cursorRatio * nextSpan;
      setView(nextStart, nextStart + nextSpan);
    }
    track.addEventListener('wheel', onWheel, { passive: false });
    return () => track.removeEventListener('wheel', onWheel);
  }, [viewStart, viewEnd, visibleRange, fullRange, setView]);

  // Fit button is enabled whenever the current view differs from the focused
  // view (i.e. user has panned/zoomed away from the default).
  const isAtFocused =
    Math.abs(viewStart - focusedView.s) < 1000 && Math.abs(viewEnd - focusedView.e) < 1000;
  const zoomTicks = useMemo(() => tickPositions(viewStart, viewEnd), [viewStart, viewEnd]);

  function applyMs(ms: number) {
    const snappedMs = Math.min(ms, dataEndMs);
    if (dataEndMs - snappedMs <= liveSnapMs) {
      onChange(null);
      return;
    }
    // Clamp to the earliest available segment plus a safety buffer. The buffer
    // (~8 s) accounts for the polling cycle (info refreshes every 4 s) plus
    // segment-duration jitter — by the time the request lands on the server,
    // the segment we polled at the left edge of the green range may already
    // have been pruned by retention, returning 404.
    const SAFETY_BUFFER_MS = 8_000;
    let clamped = Math.max(snappedMs, dataStartMs);
    if (availableRanges && availableRanges.length > 0) {
      const earliestAvailable = availableRanges[0]!.start;
      const safeFloor = earliestAvailable + SAFETY_BUFFER_MS;
      if (clamped < safeFloor) clamped = Math.min(safeFloor, dataEndMs - liveSnapMs);
    }
    onChange(clamped);
  }

  // Pan-or-seek: drag past PAN_THRESHOLD pixels = pan; below threshold = click-to-seek.
  // 8px is generous enough that a slightly-jittery click still registers as a seek.
  const PAN_THRESHOLD = 8;
  const panRef = useRef<{
    startX: number;
    startView: { s: number; e: number };
    moved: boolean;
  } | null>(null);

  function handlePointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    panRef.current = {
      startX: e.pageX,
      startView: { s: viewStart, e: viewEnd },
      moved: false,
    };
  }

  function handlePointerMove(e: React.PointerEvent) {
    setHoverMs(pageXToMs(e.pageX));
    const pan = panRef.current;
    if (!pan) return;
    const dx = e.pageX - pan.startX;
    if (!pan.moved && Math.abs(dx) < PAN_THRESHOLD) return;
    pan.moved = true;
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const dt = -(dx / rect.width) * (pan.startView.e - pan.startView.s);
    setView(pan.startView.s + dt, pan.startView.e + dt);
  }

  function handlePointerUp(e: React.PointerEvent) {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
    const pan = panRef.current;
    panRef.current = null;
    if (pan && !pan.moved) {
      // Treat as a click — seek to that position.
      applyMs(pageXToMs(e.pageX));
    }
  }

  // Cursor cue: "pointer" (clickable) over green/red (data → seekable),
  // "grab" elsewhere (pan-only). Resolves the UX confusion where the grab
  // cursor implied "drag-only" and hid the click-to-seek affordance.
  const hoverableForSeek = useMemo(() => {
    if (hoverMs == null) return false;
    const all = [...(availableRanges ?? []), ...(gaps ?? [])];
    return all.some((r) => hoverMs >= r.start && hoverMs <= r.end);
  }, [hoverMs, availableRanges, gaps]);

  useEffect(() => {
    if (!dragging) return;
    function onLeave() {
      setHoverMs(null);
    }
    document.addEventListener('pointercancel', onLeave);
    return () => document.removeEventListener('pointercancel', onLeave);
  }, [dragging]);

  // Zoom in/out 2x centered on the current view midpoint.
  const zoomBy = useCallback(
    (factor: number) => {
      const center = (viewStart + viewEnd) / 2;
      const nextSpan = Math.min(Math.max(visibleRange * factor, 10_000), fullRange);
      setView(center - nextSpan / 2, center + nextSpan / 2);
    },
    [viewStart, viewEnd, visibleRange, fullRange, setView],
  );
  const canZoomIn = visibleRange > 10_000;
  const canZoomOut = visibleRange < fullRange - 500;

  return (
    <div className="flex items-center gap-3 rounded-md bg-black/60 px-3 py-2">
      {/* Back-to-live button */}
      <button
        type="button"
        onClick={() => onChange(null)}
        disabled={isLive}
        className={cn(
          'flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors',
          isLive
            ? 'bg-red-500/20 text-red-300 cursor-default'
            : 'bg-white/10 text-white/80 hover:bg-white/20',
        )}
      >
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            isLive ? 'bg-red-500 animate-pulse' : 'bg-white/40',
          )}
        />
        {isLive ? 'LIVE' : 'Go live'}
      </button>

      <div className="flex flex-1 flex-col gap-1">
        <div className="relative">
        <div
          ref={trackRef}
          className={cn(
            'group/track relative h-2 overflow-hidden rounded-full bg-white/15',
            dragging ? 'cursor-grabbing' : hoverableForSeek ? 'cursor-pointer' : 'cursor-grab',
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => !dragging && setHoverMs(null)}
        >
          {/* Available data ranges — green. Anchor by `right` (data lives at
              the live edge) so a sub-percent strip with min-width=6px stays
              inside the overflow-hidden track instead of getting clipped off
              the right side. */}
          {availableRanges?.map((r, i) => {
            const left = ((r.start - viewStart) / visibleRange) * 100;
            const right = ((viewEnd - r.end) / visibleRange) * 100;
            if (left >= 100 || right >= 100) return null;
            const clampedLeft = Math.max(left, 0);
            const clampedRight = Math.max(right, 0);
            const visibleWidth = 100 - clampedLeft - clampedRight;
            if (visibleWidth <= 0) return null;
            return (
              <div
                key={`avail-${i}`}
                className="absolute inset-y-0 bg-emerald-500"
                style={{
                  right: `${clampedRight}%`,
                  width: `${visibleWidth}%`,
                  minWidth: '6px',
                }}
              />
            );
          })}

          {/* Gaps — red */}
          {gaps?.map((g, i) => {
            const left = ((g.start - viewStart) / visibleRange) * 100;
            const right = ((viewEnd - g.end) / visibleRange) * 100;
            if (left >= 100 || right >= 100) return null;
            const clampedLeft = Math.max(left, 0);
            const clampedRight = Math.max(right, 0);
            const visibleWidth = 100 - clampedLeft - clampedRight;
            if (visibleWidth <= 0) return null;
            return (
              <div
                key={`gap-${i}`}
                className="absolute inset-y-0 bg-red-500"
                style={{
                  left: `${clampedLeft}%`,
                  width: `${visibleWidth}%`,
                  minWidth: '4px',
                }}
              />
            );
          })}

          {/* Tick marks */}
          {zoomTicks.map((t, i) => (
            <div
              key={`tick-${i}`}
              className="absolute top-0 bottom-0 w-px bg-white/30"
              style={{ left: `${((t - viewStart) / visibleRange) * 100}%` }}
            />
          ))}

          {/* Playhead — only if it's inside the current zoom window */}
          {playheadInView && (
            <div
              className={cn(
                'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-black/40 transition-transform',
                isLive ? 'h-3.5 w-3.5 bg-red-500' : 'h-3.5 w-3.5 bg-white',
                dragging && 'scale-125',
              )}
              style={{ left: `${playheadPercent}%` }}
            />
          )}

        </div>
          {/* Hover tooltip — outside overflow-hidden so it can sit above the track. */}
          {hoverMs != null && (
            <div
              className="pointer-events-none absolute -top-6 -translate-x-1/2 rounded bg-black/85 px-1.5 py-0.5 text-[10px] font-mono text-white whitespace-nowrap"
              style={{ left: `${((hoverMs - viewStart) / visibleRange) * 100}%` }}
            >
              {formatTimestamp(hoverMs)}
            </div>
          )}
        </div>

        <div className="relative h-3 text-[10px] text-white/60 font-mono">
          {zoomTicks.map((t, i) => (
            <span
              key={`tlabel-${i}`}
              className="absolute -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${((t - viewStart) / visibleRange) * 100}%` }}
            >
              {formatTickLabel(t, visibleRange)}
            </span>
          ))}
          <span className="absolute right-0 text-white/80">
            {isLive ? 'Live' : `−${formatOffset(dataEndMs - liveValue)}`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        <ZoomBtn
          onClick={() => zoomBy(0.5)}
          onHold={() => zoomBy(0.985)}
          disabled={!canZoomIn}
          icon={<Plus className="h-3.5 w-3.5" />}
          title="Zoom in (hold for smooth)"
        />
        <ZoomBtn
          onClick={() => zoomBy(2)}
          onHold={() => zoomBy(1.015)}
          disabled={!canZoomOut}
          icon={<Minus className="h-3.5 w-3.5" />}
          title="Zoom out (hold for smooth)"
        />
        <ZoomBtn
          onClick={resetZoom}
          disabled={isAtFocused}
          icon={<Maximize2 className="h-3.5 w-3.5" />}
          title="Fit to DVR"
        />
      </div>
    </div>
  );
}

function ZoomBtn({
  onClick,
  onHold,
  disabled,
  icon,
  title,
}: {
  onClick: () => void;
  /** Called repeatedly via requestAnimationFrame while pressed (after a 250ms hold delay). */
  onHold?: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  title: string;
}) {
  const stateRef = useRef<{
    rafId: number | null;
    timeoutId: number | null;
    isHolding: boolean;
  }>({ rafId: null, timeoutId: null, isHolding: false });
  // Track the latest `onHold` so the rAF loop always calls the freshest
  // closure (which itself captures the freshest `zoomBy` and view state).
  const onHoldRef = useRef(onHold);
  useEffect(() => {
    onHoldRef.current = onHold;
  }, [onHold]);

  function clearTimers() {
    const s = stateRef.current;
    if (s.rafId !== null) cancelAnimationFrame(s.rafId);
    if (s.timeoutId !== null) window.clearTimeout(s.timeoutId);
    s.rafId = null;
    s.timeoutId = null;
  }

  useEffect(() => clearTimers, []);

  function handlePointerDown(e: React.PointerEvent) {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const s = stateRef.current;
    s.isHolding = false;
    if (!onHold) return;
    s.timeoutId = window.setTimeout(() => {
      s.isHolding = true;
      function tick() {
        onHoldRef.current?.();
        s.rafId = requestAnimationFrame(tick);
      }
      s.rafId = requestAnimationFrame(tick);
    }, 250);
  }

  function handlePointerUp(e: React.PointerEvent) {
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    const wasHolding = stateRef.current.isHolding;
    clearTimers();
    if (!disabled && !wasHolding) onClick();
  }

  function handlePointerCancel() {
    clearTimers();
  }

  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded text-white/80 select-none',
        disabled
          ? 'cursor-default opacity-30'
          : 'hover:bg-white/20 hover:text-white active:bg-white/30',
      )}
    >
      {icon}
    </button>
  );
}

function clampPct(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

function formatOffset(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Nice tick strides — pick the smallest that gives at most TARGET_TICKS
 * across the visible range. Keeps labels from overlapping on a wide track.
 */
const NICE_STRIDES = [
  10_000, // 10s
  30_000, // 30s
  60_000, // 1m
  5 * 60_000,
  15 * 60_000,
  30 * 60_000,
  HOUR_MS,
  3 * HOUR_MS,
  6 * HOUR_MS,
  12 * HOUR_MS,
  DAY_MS,
  2 * DAY_MS,
  7 * DAY_MS,
  30 * DAY_MS,
];
const TARGET_TICKS = 5;

function tickStrideMs(rangeMs: number): number {
  const target = rangeMs / TARGET_TICKS;
  for (const s of NICE_STRIDES) {
    if (s >= target) return s;
  }
  return NICE_STRIDES[NICE_STRIDES.length - 1]!;
}

function tickPositions(startMs: number, endMs: number): number[] {
  const stride = tickStrideMs(endMs - startMs);
  const out: number[] = [];
  // Snap to the next stride boundary above startMs.
  const first = Math.ceil(startMs / stride) * stride;
  for (let t = first; t < endMs; t += stride) {
    if (t - startMs < stride * 0.4) continue; // skip if too close to left edge
    if (endMs - t < stride * 0.4) break; // skip if too close to right (Live label sits there)
    out.push(t);
  }
  return out;
}

function formatTickLabel(ms: number, rangeMs: number): string {
  const d = new Date(ms);
  const stride = tickStrideMs(rangeMs);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  // Stride ≥ 1 day → date only.
  if (stride >= DAY_MS) return `${mm}-${dd}`;
  // Stride ≥ 1 hour but spans multiple days → date + hour.
  if (stride >= HOUR_MS && rangeMs >= DAY_MS) return `${mm}-${dd} ${hh}h`;
  // Otherwise time of day.
  return `${hh}:${mi}`;
}

function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}
