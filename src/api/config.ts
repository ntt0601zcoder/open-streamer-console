import { api } from './client';
import type {
  AudioCodec,
  HWAccel,
  ResizeMode,
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
  multi_output?: boolean;
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

// ─── /config/defaults ─────────────────────────────────────────────────────────
// Static defaults the server fills in for unset configuration fields. Fetch
// once at app init and use as form placeholders so operators see the real
// fallback values instead of the literal word "default".

export interface ConfigDefaults {
  buffer?: { capacity?: number };
  dvr?: {
    segment_duration?: number;
    /** Uses {streamCode} as the placeholder — substitute client-side. */
    storage_path_template?: string;
  };
  hook?: { max_retries?: number; timeout_sec?: number };
  ingestor?: {
    hls_playlist_timeout_sec?: number;
    hls_segment_timeout_sec?: number;
    hls_max_segment_buffer?: number;
    rtmp_connect_timeout_sec?: number;
    rtsp_connect_timeout_sec?: number;
  };
  listeners?: {
    rtmp?: { port?: number; listen_host?: string };
    rtsp?: { port?: number; transport?: string; listen_host?: string };
    srt?: { port?: number; listen_host?: string; latency_ms?: number };
  };
  manager?: { input_packet_timeout_sec?: number };
  publisher?: {
    dash?: {
      live_history?: number;
      live_segment_sec?: number;
      live_window?: number;
      live_ephemeral?: boolean;
    };
    hls?: {
      live_history?: number;
      live_segment_sec?: number;
      live_window?: number;
      live_ephemeral?: boolean;
    };
  };
  push?: { retry_timeout_sec?: number; timeout_sec?: number };
  transcoder?: {
    ffmpeg_path?: string;
    multi_output?: boolean;
    audio?: { bitrate_k?: number; codec?: AudioCodec };
    global?: { hw?: HWAccel; deviceid?: number };
    video?: {
      bitrate_k?: number;
      resize_mode?: ResizeMode;
      codec?: VideoCodec;
      /**
       * Map of codec → hw → resolved FFmpeg encoder name. Useful to show users
       * the effective encoder once they pick a codec/hw combo (e.g. h264+nvenc
       * → h264_nvenc).
       */
      encoder_by_codec_hw?: Partial<Record<VideoCodec, Partial<Record<HWAccel, string>>>>;
    };
  };
}

// ─── API ───────────────────────────────────────────────────────────────────────

export const configApi = {
  get: () => api.get('config').json<ServerConfig>(),
  getDefaults: () => api.get('config/defaults').json<ConfigDefaults>(),
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
