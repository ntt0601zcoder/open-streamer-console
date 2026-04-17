import { api, BASE_URL } from './client';
import type { DataResponse } from './types';

export interface VODMount {
  name: string;
  storage: string;
  comment?: string;
}

export interface VODFileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  mod_time_unix: number;
  play_url?: string;
  ingest_url?: string;
}

export interface VODMountListResponse {
  data: VODMount[];
  total: number;
}

export interface VODFileListResponse {
  data: VODFileEntry[];
  path: string;
  total: number;
}

export type VODMountBody = VODMount;

function encodeFilePath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

export const vodApi = {
  list: () => api.get('vod').json<VODMountListResponse>(),

  get: (name: string) => api.get(`vod/${encodeURIComponent(name)}`).json<DataResponse<VODMount>>(),

  create: (body: VODMountBody) => api.post('vod', { json: body }).json<DataResponse<VODMount>>(),

  update: (name: string, body: VODMountBody) =>
    api.put(`vod/${encodeURIComponent(name)}`, { json: body }).json<DataResponse<VODMount>>(),

  delete: (name: string) => api.delete(`vod/${encodeURIComponent(name)}`),

  listFiles: (name: string, path = '') =>
    api
      .get(`vod/${encodeURIComponent(name)}/files`, {
        searchParams: path ? { path } : undefined,
      })
      .json<VODFileListResponse>(),

  uploadFile: (name: string, file: File, path = '') => {
    const formData = new FormData();
    formData.append('file', file);
    return api
      .post(`vod/${encodeURIComponent(name)}/files`, {
        body: formData,
        searchParams: path ? { path } : undefined,
        timeout: false,
      })
      .json<DataResponse<VODFileEntry>>();
  },

  deleteFile: (name: string, path: string) =>
    api.delete(`vod/${encodeURIComponent(name)}/files/${encodeFilePath(path)}`),

  rawUrl: (name: string, path: string) =>
    `${BASE_URL}/vod/${encodeURIComponent(name)}/raw/${encodeFilePath(path)}`,
};

export function absoluteUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (/^[a-z][a-z0-9+\-.]*:\/\//i.test(url)) return url;
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}
