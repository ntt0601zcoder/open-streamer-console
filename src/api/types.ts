// ─── Enums (const + typeof pattern) ──────────────────────────────────────────

export const StreamStatus = {
  idle: 'idle',
  active: 'active',
  degraded: 'degraded',
  stopped: 'stopped',
} as const;
export type StreamStatus = (typeof StreamStatus)[keyof typeof StreamStatus];

// Tags whether a Stream record was persisted in the config store or
// materialised on the fly by auto-publish (template-prefix match).
// Runtime streams have no on-disk config, so the UI must forbid edits.
export const StreamSource = {
  config: 'config',
  runtime: 'runtime',
} as const;
export type StreamSource = (typeof StreamSource)[keyof typeof StreamSource];

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
  mp2a: 'mp2a',
  ac3: 'ac3',
  eac3: 'eac3',
  copy: 'copy',
} as const;
export type AudioCodec = (typeof AudioCodec)[keyof typeof AudioCodec];

export const VideoCodec = {
  h264: 'h264',
  h265: 'h265',
  mp2v: 'mp2v',
  av1: 'av1',
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
  stream_updated: 'stream.updated',
  stream_started: 'stream.started',
  stream_stopped: 'stream.stopped',
  stream_deleted: 'stream.deleted',
  stream_runtime_created: 'stream.runtime_created',
  stream_runtime_expired: 'stream.runtime_expired',
  input_connected: 'input.connected',
  input_reconnecting: 'input.reconnecting',
  input_degraded: 'input.degraded',
  input_failed: 'input.failed',
  input_failover: 'input.failover',
  input_recovered: 'input.recovered',
  recording_started: 'recording.started',
  recording_stopped: 'recording.stopped',
  recording_failed: 'recording.failed',
  segment_written: 'segment.written',
  dvr_segment_pruned: 'dvr.segment_pruned',
  transcoder_started: 'transcoder.started',
  transcoder_stopped: 'transcoder.stopped',
  transcoder_error: 'transcoder.error',
  push_started: 'push.started',
  push_active: 'push.active',
  push_reconnecting: 'push.reconnecting',
  push_failed: 'push.failed',
  config_changed: 'config.changed',
  watermark_asset_created: 'watermark.asset_created',
  watermark_asset_deleted: 'watermark.asset_deleted',
  hook_created: 'hook.created',
  hook_updated: 'hook.updated',
  hook_deleted: 'hook.deleted',
  template_created: 'template.created',
  template_updated: 'template.updated',
  template_deleted: 'template.deleted',
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
  /**
   * Explicit allowlist of TS PIDs to keep — every other PID is dropped at ingest.
   * Use when source PSI is unreliable or to cherry-pick a subset (drop teletext,
   * keep one of N audio languages, …). Pure PID-level filter — operators must
   * include PID 0 (PAT), the PMT PID, and every desired ES PID.
   *
   * Layers with `program` when both are set: `program` runs first (auto-detect
   * ES PIDs + rewrite PAT to single-program), then `pids` restricts further.
   * Empty (default) disables the filter. UDP only.
   */
  pids?: number[];
}

