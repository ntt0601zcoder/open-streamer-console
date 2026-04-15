import { api } from './client';
import type {
  CreateStreamBody,
  DataResponse,
  ListResponse,
  Recording,
  Stream,
  UpdateStreamBody,
} from './types';

export const streamsApi = {
  list: () => api.get('streams').json<ListResponse<Stream>>(),

  get: (code: string) => api.get(`streams/${code}`).json<DataResponse<Stream>>(),

  create: (body: CreateStreamBody) =>
    api.post('streams', { json: body }).json<DataResponse<Stream>>(),

  update: (code: string, patch: Partial<UpdateStreamBody>) =>
    api.put(`streams/${code}`, { json: patch }).json<DataResponse<Stream>>(),

  delete: (code: string) => api.delete(`streams/${code}`),

  start: (code: string) => api.post(`streams/${code}/start`),

  stop: (code: string) => api.post(`streams/${code}/stop`),

  status: (code: string) => api.get(`streams/${code}/status`).json<DataResponse<Record<string, unknown>>>(),

  getRecordings: (code: string) =>
    api.get(`streams/${code}/recordings`).json<ListResponse<Recording>>(),

  startRecording: (code: string) => api.post(`streams/${code}/recordings/start`),

  stopRecording: (code: string) => api.post(`streams/${code}/recordings/stop`),
};
