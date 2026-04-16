import { api } from './client';
import type { AudioCodec, HWAccel, StreamStatus, VideoCodec, WatermarkPosition, WatermarkType } from './types';

export interface ServerPorts {
  http_addr?: string;   // e.g. ":8080"
  rtsp_port?: number;   // 0 = disabled
  rtmp_port?: number;   // 0 = disabled
  srt_port?: number;    // 0 = disabled
}

// ─── GlobalConfig sub-types ────────────────────────────────────────────────────

export interface BufferConfig {
  capacity?: number;
}

export interface HooksConfig {
  kafkaBrokers?: string[];
  workerCount?: number;
}

export interface IngestorConfig {
  rtmpenabled?: boolean;
  rtmpaddr?: string;
  srtenabled?: boolean;
  srtaddr?: string;
  hlsmaxSegmentBuffer?: number;
}

export interface LogConfig {
  level?: string;   // "debug" | "info" | "warn" | "error"
  format?: string;  // "text" | "json"
}

export interface ManagerConfig {
  inputPacketTimeoutSec?: number;
}

export interface MetricsConfig {
  addr?: string;
  path?: string;
}

export interface PublisherHLSConfig {
  dir?: string;
  baseURL?: string;
  liveSegmentSec?: number;
  liveWindow?: number;
  liveHistory?: number;
  liveEphemeral?: boolean;
}

export interface PublisherDASHConfig {
  dir?: string;
  liveSegmentSec?: number;
  liveWindow?: number;
  liveHistory?: number;
  liveEphemeral?: boolean;
}

export interface PublisherRTMPServeConfig {
  listenHost?: string;
  port?: number;
}

export interface PublisherRTSPConfig {
  listenHost?: string;
  portMin?: number;
  transport?: string;  // "tcp" | "udp"
}

export interface PublisherSRTListenerConfig {
  listenHost?: string;
  port?: number;
  latencyMS?: number;
}

export interface PublisherConfig {
  hls?: PublisherHLSConfig;
  dash?: PublisherDASHConfig;
  rtmp?: PublisherRTMPServeConfig;
  rtsp?: PublisherRTSPConfig;
  srt?: PublisherSRTListenerConfig;
}

export interface CORSConfig {
  enabled?: boolean;
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  allowCredentials?: boolean;
  maxAge?: number;
}

export interface AppServerConfig {
  httpaddr?: string;
  cors?: CORSConfig;
}

export interface TranscoderConfig {
  ffmpegPath?: string;
  maxWorkers?: number;
  maxRestarts?: number;
}

export interface GlobalConfig {
  buffer?: BufferConfig;
  hooks?: HooksConfig;
  ingestor?: IngestorConfig;
  log?: LogConfig;
  manager?: ManagerConfig;
  metrics?: MetricsConfig;
  publisher?: PublisherConfig;
  server?: AppServerConfig;
  transcoder?: TranscoderConfig;
}

// ─── GET /config response ──────────────────────────────────────────────────────

export interface ServerConfig {
  hwAccels: HWAccel[];
  videoCodecs: VideoCodec[];
  audioCodecs: AudioCodec[];
  outputProtocols: string[];
  streamStatuses: StreamStatus[];
  watermarkTypes: WatermarkType[];
  watermarkPositions: WatermarkPosition[];
  ports?: ServerPorts;
  globalConfig?: GlobalConfig;
}

// ─── POST /config response ─────────────────────────────────────────────────────

export interface ConfigUpdateResponse {
  globalConfig: GlobalConfig;
  ports: ServerPorts;
}

// ─── API ───────────────────────────────────────────────────────────────────────

export const configApi = {
  get: () => api.get('config').json<ServerConfig>(),
  updateGlobal: (body: GlobalConfig) =>
    api.post('config', { json: body }).json<ConfigUpdateResponse>(),
};
