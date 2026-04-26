import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import {
  FormProvider,
  useFieldArray,
  useForm,
  useWatch,
  type UseFormReturn,
} from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { streamsApi } from '@/api/streams';
import type {
  InterlaceMode,
  ResizeMode,
  StreamBody,
  TranscoderConfig,
  VideoCodec,
} from '@/api/types';
import { useConfigDefaults, useServerConfig } from '@/features/config/hooks/useServerConfig';
import { CollapsibleRow } from '@/features/streams/components/CollapsibleRow';
import { KeyValueListEditor } from '@/features/streams/components/KeyValueListEditor';
import { VideoProfilesEditor } from '@/features/streams/components/VideoProfilesEditor';
import { streamKeys } from '@/features/streams/hooks/useStreams';
import { createStreamSchema, type CreateStreamValues } from '@/features/streams/schemas';
import { listToRecord } from '@/lib/kvList';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const DEFAULT_VALUES: CreateStreamValues = {
  code: '',
  general: { name: '', description: '', stream_key: '', disabled: false, tags: '' },
  inputs: [{ url: '', priority: 0 }],
  protocols: { hls: true, dash: false, rtmp: false, rtsp: false, srt: false },
  push: [],
  transcoder: {
    enabled: false,
    audio: {
      copy: true,
      codec: undefined,
      bitrate: undefined,
      channels: undefined,
      sample_rate: undefined,
      normalize: false,
    },
    video: { copy: true, interlace: undefined, profiles: [] },
    global: { hw: undefined, deviceid: undefined, fps: undefined, gop: undefined },
  },
  dvr: {
    enabled: false,
    retention_sec: undefined,
    segment_duration: undefined,
    max_size_gb: undefined,
    storage_path: '',
  },
};

