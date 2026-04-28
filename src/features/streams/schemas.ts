import { z } from 'zod';

// ─── General ──────────────────────────────────────────────────────────────────

export const generalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  stream_key: z.string(),
  disabled: z.boolean(),
  tags: z.string(), // comma-separated — converted to/from string[]
});

export type GeneralFormValues = z.infer<typeof generalSchema>;

// ─── Inputs ───────────────────────────────────────────────────────────────────

export const inputNetSchema = z.object({
  connect_timeout_sec: z.coerce.number().int().min(0).optional(),
  read_timeout_sec: z.coerce.number().int().min(0).optional(),
  reconnect: z.boolean().optional(),
  reconnect_delay_sec: z.coerce.number().int().min(0).optional(),
  reconnect_max_delay_sec: z.coerce.number().int().min(0).optional(),
  max_reconnects: z.coerce.number().int().min(0).optional(),
  insecure_tls: z.boolean().optional(),
});

export const httpKeyValueSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export const inputSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  priority: z.coerce.number().int().min(0),
  net: inputNetSchema.optional(),
  headers: z.array(httpKeyValueSchema).optional(),
  params: z.array(httpKeyValueSchema).optional(),
});

export type HttpKeyValue = z.infer<typeof httpKeyValueSchema>;

export const inputsFormSchema = z.object({
  inputs: z.array(inputSchema),
});

export type InputsFormValues = z.infer<typeof inputsFormSchema>;

// ─── Output ───────────────────────────────────────────────────────────────────

export const pushDestSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  enabled: z.boolean(),
  comment: z.string(),
  timeout_sec: z.coerce.number().int().min(0).optional(),
  retry_timeout_sec: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(0).optional(),
});

export const outputFormSchema = z.object({
  protocols: z.object({
    hls: z.boolean(),
    dash: z.boolean(),
    rtmp: z.boolean(),
    rtsp: z.boolean(),
    srt: z.boolean(),
  }),
  push: z.array(pushDestSchema),
});

export type OutputFormValues = z.infer<typeof outputFormSchema>;

// ─── Transcoder ───────────────────────────────────────────────────────────────

// For fields where 0 is a meaningful, distinct value from "unset" (e.g. bframes=0
// means "explicit no B-frames" while undefined means "encoder default"), preprocess
// the empty string into undefined so it doesn't silently coerce to 0.
const optionalIntPreserveUnset = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce.number().int().min(0).optional(),
);

export const videoProfileSchema = z.object({
  codec: z.string().optional(),
  bitrate: z.coerce.number().int().min(0).optional(),
  max_bitrate: z.coerce.number().int().min(0).optional(),
  width: z.coerce.number().int().min(0).optional(),
  height: z.coerce.number().int().min(0).optional(),
  framerate: z.coerce.number().min(0).optional(),
  keyframe_interval: z.coerce.number().int().min(0).optional(),
  preset: z.string().optional(),
  profile: z.string().optional(),
  level: z.string().optional(),
  bframes: optionalIntPreserveUnset,
  refs: optionalIntPreserveUnset,
  sar: z.string().optional(),
  resize_mode: z.enum(['pad', 'crop', 'stretch', 'fit']).optional(),
});

export type VideoProfileFormValues = z.infer<typeof videoProfileSchema>;

export const transcoderFormSchema = z.object({
  enabled: z.boolean(),
  audio: z.object({
    copy: z.boolean(),
    codec: z.string().optional(),
    bitrate: z.coerce.number().int().min(0).optional(),
    channels: z.coerce.number().int().min(0).optional(),
    sample_rate: z.coerce.number().int().min(0).optional(),
    normalize: z.boolean(),
  }),
  video: z.object({
    copy: z.boolean(),
    interlace: z.enum(['auto', 'tff', 'bff', 'progressive']).optional(),
    profiles: z.array(videoProfileSchema),
  }),
  global: z.object({
    hw: z.string().optional(),
    deviceid: z.coerce.number().int().min(0).optional(),
    fps: z.coerce.number().int().min(0).optional(),
    gop: z.coerce.number().int().min(0).optional(),
  }),
  /**
   * Raw FFmpeg argv tokens appended after the generated command. Each entry
   * is a single token (e.g. ["-x264-params", "keyint=60:scenecut=0"]). Stored
   * as { value: string } so react-hook-form's useFieldArray can give each row
   * a stable id; tokens with empty `value` are dropped on submit.
   */
  extra_args: z.array(z.object({ value: z.string() })).optional(),
});

export type TranscoderFormValues = z.infer<typeof transcoderFormSchema>;

/** Form `[{value:'-x'}, {value:''}]` → API `['-x']`; empty → undefined. */
export function cleanExtraArgs(
  list: { value: string }[] | undefined,
): string[] | undefined {
  const cleaned = (list ?? []).map((a) => a.value.trim()).filter((s) => s.length > 0);
  return cleaned.length > 0 ? cleaned : undefined;
}

// ─── Watermark ────────────────────────────────────────────────────────────────

export const watermarkFormSchema = z.object({
  enabled: z.boolean(),
  type: z.enum(['text', 'image']),
  text: z.string(),
  asset_id: z.string(),
  image_path: z.string(),
  position: z.enum(['top_left', 'top_right', 'bottom_left', 'bottom_right', 'center', 'custom']),
  opacity: z.coerce.number().min(0).max(1).optional(),
  font_size: z.coerce.number().int().min(0).optional(),
  font_file: z.string(),
  font_color: z.string(),
  offset_x: z.coerce.number().int().optional(),
  offset_y: z.coerce.number().int().optional(),
  x: z.string(),
  y: z.string(),
});

export type WatermarkFormValues = z.infer<typeof watermarkFormSchema>;

// ─── DVR ──────────────────────────────────────────────────────────────────────

export const dvrFormSchema = z.object({
  enabled: z.boolean(),
  retention_sec: z.coerce.number().int().min(0).optional(),
  segment_duration: z.coerce.number().int().min(0).optional(),
  max_size_gb: z.coerce.number().min(0).optional(),
  storage_path: z.string(),
});

export type DvrFormValues = z.infer<typeof dvrFormSchema>;

// ─── Create stream (combined) ─────────────────────────────────────────────────

export const createStreamSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .regex(/^[a-z0-9][a-z0-9-_]*$/, 'Lowercase letters, numbers, hyphens, underscores only'),
  general: generalSchema,
  inputs: z.array(inputSchema).min(1, 'At least one input is required'),
  protocols: outputFormSchema.shape.protocols,
  push: z.array(pushDestSchema),
  transcoder: transcoderFormSchema,
  dvr: dvrFormSchema,
});

export type CreateStreamValues = z.infer<typeof createStreamSchema>;