export interface OutputProtocols {
  hls?: boolean;
  dash?: boolean;
  rtmp?: boolean;
  rtsp?: boolean;
  srt?: boolean;
  /**
   * MPEGTS exposes raw MPEG-TS over chunked HTTP at /<code>/mpegts — the
   * lowest-latency relay path between Open-Streamer instances and any HTTP
   * client that can consume chunked TS (ffmpeg / VLC). Latency bound is
   * network RTT + one buffer-hub chunk (50–200 ms vs 4–10 s for HLS / DASH).
   * No goroutine per-stream — endpoint subscribes to the playback buffer on
   * demand. Disabling returns 404 for that stream.
   */
  mpegts?: boolean;
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
  /**
   * Selects which renditions the CMAF blob archive records.
   * "" or "best" = the best rendition only (default); "all" = every
   * rendition in the ABR ladder.
   */
  profiles?: string;
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

export interface TranscoderConfig {
  decoder?: DecoderConfig;
  video?: VideoTranscodeConfig;
  audio?: AudioTranscodeConfig;
  global?: TranscoderGlobalConfig;
}

export interface WatermarkConfig {
  enabled?: boolean;
  type?: WatermarkType;
  text?: string;
  /**
   * On-disk basename of a WatermarkAsset uploaded via /watermarks. Required
   * for image watermarks — the server resolves it to an absolute path at
   * pipeline start. The previous free-form `image_path` field is no longer
   * accepted on the wire (server tagged it `json:"-"` to prevent operators
   * from pointing at arbitrary paths).
   */
  filename?: string;
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
  /** On-disk basename. Stable identifier referenced by WatermarkConfig.filename. */
  filename: string;
  /** MIME type sniffed at upload time (e.g. "image/png"). */
  content_type: string;
  /** File size in bytes. */
  size_bytes: number;
  /** ISO timestamp of the file's mtime in UTC. */
  uploaded_at: string;
}

export interface WatermarkAssetListResponse {
  data: WatermarkAsset[];
  /** Absolute on-disk directory where uploaded asset files live. */
  dir?: string;
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

export const ProcessStatus = {
  healthy: 'healthy',
  unhealthy: 'unhealthy',
} as const;
export type ProcessStatus = (typeof ProcessStatus)[keyof typeof ProcessStatus];

/**
 * Per-rendition descriptor. The new transcoder pipeline runs a single
 * process per stream that emits every rendition, so per-rendition health
 * is no longer tracked — only the rendition's logical identity (ladder
 * index + track slug used in playlist names).
 */
export interface TranscoderRenditionSnapshot {
  index?: number;
  track?: string;
}

/**
 * Transcoder runtime envelope — one process per stream, so health,
 * restart count and the running errors list moved up from the previous
 * per-profile shape.
 */
export interface TranscoderRuntimeStatus {
  /** Current health of the transcoder process. */
  status?: ProcessStatus;
  /** Total restarts since the stream came up. */
  restart_count?: number;
  /** Rolling list of recent transcoder errors (newest first). */
  errors?: ErrorEntry[];
  /** Renditions the process is currently emitting. */
  renditions?: TranscoderRenditionSnapshot[];
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
  /** Wallclock RFC3339 timestamp the pipeline first went live. Empty when idle/stopped. */
  started_at?: string;
  /** Precomputed elapsed seconds since `started_at` at the time of the response. */
  uptime_sec?: number;
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
  /** Code of the media-auth Policy to enforce on playback. Empty = public. */
  playback_policy?: string;
  /**
   * Optional reference to a {@link Template} code. Config-like fields left
   * empty on the stream inherit from the template at runtime; the server
   * resolves the merged view in `GET /streams/:code`.
   */
  template?: string;
  /**
   * Tag indicating whether the stream is persisted config or a runtime
   * record materialised by auto-publish. Runtime streams cannot be edited.
   */
  source?: StreamSource;
  runtime?: StreamRuntime;
  created_at?: string;
  updated_at?: string;
}

// ─── Play sessions ────────────────────────────────────────────────────────────

export const SessionProto = {
  hls: 'hls',
  dash: 'dash',
  mpegts: 'mpegts',
  rtmp: 'rtmp',
  srt: 'srt',
  rtsp: 'rtsp',
} as const;
export type SessionProto = (typeof SessionProto)[keyof typeof SessionProto];

export const SessionCloseReason = {
  idle: 'idle',
  max_lifetime: 'max_lifetime',
  client_gone: 'client_gone',
  shutdown: 'shutdown',
  kicked: 'kicked',
} as const;
export type SessionCloseReason = (typeof SessionCloseReason)[keyof typeof SessionCloseReason];

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
  playback_policy?: string;
  template?: string;
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

// ─── Templates ────────────────────────────────────────────────────────────────
// A Template is a reusable bundle of stream configuration (inputs, protocols,
// transcoder, watermark, …) that Streams can inherit from via `template: <code>`.
// `prefixes` lets the server auto-publish ingest URLs that match any listed
// URL-path prefix using this template.

export interface Template {
  code: string;
  name?: string;
  description?: string;
  stream_key?: string;
  prefixes?: string[];
  inputs?: Input[];
  protocols?: OutputProtocols;
  push?: PushDestination[];
  dvr?: StreamDVRConfig;
  thumbnail?: ThumbnailConfig;
  transcoder?: TranscoderConfig;
  watermark?: WatermarkConfig;
  tags?: string[];
  /** Inherited by streams whose own `playback_policy` is empty. */
  playback_policy?: string;
}

export type TemplateBody = Omit<Template, 'code'>;

// ─── Media-auth policies ──────────────────────────────────────────────────────

export interface Policy {
  code: string;
  name?: string;
  description?: string;
  /** When true, playback requires a valid signed token verified with token_secret. */
  require_token?: boolean;
  /** HMAC-SHA256 verification key. Required when require_token is true. */
  token_secret?: string;
  allow_ips?: string[];
  deny_ips?: string[];
  /** ISO 3166-1 alpha-2 — requires a GeoIP DB. */
  allow_countries?: string[];
  deny_countries?: string[];
  allow_user_agents?: string[];
  deny_user_agents?: string[];
  /** Exact or parent-domain match on Referer host. */
  allowed_domains?: string[];
}

export type PolicyBody = Omit<Policy, 'code'>;