export function StreamCreatePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const form = useForm<CreateStreamValues>({
    resolver: zodResolver(createStreamSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const create = useMutation({
    mutationFn: ({ code, body }: { code: string; body: StreamBody }) => streamsApi.save(code, body),
    onSuccess: (res, { code }) => {
      qc.setQueryData(streamKeys.detail(code), res.data);
      void qc.invalidateQueries({ queryKey: streamKeys.all });
    },
  });

  function onSubmit(values: CreateStreamValues) {
    const body = buildCreateBody(values);
    create.mutate(
      { code: values.code, body },
      {
        onSuccess: () => {
          toast.success(`Stream "${values.code}" created`);
          navigate(`/streams/${values.code}`);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Create failed'),
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/streams" className="hover:text-foreground transition-colors">
          Streams
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">New stream</span>
      </nav>

      <div>
        <h1 className="text-2xl font-semibold">Create stream</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill in the sections below. Only <strong>Code</strong>, <strong>Name</strong> and at least
          one input are required.
        </p>
      </div>

      <FormProvider {...form}>
        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
          <Tabs defaultValue="general">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="input">Input</TabsTrigger>
              <TabsTrigger value="output">Output</TabsTrigger>
              <TabsTrigger value="transcoder">Transcoder</TabsTrigger>
              <TabsTrigger value="dvr">DVR</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-6">
              <GeneralSection form={form} />
            </TabsContent>
            <TabsContent value="input" className="mt-6">
              <InputsSection form={form} />
            </TabsContent>
            <TabsContent value="output" className="mt-6">
              <OutputSection form={form} />
            </TabsContent>
            <TabsContent value="transcoder" className="mt-6">
              <TranscoderSection form={form} />
            </TabsContent>
            <TabsContent value="dvr" className="mt-6">
              <DvrSection form={form} />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/streams')}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create stream'}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}

// ─── Body construction ────────────────────────────────────────────────────────

function buildCreateBody(v: CreateStreamValues): StreamBody {
  const tags = v.general.tags
    ? v.general.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  let transcoder: TranscoderConfig | undefined;
  if (v.transcoder.enabled) {
    const { copy: videoCopy, interlace, profiles } = v.transcoder.video;
    transcoder = {
      audio: v.transcoder.audio as TranscoderConfig['audio'],
      video: {
        copy: videoCopy,
        interlace: interlace as InterlaceMode | undefined,
        profiles:
          !videoCopy && profiles.length > 0
            ? profiles.map((p) => ({
                codec: p.codec as VideoCodec | undefined,
                bitrate: p.bitrate,
                max_bitrate: p.max_bitrate,
                width: p.width,
                height: p.height,
                framerate: p.framerate,
                keyframe_interval: p.keyframe_interval,
                preset: p.preset,
                profile: p.profile,
                level: p.level,
                bframes: p.bframes,
                refs: p.refs,
                sar: p.sar,
                resize_mode: p.resize_mode as ResizeMode | undefined,
              }))
            : undefined,
      },
      global: v.transcoder.global as TranscoderConfig['global'],
    };
  }

  return {
    name: v.general.name,
    description: v.general.description || undefined,
    stream_key: v.general.stream_key || undefined,
    disabled: v.general.disabled,
    tags: tags.length ? tags : undefined,
    inputs: v.inputs.map((inp, i) => ({
      ...inp,
      priority: i,
      headers: listToRecord(inp.headers),
      params: listToRecord(inp.params),
    })),
    protocols: v.protocols,
    push: v.push.length ? v.push : undefined,
    transcoder,
    dvr: v.dvr.enabled ? v.dvr : { enabled: false },
  };
}

// ─── General section ──────────────────────────────────────────────────────────

function GeneralSection({ form }: { form: UseFormReturn<CreateStreamValues> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Basic info</CardTitle>
        <CardDescription>Stream identity and access settings</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code</FormLabel>
              <FormControl>
                <Input placeholder="my-stream" className="font-mono" {...field} />
              </FormControl>
              <FormDescription>
                Unique slug. Cannot be changed later. Lowercase letters, numbers, hyphens,
                underscores.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="general.name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="My Stream" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="general.stream_key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stream key</FormLabel>
              <FormControl>
                <Input placeholder="Optional ingest auth key" {...field} />
              </FormControl>
              <FormDescription>Used for RTMP/SRT push authentication</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="general.tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <Input placeholder="news, hd, live — comma separated" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="general.description"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Optional description…"
                  rows={2}
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="general.disabled"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3 space-y-0 sm:col-span-2">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div>
                <FormLabel>Start disabled</FormLabel>
                <FormDescription>
                  Create the stream but skip pipeline bootstrap until you enable it later
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

// ─── Inputs section ───────────────────────────────────────────────────────────

function InputsSection({ form }: { form: UseFormReturn<CreateStreamValues> }) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'inputs' });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Input sources</CardTitle>
            <CardDescription>
              First input is primary. Additional inputs serve as failovers in priority order.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => append({ url: '', priority: fields.length })}
          >
            <Plus className="h-4 w-4" />
            Add input
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-lg border">
            <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-2.5">
              <span className="flex-1 text-sm font-medium">Input {index + 1}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                title={fields.length === 1 ? 'At least one input is required' : 'Remove'}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-4 p-4">
              <FormField
                control={form.control}
                name={`inputs.${index}.url`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="rtmp://source/live/key  or  srt://host:port  or  https://…/stream.m3u8"
                        className="font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  HTTP headers
                </p>
                <KeyValueListEditor
                  control={form.control}
                  name={`inputs.${index}.headers`}
                  keyPlaceholder="Authorization"
                  valuePlaceholder="Bearer …"
                  emptyHint="Sent with every request for HTTP/HLS pull inputs."
                  addLabel="Add header"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  URL params
                </p>
                <KeyValueListEditor
                  control={form.control}
                  name={`inputs.${index}.params`}
                  keyPlaceholder="passphrase"
                  valuePlaceholder="value"
                  emptyHint="Merged into the source URL — useful for SRT passphrases, S3 keys, etc."
                  addLabel="Add param"
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Output section ───────────────────────────────────────────────────────────

const PROTOCOL_LABELS: Record<string, string> = {
  hls: 'HLS — HTTP Live Streaming',
  dash: 'DASH — Dynamic Adaptive Streaming',
  rtmp: 'RTMP — Real-Time Messaging Protocol',
  rtsp: 'RTSP — Real-Time Streaming Protocol',
  srt: 'SRT — Secure Reliable Transport',
};

function OutputSection({ form }: { form: UseFormReturn<CreateStreamValues> }) {
  const { data: serverConfig } = useServerConfig();
  const ports = serverConfig?.ports;

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'push' });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Output protocols</CardTitle>
          <CardDescription>
            Enable the delivery protocols for this stream. RTMP/RTSP/SRT require the matching
            listener to be configured in{' '}
            <Link to="/settings" className="underline">
              global config
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {(['hls', 'dash', 'rtmp', 'rtsp', 'srt'] as const).map((key) => {
            const portMissing =
              (key === 'rtmp' && !ports?.rtmp_port) ||
              (key === 'rtsp' && !ports?.rtsp_port) ||
              (key === 'srt' && !ports?.srt_port);
            return (
              <FormField
                key={key}
                control={form.control}
                name={`protocols.${key}`}
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div>
                      <FormLabel>{PROTOCOL_LABELS[key]}</FormLabel>
                      {portMissing && (
                        <FormDescription className="text-xs text-amber-600 dark:text-amber-400">
                          Listener port not configured
                        </FormDescription>
                      )}
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={portMissing && !field.value}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Push destinations</CardTitle>
              <CardDescription>
                External RTMP/RTMPS endpoints the server actively pushes to (YouTube, Twitch, …).
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => append({ url: '', enabled: true, comment: '' })}
            >
              <Plus className="h-4 w-4" />
              Add destination
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No push destinations. Add one to forward this stream to an external service.
            </p>
          )}
          {fields.map((field, index) => (
            <CollapsibleRow
              key={field.id}
              header={<span className="text-sm font-medium">Destination {index + 1}</span>}
              actions={
                <>
                  <FormField
                    control={form.control}
                    name={`push.${index}.enabled`}
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormLabel className="text-xs text-muted-foreground">Enabled</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              }
            >
              <div className="grid gap-4 p-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name={`push.${index}.url`}
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="rtmp://a.rtmp.youtube.com/live2/your-key"
                          className="font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`push.${index}.comment`}
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Comment</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. YouTube main channel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CollapsibleRow>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Transcoder section ───────────────────────────────────────────────────────

const HW_LABELS: Record<string, string> = {
  none: 'None (CPU)',
  nvenc: 'NVIDIA NVENC',
  vaapi: 'Intel / AMD VAAPI',
  qsv: 'Intel QSV',
  videotoolbox: 'Apple VideoToolbox',
};

const CODEC_LABELS: Record<string, string> = {
  h264: 'H.264 (AVC)',
  h265: 'H.265 (HEVC)',
  av1: 'AV1',
  vp9: 'VP9',
  aac: 'AAC',
  mp3: 'MP3',
  opus: 'Opus',
  ac3: 'AC3 (Dolby)',
};

const CHANNEL_LABELS: Record<number, string> = {
  1: '1 — Mono',
  2: '2 — Stereo',
  6: '6 — 5.1 Surround',
};

const INTERLACE_OPTIONS: { value: string; label: string }[] = [
  { value: 'auto', label: 'Auto — detect from source' },
  { value: 'progressive', label: 'Progressive — force deinterlace' },
  { value: 'tff', label: 'TFF — top field first' },
  { value: 'bff', label: 'BFF — bottom field first' },
];

function TranscoderSection({ form }: { form: UseFormReturn<CreateStreamValues> }) {
  const { data: serverConfig } = useServerConfig();
  const enabled = useWatch({ control: form.control, name: 'transcoder.enabled' });
  const videoCopy = useWatch({ control: form.control, name: 'transcoder.video.copy' });
  const audioCopy = useWatch({ control: form.control, name: 'transcoder.audio.copy' });

  const hwOptions = serverConfig?.hw_accels ?? [];
  const videoCodecOptions = serverConfig?.video_codecs ?? [];
  const audioCodecOptions = serverConfig?.audio_codecs ?? [];

  const { data: defaults } = useConfigDefaults();
  const hwPlaceholder = defaults?.transcoder?.global?.hw ?? 'default';
  const audioCodecPlaceholder = defaults?.transcoder?.audio?.codec ?? 'default';
  const audioBitratePlaceholder =
    defaults?.transcoder?.audio?.bitrate_k != null
      ? String(defaults.transcoder.audio.bitrate_k)
      : 'default';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Transcoder</CardTitle>
              <CardDescription>
                Disabled = source delivered as-is (no transcoder pipeline). Enabled lets you
                re-encode or pass through with Copy mode.
              </CardDescription>
            </div>
            <FormField
              control={form.control}
              name="transcoder.enabled"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormLabel className="text-sm text-muted-foreground">Enabled</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </CardHeader>
      </Card>

      {enabled && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hardware acceleration</CardTitle>
              <CardDescription>
                Available accelerators are detected from the server at runtime.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="transcoder.global.hw"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accelerator</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger className="data-[placeholder]:italic">
                          <SelectValue placeholder={hwPlaceholder} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {hwOptions.map((hw) => (
                          <SelectItem key={hw} value={hw}>
                            {HW_LABELS[hw] ?? hw}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="transcoder.global.deviceid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Device ID</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="default"
                        className="placeholder:italic"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="transcoder.global.gop"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GOP (frames)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="default"
                        className="placeholder:italic"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Video</CardTitle>
                  <CardDescription>Video encoding settings</CardDescription>
                </div>
                <FormField
                  control={form.control}
                  name="transcoder.video.copy"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormLabel className="text-sm text-muted-foreground">
                        Copy (passthrough)
                      </FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardHeader>
            {!videoCopy && (
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="transcoder.video.interlace"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interlace handling</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <FormControl>
                            <SelectTrigger className="data-[placeholder]:italic">
                              <SelectValue placeholder="default" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {INTERLACE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <VideoProfilesEditor
                  control={form.control}
                  setValue={form.setValue}
                  name="transcoder.video.profiles"
                  codecOptions={videoCodecOptions}
                />
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Audio</CardTitle>
                  <CardDescription>Audio encoding settings</CardDescription>
                </div>
                <FormField
                  control={form.control}
                  name="transcoder.audio.copy"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormLabel className="text-sm text-muted-foreground">
                        Copy (passthrough)
                      </FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardHeader>
            {!audioCopy && (
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="transcoder.audio.codec"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codec</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl>
                          <SelectTrigger className="data-[placeholder]:italic">
                            <SelectValue placeholder={audioCodecPlaceholder} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {audioCodecOptions
                            .filter((c) => c !== 'copy')
                            .map((c) => (
                              <SelectItem key={c} value={c}>
                                {CODEC_LABELS[c] ?? c}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="transcoder.audio.bitrate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bitrate (kbps)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder={audioBitratePlaceholder}
                          className="placeholder:italic"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="transcoder.audio.channels"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Channels</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(Number(val))}
                        value={field.value != null ? String(field.value) : ''}
                      >
                        <FormControl>
                          <SelectTrigger className="data-[placeholder]:italic">
                            <SelectValue placeholder="default" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(CHANNEL_LABELS).map(([v, label]) => (
                            <SelectItem key={v} value={v}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="transcoder.audio.sample_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sample rate (Hz)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="default"
                          className="placeholder:italic"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="transcoder.audio.normalize"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div>
                        <FormLabel>Normalize loudness</FormLabel>
                        <FormDescription className="text-xs">
                          Apply EBU R128 normalization
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

// ─── DVR section ──────────────────────────────────────────────────────────────

function DvrSection({ form }: { form: UseFormReturn<CreateStreamValues> }) {
  const enabled = useWatch({ control: form.control, name: 'dvr.enabled' });
  const code = useWatch({ control: form.control, name: 'code' });
  const { data: defaults } = useConfigDefaults();
  const segmentDurationPlaceholder =
    defaults?.dvr?.segment_duration != null ? String(defaults.dvr.segment_duration) : 'default';
  const storagePathPlaceholder =
    defaults?.dvr?.storage_path_template?.replace('{streamCode}', code || '{streamCode}') ??
    'default';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">DVR / Recording</CardTitle>
            <CardDescription>
              Configure DVR (time-shift) recording. When enabled, segments are archived to disk.
            </CardDescription>
          </div>
          <FormField
            control={form.control}
            name="dvr.enabled"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormLabel className="text-sm text-muted-foreground">DVR enabled</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </CardHeader>
      {enabled && (
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="dvr.retention_sec"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Retention (seconds)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder="default"
                    className="placeholder:italic"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dvr.segment_duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Segment duration (seconds)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder={segmentDurationPlaceholder}
                    className="placeholder:italic"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dvr.max_size_gb"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max size (GB)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder="default"
                    className="placeholder:italic"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dvr.storage_path"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Storage path</FormLabel>
                <FormControl>
                  <Input
                    placeholder={storagePathPlaceholder}
                    className="placeholder:italic"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      )}
    </Card>
  );
}
