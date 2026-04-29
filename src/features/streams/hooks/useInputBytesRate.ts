import { useEffect, useRef, useState } from 'react';
import { metricsApi, parseProm } from '@/api/metrics';

const METRIC = 'open_streamer_ingestor_bytes_total';
/**
 * Skip rate computation when the gap between two samples is wider than
 * this. A backgrounded tab can stall setInterval for minutes; without
 * a cap, the first sample after returning would average bytes received
 * over that whole gap and render as a single huge spike.
 */
const MAX_DT_SEC = 30;

export interface RatePoint {
  /** Wall-clock timestamp in ms. */
  t: number;
  /** Total ingest rate across all protocols, bytes/s. */
  total: number;
  /** Per-protocol rate, bytes/s. */
  byProtocol: Record<string, number>;
}

interface Snapshot {
  t: number;
  byProtocol: Record<string, number>;
}

interface Options {
  /** How often to scrape /metrics. Default 4 s. */
  intervalMs?: number;
  /** Max points kept in the chart buffer. Default 60. */
  maxPoints?: number;
  /** Mark the series stale when no successful sample within this window. Default 3× intervalMs. */
  staleAfterMs?: number;
}

/**
 * Polls Prometheus /metrics, extracts the per-stream ingest counter for each
 * protocol label, and emits a sliding window of bytes/s rate points.
 *
 * Failure handling:
 *   - Counter reset (delta < 0) → drop the interval, avoid a negative spike.
 *   - Tick fails              → clear the baseline; the next successful tick
 *                               starts a fresh window so we don't average a
 *                               failure-spanning window into one fake spike.
 *   - dt > MAX_DT_SEC          → drop the interval; baseline updates so we
 *                               resume cleanly (handles tab-backgrounded throttling).
 */
export function useInputBytesRate(streamCode: string, opts: Options = {}) {
  const intervalMs = opts.intervalMs ?? 4000;
  const maxPoints = opts.maxPoints ?? 60;
  const staleAfterMs = opts.staleAfterMs ?? intervalMs * 3;

  const [points, setPoints] = useState<RatePoint[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [now, setNow] = useState(Date.now());
  const prevRef = useRef<Snapshot | null>(null);
  const lastSampleAt = useRef<number>(0);

  // Tick "now" so the `stale` derived value re-renders even when no new
  // samples arrive (i.e. /metrics has been failing for a while).
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    prevRef.current = null;
    lastSampleAt.current = 0;
    setPoints([]);
    setError(null);

    async function tick() {
      try {
        const text = await metricsApi.fetchRaw();
        if (cancelled) return;
        const samples = parseProm(text);
        const byProtocol: Record<string, number> = {};
        for (const s of samples) {
          if (s.name !== METRIC) continue;
          if (s.labels.stream_code !== streamCode) continue;
          const proto = s.labels.protocol || 'unknown';
          byProtocol[proto] = (byProtocol[proto] ?? 0) + s.value;
        }

        const t = Date.now();
        lastSampleAt.current = t;
        setError(null);

        const prev = prevRef.current;
        prevRef.current = { t, byProtocol };

        if (!prev) return;
        const dtSec = (t - prev.t) / 1000;
        if (dtSec <= 0 || dtSec > MAX_DT_SEC) return;

        const protoRates: Record<string, number> = {};
        for (const proto of new Set([
          ...Object.keys(byProtocol),
          ...Object.keys(prev.byProtocol),
        ])) {
          const cur = byProtocol[proto] ?? 0;
          const old = prev.byProtocol[proto] ?? 0;
          const delta = cur - old;
          if (delta < 0) continue; // counter reset
          protoRates[proto] = delta / dtSec;
        }
        const total = Object.values(protoRates).reduce((a, b) => a + b, 0);
        setPoints((cur) => {
          const next = [...cur, { t, total, byProtocol: protoRates }];
          return next.length > maxPoints ? next.slice(-maxPoints) : next;
        });
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error('metrics fetch failed'));
        // Drop the baseline — next successful tick will start a fresh window
        // instead of averaging across the failure gap.
        prevRef.current = null;
      }
    }

    void tick();
    const id = window.setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [streamCode, intervalMs, maxPoints]);

  const stale = lastSampleAt.current > 0 && now - lastSampleAt.current > staleAfterMs;

  return { points, error, stale, lastSampleAt: lastSampleAt.current };
}
