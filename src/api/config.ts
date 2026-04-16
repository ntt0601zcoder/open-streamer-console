import { api } from './client';
import type { AudioCodec, HWAccel, StreamStatus, VideoCodec, WatermarkPosition, WatermarkType } from './types';

export interface ServerConfig {
  hwAccels: HWAccel[];
  videoCodecs: VideoCodec[];
  audioCodecs: AudioCodec[];
  outputProtocols: string[];
  streamStatuses: StreamStatus[];
  watermarkTypes: WatermarkType[];
  watermarkPositions: WatermarkPosition[];
}

export const configApi = {
  get: () => api.get('config').json<ServerConfig>(),
};
