import { api } from './client';
import type { CreateHookBody, DataResponse, Hook, ListResponse, UpdateHookBody } from './types';

export const hooksApi = {
  list: () => api.get('hooks').json<ListResponse<Hook>>(),

  get: (hid: string) => api.get(`hooks/${hid}`).json<DataResponse<Hook>>(),

  create: (body: CreateHookBody) => api.post('hooks', { json: body }).json<DataResponse<Hook>>(),

  update: (hid: string, patch: UpdateHookBody) =>
    api.put(`hooks/${hid}`, { json: patch }).json<DataResponse<Hook>>(),

  delete: (hid: string) => api.delete(`hooks/${hid}`),

  test: (hid: string) =>
    api.post(`hooks/${hid}/test`).json<DataResponse<{ status: string; at: string }>>(),
};
