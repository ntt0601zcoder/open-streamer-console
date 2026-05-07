import { api, BASE_URL } from './client';
import type { DataResponse, Recording, RecordingStatus } from './types';

export interface TimeshiftOptions {
  /** Absolute start time (RFC3339). */
  from?: string;
  /** Relative start offset in seconds from recording start. */
  offsetSec?: number;
  /** Window duration in seconds (default: all remaining). */
  duration?: number;
}

export interface DvrRange {
  /** Earliest segment timestamp (RFC3339). */
  started_at: string;
  /** Most recent segment timestamp (RFC3339). Advances while recording. */
  last_segment_at?: string;
}

export interface DvrGap {
  start: string;
  end: string;
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
  if (opts.from) params.set('from', opts.from);
  if (opts.offsetSec != null) params.set('offset_sec', String(opts.offsetSec));
  if (opts.duration != null) params.set('duration', String(opts.duration));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export const recordingsApi = {
  get: (rid: string) => api.get(`recordings/${rid}`).json<DataResponse<Recording>>(),

  /** DVR range, gaps, segment count, total bytes. */
  info: (rid: string) => api.get(`recordings/${rid}/info`).json<DataResponse<RecordingInfo>>(),

  playlistUrl: (rid: string) => `${BASE_URL}/recordings/${rid}/playlist.m3u8`,

  /**
   * Build a timeshift VOD playlist URL. Same `playlist.m3u8` endpoint —
   * server dispatches dynamic slice when `from`/`offset_sec` is present.
   */
  timeshiftUrl: (rid: string, opts: TimeshiftOptions = {}) =>
    appendQuery(`${BASE_URL}/recordings/${rid}/playlist.m3u8`, opts),

  /** Direct URL to a segment or other file inside a recording (e.g. `000000.ts`). */
  fileUrl: (rid: string, file: string) =>
    `${BASE_URL}/recordings/${rid}/${encodeURIComponent(file)}`,
};
