import { api, BASE_URL } from './client';
import type { DataResponse, WatermarkAsset, WatermarkAssetListResponse } from './types';

export interface UploadWatermarkInput {
  file: File;
}

// Asset identifier is the on-disk filename (e.g. "logo.png") — the server
// uses it as both the URL slug and the value of WatermarkConfig.filename.
function encodeFilename(filename: string): string {
  return encodeURIComponent(filename);
}

export const watermarksApi = {
  list: () => api.get('watermarks').json<WatermarkAssetListResponse>(),

  get: (filename: string) =>
    api.get(`watermarks/${encodeFilename(filename)}`).json<DataResponse<WatermarkAsset>>(),

  upload: ({ file }: UploadWatermarkInput) => {
    const body = new FormData();
    body.append('file', file);
    return api.post('watermarks', { body }).json<DataResponse<WatermarkAsset>>();
  },

  delete: (filename: string) => api.delete(`watermarks/${encodeFilename(filename)}`),

  /** Direct binary URL — usable as <img src={...}> for previews. */
  rawUrl: (filename: string) => `${BASE_URL}/watermarks/${encodeFilename(filename)}/raw`,
};
