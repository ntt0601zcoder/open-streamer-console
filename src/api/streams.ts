import { api } from './client';
import type {
  DataResponse,
  ListResponse,
  Recording,
  Stream,
  StreamBody,
} from './types';

export const streamsApi = {
  list: () => api.get('streams').json<ListResponse<Stream>>(),

  get: (code: string) => api.get(`streams/${code}`).json<DataResponse<Stream>>(),

  // POST /streams/:code — creates if not exists (201) or partial-updates (200)
  save: (code: string, body: StreamBody) =>
    api.post(`streams/${code}`, { json: body }).json<DataResponse<Stream>>(),

  delete: (code: string) => api.delete(`streams/${code}`),

  start: (code: string) => api.post(`streams/${code}/start`),

  stop: (code: string) => api.post(`streams/${code}/stop`),

  status: (code: string) => api.get(`streams/${code}/status`).json<DataResponse<Record<string, unknown>>>(),

  getRecordings: (code: string) =>
    api.get(`streams/${code}/recordings`).json<ListResponse<Recording>>(),

  startRecording: (code: string) => api.post(`streams/${code}/recordings/start`),

  stopRecording: (code: string) => api.post(`streams/${code}/recordings/stop`),

  switchInput: (code: string, priority: number) =>
    api.post(`streams/${code}/inputs/switch`, { json: { priority } }).json<DataResponse<{ status: string }>>(),
};
