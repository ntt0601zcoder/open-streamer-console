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
  kafka_brokers?: string[];
  worker_count?: number;
}

export interface IngestorConfig {
  rtmp_enabled?: boolean;
  rtmp_addr?: string;
  srt_enabled?: boolean;
  srt_addr?: string;
  hls_max_segment_buffer?: number;
}

export interface LogConfig {
  level?: string;   // "debug" | "info" | "warn" | "error"
  format?: string;  // "text" | "json"
}

export interface ManagerConfig {
  input_packet_timeout_sec?: number;
}

export interface PublisherHLSConfig {
  dir?: string;
  base_url?: string;
  live_segment_sec?: number;
  live_window?: number;
  live_history?: number;
  live_ephemeral?: boolean;
}

export interface PublisherDASHConfig {
  dir?: string;
  live_segment_sec?: number;
  live_window?: number;
  live_history?: number;
  live_ephemeral?: boolean;
}

export interface PublisherRTMPServeConfig {
  listen_host?: string;
  port?: number;
}

export interface PublisherRTSPConfig {
  listen_host?: string;
  port_min?: number;
  transport?: string;  // "tcp" | "udp"
}

export interface PublisherSRTListenerConfig {
  listen_host?: string;
  port?: number;
  latency_ms?: number;
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
  allowed_origins?: string[];
  allowed_methods?: string[];
  allowed_headers?: string[];
  exposed_headers?: string[];
  allow_credentials?: boolean;
  max_age?: number;
}

export interface AppServerConfig {
  http_addr?: string;
  cors?: CORSConfig;
}

export interface TranscoderConfig {
  ffmpeg_path?: string;
  max_workers?: number;
  max_restarts?: number;
}

export interface GlobalConfig {
  buffer?: BufferConfig;
  hooks?: HooksConfig;
  ingestor?: IngestorConfig;
  log?: LogConfig;
  manager?: ManagerConfig;
  publisher?: PublisherConfig;
  server?: AppServerConfig;
  transcoder?: TranscoderConfig;
}

// ─── GET /config response ──────────────────────────────────────────────────────

export interface ServerConfig {
  hw_accels: HWAccel[];
  video_codecs: VideoCodec[];
  audio_codecs: AudioCodec[];
  output_protocols: string[];
  stream_statuses: StreamStatus[];
  watermark_types: WatermarkType[];
  watermark_positions: WatermarkPosition[];
  ports?: ServerPorts;
  global_config?: GlobalConfig;
}

// ─── POST /config response ─────────────────────────────────────────────────────

export interface ConfigUpdateResponse {
  global_config: GlobalConfig;
  ports: ServerPorts;
}

// ─── API ───────────────────────────────────────────────────────────────────────

export const configApi = {
  get: () => api.get('config').json<ServerConfig>(),
  updateGlobal: (body: GlobalConfig) =>
    api.post('config', { json: body }).json<ConfigUpdateResponse>(),
};
