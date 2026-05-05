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

export const HookType = { http: 'http', file: 'file' } as const;
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
  custom: 'custom',
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
  session_opened: 'session.opened',
  session_closed: 'session.closed',
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
  /**
   * Per-protocol operation budget the reader applies when the input is opened.
   * - HLS: HTTP request timeout for playlist GET; segment GETs derive from this.
   * - RTMP: TCP dial / handshake budget.
   * - RTSP: dial + initial read until first packet.
   * - SRT: connection / handshake timeout.
   * Zero = use the server's per-protocol default.
   */
  timeout_sec?: number;
  /** Skip TLS cert verification on HTTPS pulls. */
  insecure_tls?: boolean;
}

export interface Input {
  url: string;
  priority?: number;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  net?: InputNetConfig;
  /**
   * MPEG-TS program selector. When > 0 the ingest pipeline filters a multi-program
   * transport stream (DVB headend / multicast carrying many channels) down to a
   * single program. 0 disables filtering. UDP only — RTSP/RTMP are SPTS by
   * protocol, HLS/SRT/File are SPTS by convention.
   */
  program?: number;
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

export const ResizeMode = {
  pad: 'pad',
  crop: 'crop',
  stretch: 'stretch',
  fit: 'fit',
} as const;
export type ResizeMode = (typeof ResizeMode)[keyof typeof ResizeMode];

export const InterlaceMode = {
  auto: 'auto',
  tff: 'tff',
  bff: 'bff',
  progressive: 'progressive',
} as const;
export type InterlaceMode = (typeof InterlaceMode)[keyof typeof InterlaceMode];

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
  bframes?: number;
  refs?: number;
  sar?: string;
  resize_mode?: ResizeMode;
}

