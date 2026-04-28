import { api, BASE_URL } from './client';
import type { DataResponse, WatermarkAsset, WatermarkAssetListResponse } from './types';

export interface UploadWatermarkInput {
  file: File;
  /** Optional display name. Defaults to the original filename on the server. */
  name?: string;
}

export const watermarksApi = {
  list: () => api.get('watermarks').json<WatermarkAssetListResponse>(),

  get: (id: string) => api.get(`watermarks/${id}`).json<DataResponse<WatermarkAsset>>(),

  upload: ({ file, name }: UploadWatermarkInput) => {
    const body = new FormData();
    body.append('file', file);
    const searchParams = name ? { name } : undefined;
    return api
      .post('watermarks', { body, searchParams })
      .json<DataResponse<WatermarkAsset>>();
  },

  delete: (id: string) => api.delete(`watermarks/${id}`),

  /** Direct binary URL — usable as <img src={...}> for previews. */
  rawUrl: (id: string) => `${BASE_URL}/watermarks/${id}/raw`,
};
