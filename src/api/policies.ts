import { api } from './client';
import type { DataResponse, Policy, PolicyBody } from './types';

export interface PolicyListResponse {
  data: Policy[];
  total: number;
}

export const policiesApi = {
  list: () => api.get('policies').json<PolicyListResponse>(),
  get: (code: string) =>
    api.get(`policies/${encodeURIComponent(code)}`).json<DataResponse<Policy>>(),
  save: (code: string, body: PolicyBody) =>
    api.post(`policies/${encodeURIComponent(code)}`, { json: body }).json<DataResponse<Policy>>(),
  delete: (code: string) => api.delete(`policies/${encodeURIComponent(code)}`),
};