export interface VideoTranscodeConfig {
  copy?: boolean;
  interlace?: InterlaceMode;
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

export const TranscoderMode = { multi: 'multi', per_profile: 'per_profile' } as const;
export type TranscoderMode = (typeof TranscoderMode)[keyof typeof TranscoderMode];

export interface TranscoderConfig {
  decoder?: DecoderConfig;
  video?: VideoTranscodeConfig;
  audio?: AudioTranscodeConfig;
  global?: TranscoderGlobalConfig;
  extra_args?: string[];
  /**
   * FFmpeg process topology. `multi` runs one process per stream emitting
   * every profile (single decode, multi encode); `legacy` spawns one process
   * per profile. Empty = inherit per-server default ("multi").
   */
  mode?: TranscoderMode;
}

export interface WatermarkConfig {
  enabled?: boolean;
  type?: WatermarkType;
  text?: string;
  /** Reference to a WatermarkAsset uploaded via /watermarks. Wins over image_path. */
  asset_id?: string;
  /** Absolute path to an image pre-staged on the host. Mutually exclusive with asset_id. */
  image_path?: string;
  position?: WatermarkPosition;
  opacity?: number;
  font_size?: number;
  font_file?: string;
  font_color?: string;
  offset_x?: number;
  offset_y?: number;
  /** Raw FFmpeg coordinate expression — used only when position === 'custom'. */
  x?: string;
  y?: string;
  /**
   * When true, the watermark renders at a consistent on-screen ratio across
   * every ABR rendition: the largest profile uses the asset's native pixel
   * size and smaller profiles shrink it (and the FontSize / Offset* fields)
   * by the ratio of their width to the largest profile's width.
   * When false (default), every rendition uses native pixels — the overlay
   * looks larger on lower-resolution profiles.
   */
  resize?: boolean;
}

export interface WatermarkAsset {
  id: string;
  name: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  uploaded_at: string;
}

export interface WatermarkAssetListResponse {
  data: WatermarkAsset[];
  total: number;
}

export interface ErrorEntry {
  message: string;
  at: string;
}

export const MediaTrackKind = { video: 'video', audio: 'audio' } as const;
export type MediaTrackKind = (typeof MediaTrackKind)[keyof typeof MediaTrackKind];

export interface MediaTrackInfo {
  kind?: MediaTrackKind;
  /** Codec name from PMT/probe — "h264", "h265", "aac", … */
  codec?: string;
  bitrate_kbps?: number;
  /** Video only. */
  width?: number;
  /** Video only. */
  height?: number;
}

export interface MediaSummary {
  input_bitrate_kbps?: number;
  output_bitrate_kbps?: number;
  inputs?: MediaTrackInfo[];
  outputs?: MediaTrackInfo[];
}

export interface InputHealthSnapshot {
  bitrate_kbps?: number;
  packet_loss?: number;
  status?: StreamStatus;
  last_packet_at?: string;
  errors?: ErrorEntry[];
  input_priority?: number;
  /** Per-input tracks parsed from the source (PMT for MPEG-TS, probe for HLS). */
  tracks?: MediaTrackInfo[];
}

export interface TranscoderProfileSnapshot {
  index?: number;
  track?: string;
  restart_count?: number;
  errors?: ErrorEntry[];
}

export interface TranscoderRuntimeStatus {
  profiles?: TranscoderProfileSnapshot[];
}

export const PublisherPushStatus = {
  starting: 'starting',
  active: 'active',
  reconnecting: 'reconnecting',
  failed: 'failed',
} as const;
export type PublisherPushStatus = (typeof PublisherPushStatus)[keyof typeof PublisherPushStatus];

export interface PushSnapshot {
  url?: string;
  status?: PublisherPushStatus;
  attempt?: number;
  connected_at?: string;
  errors?: ErrorEntry[];
}

export interface PublisherRuntimeStatus {
  pushes?: PushSnapshot[];
}

export const SwitchReason = {
  error: 'error',
  timeout: 'timeout',
  manual: 'manual',
  failback: 'failback',
  recovery: 'recovery',
  input_added: 'input_added',
  input_removed: 'input_removed',
  initial: 'initial',
} as const;
export type SwitchReason = (typeof SwitchReason)[keyof typeof SwitchReason];

export interface SwitchEvent {
  at: string;
  from?: number;
  to?: number;
  reason?: SwitchReason;
  detail?: string;
}

export interface StreamRuntime {
  pipeline_active?: boolean;
  status?: StreamStatus;
  active_input_priority?: number;
  override_input_priority?: number;
  exhausted?: boolean;
  inputs?: InputHealthSnapshot[];
  transcoder?: TranscoderRuntimeStatus;
  publisher?: PublisherRuntimeStatus;
  switches?: SwitchEvent[];
  /** UI-friendly summary of input → output track shape for the dashboard. */
  media?: MediaSummary;
}

export interface Stream {
  code: string;
  name: string;
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
  runtime?: StreamRuntime;
  created_at?: string;
  updated_at?: string;
}

export interface Recording {
  id: string;
  stream_code: string;
  status: RecordingStatus;
  segment_dir?: string;
  started_at: string;
  stopped_at?: string;
}

// ─── Play sessions ────────────────────────────────────────────────────────────

export const SessionProto = {
  hls: 'hls',
  dash: 'dash',
  rtmp: 'rtmp',
  srt: 'srt',
  rtsp: 'rtsp',
} as const;
export type SessionProto = (typeof SessionProto)[keyof typeof SessionProto];

export const SessionCloseReason = {
  idle: 'idle',
  client_gone: 'client_gone',
  shutdown: 'shutdown',
  kicked: 'kicked',
} as const;
export type SessionCloseReason =
  (typeof SessionCloseReason)[keyof typeof SessionCloseReason];

export const SessionNamedBy = {
  token: 'token',
  config: 'config',
  fingerprint: 'fingerprint',
} as const;
export type SessionNamedBy = (typeof SessionNamedBy)[keyof typeof SessionNamedBy];

export interface PlaySession {
  id: string;
  stream_code: string;
  proto: SessionProto;
  ip?: string;
  country?: string;
  user_agent?: string;
  referer?: string;
  query_string?: string;
  token?: string;
  user_name?: string;
  named_by?: SessionNamedBy;
  secure?: boolean;
  dvr?: boolean;
  bytes?: number;
  opened_at?: string;
  started_at?: string;
  updated_at?: string;
  closed_at?: string;
  close_reason?: SessionCloseReason;
}

export interface SessionStats {
  active?: number;
  opened_total?: number;
  closed_total?: number;
  idle_closed_total?: number;
  kicked_total?: number;
}

export interface SessionListResponse {
  sessions: PlaySession[];
  stats?: SessionStats;
  total_count?: number;
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
  /** Per-hook batch size override (HTTP only — File hooks ignore). 0 = server default. */
  batch_max_items?: number;
  /** Per-hook flush timer in seconds. 0 = server default. */
  batch_flush_interval_sec?: number;
  /** Per-hook in-memory queue cap. 0 = server default. */
  batch_max_queue_items?: number;
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
