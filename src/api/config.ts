import { api } from './client';
import type {
  AudioCodec,
  HWAccel,
  StreamStatus,
  VideoCodec,
  WatermarkPosition,
  WatermarkType,
} from './types';

export interface ServerPorts {
  http_addr?: string; // e.g. ":8080"
  rtsp_port?: number; // 0 = disabled
  rtmp_port?: number; // 0 = disabled
  srt_port?: number; // 0 = disabled
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
  hls_max_segment_buffer?: number;
}

// ─── Listeners (shared by ingest + play) ───────────────────────────────────────

export interface RTMPListenerConfig {
  enabled?: boolean;
  listen_host?: string;
  port?: number;
}

export interface RTSPListenerConfig {
  enabled?: boolean;
  listen_host?: string;
  port?: number;
  transport?: string; // "tcp" | "udp"
}

export interface SRTListenerConfig {
  enabled?: boolean;
  listen_host?: string;
  port?: number;
  latency_ms?: number;
}

export interface ListenersConfig {
  rtmp?: RTMPListenerConfig;
  rtsp?: RTSPListenerConfig;
  srt?: SRTListenerConfig;
}

export interface LogConfig {
  level?: string; // "debug" | "info" | "warn" | "error"
  format?: string; // "text" | "json"
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

export interface PublisherConfig {
  hls?: PublisherHLSConfig;
  dash?: PublisherDASHConfig;
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
  listeners?: ListenersConfig;
  log?: LogConfig;
  manager?: ManagerConfig;
  publisher?: PublisherConfig;
  server?: AppServerConfig;
  transcoder?: TranscoderConfig;
}

// ─── Version info ──────────────────────────────────────────────────────────────

export interface VersionInfo {
  version?: string;
  commit?: string;
  built_at?: string;
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
  version?: VersionInfo;
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
  getYaml: () => api.get('config/yaml', { headers: { Accept: 'application/yaml' } }).text(),
  updateYaml: (yaml: string) =>
    api
      .put('config/yaml', {
        body: yaml,
        headers: { 'Content-Type': 'application/yaml' },
      })
      .json<Record<string, unknown>>(),
};
