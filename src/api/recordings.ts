import { api, BASE_URL } from './client';
import type { DataResponse, Recording } from './types';

export const recordingsApi = {
  get: (rid: string) => api.get(`recordings/${rid}`).json<DataResponse<Recording>>(),

  delete: (rid: string) => api.delete(`recordings/${rid}`),

  playlistUrl: (rid: string) => `${BASE_URL}/recordings/${rid}/playlist.m3u8`,

  timeshiftUrl: (rid: string) => `${BASE_URL}/recordings/${rid}/timeshift.m3u8`,
};
