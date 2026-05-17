import { api } from './client';
import type { DataResponse, ListResponse, Stream, StreamBody, StreamStatus } from './types';

export interface StreamListOptions {
  /** Server-side status filter — e.g. only `active` streams. */
  status?: StreamStatus;
}

export const streamsApi = {
  list: (opts: StreamListOptions = {}) =>
    api
      .get('streams', { searchParams: opts.status ? { status: opts.status } : undefined })
      .json<ListResponse<Stream>>(),

  get: (code: string) => api.get(`streams/${code}`).json<DataResponse<Stream>>(),

  // POST /streams/:code — creates if not exists (201) or partial-updates (200)
  save: (code: string, body: StreamBody) =>
    api.post(`streams/${code}`, { json: body }).json<DataResponse<Stream>>(),

  delete: (code: string) => api.delete(`streams/${code}`),

  restart: (code: string) => api.post(`streams/${code}/restart`),

  switchInput: (code: string, priority: number) =>
    api
      .post(`streams/${code}/switch`, { json: { priority } })
      .json<DataResponse<{ status: string }>>(),
};
