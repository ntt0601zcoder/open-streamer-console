import { api, BASE_URL } from './client';
import type { DataResponse, Recording } from './types';

export interface TimeshiftOptions {
  /** Absolute start time (RFC3339). */
  from?: string;
  /** Relative start offset in seconds from recording start. */
  offsetSec?: number;
  /** Window duration in seconds (default: all remaining). */
  duration?: number;
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

  /** Free-form recording metadata (segment count, duration, sizes, …). */
  info: (rid: string) => api.get(`recordings/${rid}/info`).json<Record<string, unknown>>(),

  delete: (rid: string) => api.delete(`recordings/${rid}`),

  playlistUrl: (rid: string) => `${BASE_URL}/recordings/${rid}/playlist.m3u8`,

  /** Build a timeshift VOD playlist URL. Pass `from` OR `offsetSec` plus optional `duration`. */
  timeshiftUrl: (rid: string, opts: TimeshiftOptions = {}) =>
    appendQuery(`${BASE_URL}/recordings/${rid}/timeshift.m3u8`, opts),

  /** Direct URL to a segment or other file inside a recording (e.g. `000000.ts`). */
  fileUrl: (rid: string, file: string) =>
    `${BASE_URL}/recordings/${rid}/${encodeURIComponent(file)}`,
};
