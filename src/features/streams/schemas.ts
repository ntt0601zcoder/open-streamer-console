import { z } from 'zod';

// ─── General ──────────────────────────────────────────────────────────────────

export const generalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  stream_key: z.string(),
  disabled: z.boolean(),
  tags: z.string(), // comma-separated — converted to/from string[]
  /** Optional template code to inherit config-like fields from. '' = none. */
  template: z.string(),
});

export type GeneralFormValues = z.infer<typeof generalSchema>;

// ─── Inputs ───────────────────────────────────────────────────────────────────

export const inputNetSchema = z.object({
  timeout_sec: z.coerce.number().int().min(0).optional(),
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
  program: z.coerce.number().int().min(0).optional(),
  /** Comma/space separated PID list, e.g. "0, 256, 257". Parsed to number[] on submit. */
  pids: z.string().optional(),
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
    mpegts: z.boolean(),
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
});

export type TranscoderFormValues = z.infer<typeof transcoderFormSchema>;

/** Form `"0, 256, 257"` → API `[0, 256, 257]`; empty/no-valid → undefined. */
export function parsePids(input: string | undefined): number[] | undefined {
  if (!input) return undefined;
  const parsed = input
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n >= 0);
  return parsed.length > 0 ? parsed : undefined;
}

// ─── Watermark ────────────────────────────────────────────────────────────────

export const watermarkFormSchema = z.object({
  enabled: z.boolean(),
  type: z.enum(['text', 'image']),
  text: z.string(),
  filename: z.string(),
  position: z.enum(['top_left', 'top_right', 'bottom_left', 'bottom_right', 'center', 'custom']),
  opacity: z.coerce.number().min(0).max(1).optional(),
  font_size: z.coerce.number().int().min(0).optional(),
  font_file: z.string(),
  font_color: z.string(),
  offset_x: z.coerce.number().int().optional(),
  offset_y: z.coerce.number().int().optional(),
  x: z.string(),
  y: z.string(),
  resize: z.boolean(),
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

// ─── Templates ────────────────────────────────────────────────────────────────
// Templates share most of the stream form shape but:
// - no `disabled` / `template` (templates can't reference templates)
// - no inputs.min(1) — a template may carry zero inputs
// - add `prefixes` (auto-publish URL paths)

export const templateGeneralSchema = z.object({
  name: z.string(),
  description: z.string(),
  stream_key: z.string(),
  tags: z.string(),
});

export const templateSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .regex(/^[a-z0-9][a-z0-9-_]*$/, 'Lowercase letters, numbers, hyphens, underscores only'),
  general: templateGeneralSchema,
  prefixes: z.array(z.object({ value: z.string() })),
  inputs: z.array(inputSchema),
  protocols: outputFormSchema.shape.protocols,
  push: z.array(pushDestSchema),
  transcoder: transcoderFormSchema,
  dvr: dvrFormSchema,
});

export type TemplateFormValues = z.infer<typeof templateSchema>;
