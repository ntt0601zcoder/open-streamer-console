// ─── Enums (const + typeof pattern) ──────────────────────────────────────────

export const StreamStatus = {
  idle: 'idle',
  active: 'active',
  degraded: 'degraded',
  stopped: 'stopped',
} as const;
export type StreamStatus = (typeof StreamStatus)[keyof typeof StreamStatus];

export const PushStatus = {
  idle: 'idle',
  connecting: 'connecting',
  active: 'active',
  retrying: 'retrying',
  failed: 'failed',
  disabled: 'disabled',
} as const;
export type PushStatus = (typeof PushStatus)[keyof typeof PushStatus];

export const RecordingStatus = {
  recording: 'recording',
  stopped: 'stopped',
  failed: 'failed',
} as const;
export type RecordingStatus = (typeof RecordingStatus)[keyof typeof RecordingStatus];

export const HookType = { http: 'http', kafka: 'kafka' } as const;
export type HookType = (typeof HookType)[keyof typeof HookType];

export const AudioCodec = {
  aac: 'aac',
  mp3: 'mp3',
  opus: 'opus',
  ac3: 'ac3',
  copy: 'copy',
} as const;
export type AudioCodec = (typeof AudioCodec)[keyof typeof AudioCodec];

export const VideoCodec = {
  h264: 'h264',
  h265: 'h265',
  av1: 'av1',
  vp9: 'vp9',
  copy: 'copy',
} as const;
export type VideoCodec = (typeof VideoCodec)[keyof typeof VideoCodec];

export const WatermarkType = { text: 'text', image: 'image' } as const;
export type WatermarkType = (typeof WatermarkType)[keyof typeof WatermarkType];

export const WatermarkPosition = {
  top_left: 'top_left',
  top_right: 'top_right',
  bottom_left: 'bottom_left',
  bottom_right: 'bottom_right',
  center: 'center',
} as const;
export type WatermarkPosition = (typeof WatermarkPosition)[keyof typeof WatermarkPosition];

export const HWAccel = {
  none: 'none',
  nvenc: 'nvenc',
  vaapi: 'vaapi',
  qsv: 'qsv',
  videotoolbox: 'videotoolbox',
} as const;
export type HWAccel = (typeof HWAccel)[keyof typeof HWAccel];

export const EventType = {
  stream_created: 'stream.created',
  stream_started: 'stream.started',
  stream_stopped: 'stream.stopped',
  stream_deleted: 'stream.deleted',
  input_connected: 'input.connected',
  input_reconnecting: 'input.reconnecting',
  input_degraded: 'input.degraded',
  input_failed: 'input.failed',
  input_failover: 'input.failover',
  recording_started: 'recording.started',
  recording_stopped: 'recording.stopped',
  recording_failed: 'recording.failed',
  segment_written: 'segment.written',
  transcoder_started: 'transcoder.started',
  transcoder_stopped: 'transcoder.stopped',
  transcoder_error: 'transcoder.error',
} as const;
export type EventType = (typeof EventType)[keyof typeof EventType];

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface InputNetConfig {
  connect_timeout_sec?: number;
  read_timeout_sec?: number;
  reconnect?: boolean;
  reconnect_delay_sec?: number;
  reconnect_max_delay_sec?: number;
  max_reconnects?: number;
}

export interface Input {
  url: string;
  priority?: number;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  net?: InputNetConfig;
}

export interface OutputProtocols {
  hls?: boolean;
  dash?: boolean;
  rtmp?: boolean;
  rtsp?: boolean;
  srt?: boolean;
}

export interface PushDestination {
  url: string;
  enabled?: boolean;
  status?: PushStatus;
  comment?: string;
  timeout_sec?: number;
  retry_timeout_sec?: number;
  limit?: number;
}

export interface StreamDVRConfig {
  enabled?: boolean;
  retention_sec?: number;
  segment_duration?: number;
  max_size_gb?: number;
  storage_path?: string;
}

