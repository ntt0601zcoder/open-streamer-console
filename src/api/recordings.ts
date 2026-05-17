import { api, BASE_URL } from './client';
import type { DataResponse, RecordingStatus } from './types';

export interface TimeshiftOptions {
  /** Absolute start time as Unix seconds. Wins over `delay`/`ago`. */
  from?: number;
  /** Start N seconds before now (live-edge offset). Alias of `ago`. */
  delay?: number;
  /** Alias of `delay`. */
  ago?: number;
  /** Clip duration in seconds. Omit for everything from the start. */
  dur?: number;
}

export interface DvrRange {
  /** Earliest segment timestamp (RFC3339). */
  started_at: string;
  /** Most recent segment timestamp (RFC3339). Advances while recording. */
  last_segment_at?: string;
}

export interface DvrGap {
  /** Wall-clock time the gap began (signal loss / server restart). */
  from: string;
  /** Wall-clock time recording resumed. */
  to: string;
  /** Gap duration in Go's `time.Duration` JSON form (nanoseconds). */
  duration?: number;
}

export interface RecordingInfo {
  stream_code: string;
  status: RecordingStatus;
  dvr_range: DvrRange;
  gaps?: DvrGap[];
  segment_count: number;
  total_size_bytes: number;
}

function appendQuery(base: string, opts: TimeshiftOptions): string {
  const params = new URLSearchParams();
  if (opts.from != null) params.set('from', String(Math.floor(opts.from)));
  if (opts.delay != null) params.set('delay', String(opts.delay));
  if (opts.ago != null) params.set('ago', String(opts.ago));
  if (opts.dur != null) params.set('dur', String(opts.dur));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export const recordingsApi = {
  /** DVR status JSON — dvr_range, gaps, segment count, total bytes, status. */
  status: (code: string) =>
    api.get(`${code}/recording_status.json`).json<DataResponse<RecordingInfo>>(),

  /**
   * Live HLS playlist served from the publisher dir. No params = always
   * the live edge; the same URL accepts timeshift query params and the
   * server returns a sliced VOD playlist instead.
   */
  playlistUrl: (code: string) => `${BASE_URL}/${code}/index.m3u8`,

  /**
   * Build a timeshift VOD playlist URL. Same `index.m3u8` endpoint —
   * server returns a dynamic VOD slice whenever any timeshift param is set.
   */
  timeshiftUrl: (code: string, opts: TimeshiftOptions = {}) =>
    appendQuery(`${BASE_URL}/${code}/index.m3u8`, opts),
};
