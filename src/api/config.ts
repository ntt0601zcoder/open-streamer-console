import { api } from './client';
import type { AudioCodec, HWAccel, StreamStatus, VideoCodec, WatermarkPosition, WatermarkType } from './types';

export interface ServerPorts {
  http_addr?: string;   // e.g. ":8080"
  rtsp_port?: number;   // 0 = disabled
  rtmp_port?: number;   // 0 = disabled
  srt_port?: number;    // 0 = disabled
}

export interface ServerConfig {
  hwAccels: HWAccel[];
  videoCodecs: VideoCodec[];
  audioCodecs: AudioCodec[];
  outputProtocols: string[];
  streamStatuses: StreamStatus[];
  watermarkTypes: WatermarkType[];
  watermarkPositions: WatermarkPosition[];
  ports?: ServerPorts;
}

export const configApi = {
  get: () => api.get('config').json<ServerConfig>(),
};
