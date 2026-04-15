import { api } from './client';
import type { DataResponse, Recording } from './types';

export const recordingsApi = {
  get: (rid: string) => api.get(`recordings/${rid}`).json<DataResponse<Recording>>(),

  delete: (rid: string) => api.delete(`recordings/${rid}`),

  playlistUrl: (rid: string) =>
    `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'}/recordings/${rid}/playlist.m3u8`,

  timeshiftUrl: (rid: string) =>
    `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'}/recordings/${rid}/timeshift.m3u8`,
};
