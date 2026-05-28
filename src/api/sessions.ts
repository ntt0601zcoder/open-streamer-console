import { api } from './client';
import type { DataResponse, PlaySession, SessionListResponse, SessionProto } from './types';

export interface SessionListOptions {
  /** Filter to a single stream code (server-side). */
  stream?: string;
  proto?: SessionProto;
  /** "active" | "closed" — server filters; omit for both. */
  status?: 'active' | 'closed';
  /** 0 = no cap. */
  limit?: number;
}

function searchParams(opts: SessionListOptions) {
  const sp = new URLSearchParams();
  if (opts.stream) sp.set('stream', opts.stream);
  if (opts.proto) sp.set('proto', opts.proto);
  if (opts.status) sp.set('status', opts.status);
  if (opts.limit && opts.limit > 0) sp.set('limit', String(opts.limit));
  return sp;
}

export const sessionsApi = {
  list: (opts: SessionListOptions = {}) =>
    api.get('sessions', { searchParams: searchParams(opts) }).json<SessionListResponse>(),

  get: (id: string) => api.get(`sessions/${id}`).json<DataResponse<PlaySession>>(),

  /** Force-close (kick) a session. Server returns 204. */
  kick: (id: string) => api.delete(`sessions/${id}`),
};