export interface ThumbnailConfig {
  enabled?: boolean;
  width?: number;
  height?: number;
  interval_sec?: number;
  quality?: number;
  output_dir?: string;
}

export interface AudioTranscodeConfig {
  codec?: AudioCodec;
  bitrate?: number;
  channels?: number;
  sample_rate?: number;
  language?: string;
  normalize?: boolean;
  copy?: boolean;
}

export interface VideoProfile {
  codec?: VideoCodec;
  bitrate?: number;
  max_bitrate?: number;
  width?: number;
  height?: number;
  framerate?: number;
  keyframe_interval?: number;
  preset?: string;
  profile?: string;
  level?: string;
}

export interface VideoTranscodeConfig {
  copy?: boolean;
  profiles?: VideoProfile[];
}

export interface DecoderConfig {
  name?: string;
}

export interface TranscoderGlobalConfig {
  hw?: HWAccel;
  deviceid?: number;
  fps?: number;
  gop?: number;
}

export interface TranscoderConfig {
  decoder?: DecoderConfig;
  video?: VideoTranscodeConfig;
  audio?: AudioTranscodeConfig;
  global?: TranscoderGlobalConfig;
  extra_args?: string[];
}

export interface WatermarkConfig {
  enabled?: boolean;
  type?: WatermarkType;
  text?: string;
  image_path?: string;
  position?: WatermarkPosition;
  opacity?: number;
  font_size?: number;
  font_file?: string;
  font_color?: string;
  offset_x?: number;
  offset_y?: number;
}

export interface InputRuntimeInfo {
  bitrate_kbps?: number;
  packet_loss?: number;
  status?: string;
  last_packet_at?: string;
  last_error?: string;
  last_error_at?: string;
}

export interface StreamRuntime {
  active_input_priority?: number;
  override_input_priority?: number;
  inputs?: InputRuntimeInfo[];
  exhausted?: boolean;
}

export interface Stream {
  code: string;
  name: string;
  description?: string;
  stream_key?: string;
  status: StreamStatus;
  pipeline_active?: boolean;
  disabled?: boolean;
  inputs?: Input[];
  protocols?: OutputProtocols;
  push?: PushDestination[];
  dvr?: StreamDVRConfig;
  thumbnail?: ThumbnailConfig;
  transcoder?: TranscoderConfig;
  watermark?: WatermarkConfig;
  tags?: string[];
  runtime?: StreamRuntime;
  created_at: string;
  updated_at: string;
}

export interface Recording {
  id: string;
  stream_code: string;
  status: RecordingStatus;
  segment_dir?: string;
  started_at: string;
  stopped_at?: string;
}

export interface StreamCodeFilter {
  only?: string[];
  except?: string[];
}

export interface Hook {
  id: string;
  name: string;
  type: HookType;
  target: string;
  enabled?: boolean;
  event_types?: EventType[];
  stream_codes?: StreamCodeFilter;
  metadata?: Record<string, string>;
  secret?: string;
  max_retries?: number;
  timeout_sec?: number;
}

// ─── API request bodies ───────────────────────────────────────────────────────

// Unified body for POST /streams/:code (create or partial-update).
// code is a path param — all fields are optional for partial update.
export type StreamBody = {
  name?: string;
  description?: string;
  stream_key?: string;
  disabled?: boolean;
  inputs?: Input[];
  protocols?: OutputProtocols;
  push?: PushDestination[];
  dvr?: StreamDVRConfig;
  thumbnail?: ThumbnailConfig;
  transcoder?: TranscoderConfig;
  watermark?: WatermarkConfig;
  tags?: string[];
};

export type CreateHookBody = Omit<Hook, 'id'>;
export type UpdateHookBody = Partial<Omit<Hook, 'id'>>;

// ─── API response wrappers ────────────────────────────────────────────────────

export interface ListResponse<T> {
  data: T[];
  total: number;
}

export interface DataResponse<T> {
  data: T;
}
