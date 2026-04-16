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
});

export const inputSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  priority: z.coerce.number().int().min(0),
  net: inputNetSchema.optional(),
});

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

export const transcoderFormSchema = z.object({
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
    // profile[0] fields
    codec: z.string().optional(),
    bitrate: z.coerce.number().int().min(0).optional(),
    width: z.coerce.number().int().min(0).optional(),
    height: z.coerce.number().int().min(0).optional(),
    framerate: z.coerce.number().min(0).optional(),
  }),
  global: z.object({
    hw: z.string().optional(),
    deviceid: z.coerce.number().int().min(0).optional(),
    fps: z.coerce.number().int().min(0).optional(),
    gop: z.coerce.number().int().min(0).optional(),
  }),
});

export type TranscoderFormValues = z.infer<typeof transcoderFormSchema>;

// ─── DVR ──────────────────────────────────────────────────────────────────────

export const dvrFormSchema = z.object({
  enabled: z.boolean(),
  retention_sec: z.coerce.number().int().min(0).optional(),
  segment_duration: z.coerce.number().int().min(0).optional(),
  max_size_gb: z.coerce.number().min(0).optional(),
  storage_path: z.string(),
});

export type DvrFormValues = z.infer<typeof dvrFormSchema>;
