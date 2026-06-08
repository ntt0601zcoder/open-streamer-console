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
  /** Earliest recorded timestamp (RFC3339). */
  from: string;
  /** Most recent recorded timestamp (RFC3339). Advances while recording. */
  to?: string;
}

export interface DvrGap {
  /** Wall-clock start of the gap, in Unix milliseconds. */
  from_ms: number;
  /** Wall-clock end of the gap, in Unix milliseconds. */
  to_ms: number;
  /** Free-form server-side label for why the gap exists (e.g. "discontinuity"). */
  reason: string;
}

export const RecordingFormat = { cmaf: 'cmaf' } as const;
export type RecordingFormat = (typeof RecordingFormat)[keyof typeof RecordingFormat];

export interface RecordingInfo {
  stream_code: string;
  status: RecordingStatus;
  /** On-disk archive format. Currently always "cmaf". */
  format: RecordingFormat;
  dvr_range: DvrRange;
  gaps?: DvrGap[];
  /** Number of ABR renditions kept on disk (1 = best only, N = all). */
  profile_count: number;
  /** Hours of recorded data (one CMAF blob per hour per profile). */
  hour_count: number;
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

  /**
   * Build a timeshift DASH manifest URL. Same `index.mpd` endpoint —
   * server renders a static MPD covering the requested window when any
   * timeshift param is set (CMAF blob archive, Phase 4).
   */
  dashTimeshiftUrl: (code: string, opts: TimeshiftOptions = {}) =>
    appendQuery(`${BASE_URL}/${code}/index.mpd`, opts),
};
