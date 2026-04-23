import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
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
import type { Stream, TranscoderConfig, VideoCodec } from '@/api/types';
import { useServerConfig } from '@/features/config/hooks/useServerConfig';
import { VideoProfilesEditor } from '@/features/streams/components/VideoProfilesEditor';
import { useSaveStream } from '@/features/streams/hooks/useStreams';
import { transcoderFormSchema, type TranscoderFormValues } from '@/features/streams/schemas';

interface TranscoderTabProps {
  stream: Stream;
}

function toFormValues(stream: Stream): TranscoderFormValues {
  const t = stream.transcoder;
  return {
    enabled: t !== undefined && t !== null,
    audio: {
      copy: t?.audio?.copy ?? true,
      codec: t?.audio?.codec,
      bitrate: t?.audio?.bitrate,
      channels: t?.audio?.channels,
      sample_rate: t?.audio?.sample_rate,
      normalize: t?.audio?.normalize ?? false,
    },
    video: {
      copy: t?.video?.copy ?? true,
      profiles: (t?.video?.profiles ?? []).map((p) => ({
        codec: p.codec,
        bitrate: p.bitrate,
        max_bitrate: p.max_bitrate,
        width: p.width,
        height: p.height,
        framerate: p.framerate,
        keyframe_interval: p.keyframe_interval,
        preset: p.preset,
        profile: p.profile,
        level: p.level,
      })),
    },
    global: {
      hw: t?.global?.hw,
      deviceid: t?.global?.deviceid,
      fps: t?.global?.fps,
      gop: t?.global?.gop,
    },
  };
}

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
  copy: 'Copy (passthrough)',
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

export function TranscoderTab({ stream }: TranscoderTabProps) {
  const { data: serverConfig } = useServerConfig();
  const update = useSaveStream();

  const form = useForm<TranscoderFormValues>({
    resolver: zodResolver(transcoderFormSchema),
    defaultValues: toFormValues(stream),
  });

  useEffect(() => {
    if (!form.formState.isDirty) {
      form.reset(toFormValues(stream));
    }
  }, [stream, form]);

  const enabled = useWatch({ control: form.control, name: 'enabled' });
  const audioCopy = useWatch({ control: form.control, name: 'audio.copy' });
  const videoCopy = useWatch({ control: form.control, name: 'video.copy' });

  function onSubmit(values: TranscoderFormValues) {
    const transcoder = values.enabled ? buildTranscoderConfig(values) : null;
    update.mutate(
      { code: stream.code, body: { transcoder } as never },
      {
        onSuccess: () => {
          toast.success('Transcoder settings updated');
          form.reset(values);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
      },
    );
  }

  function buildTranscoderConfig(values: TranscoderFormValues): TranscoderConfig {
    const { copy, profiles } = values.video;
    return {
      audio: values.audio as TranscoderConfig['audio'],
      video: {
        copy,
        profiles:
          !copy && profiles.length > 0
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
              }))
            : undefined,
      },
      global: values.global as TranscoderConfig['global'],
    };
  }

  const hwOptions = serverConfig?.hw_accels ?? [];
  const videoCodecOptions = serverConfig?.video_codecs ?? [];
  const audioCodecOptions = serverConfig?.audio_codecs ?? [];

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        {/* Master toggle */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Transcoder</CardTitle>
                <CardDescription>
                  When disabled, the source is delivered as-is — no transcoder pipeline is started.
                  When enabled, you can re-encode video/audio or pass them through (Copy mode).
                </CardDescription>
              </div>
              <FormField
                control={form.control}
                name="enabled"
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
            {/* Hardware */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hardware acceleration</CardTitle>
                <CardDescription>
                  Available accelerators are detected from the server at runtime.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-4">
                <FormField
                  control={form.control}
                  name="global.hw"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Accelerator</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ''}
                        disabled={hwOptions.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger className="data-[placeholder]:italic">
                            <SelectValue placeholder="default" />
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
                  name="global.deviceid"
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
                  name="global.gop"
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

            {/* Video */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Video</CardTitle>
                    <CardDescription>Video encoding settings</CardDescription>
                  </div>
                  <FormField
                    control={form.control}
                    name="video.copy"
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
                <CardContent>
                  <VideoProfilesEditor
                    control={form.control}
                    setValue={form.setValue}
                    name="video.profiles"
                    codecOptions={videoCodecOptions}
                  />
                </CardContent>
              )}
            </Card>

            {/* Audio */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Audio</CardTitle>
                    <CardDescription>Audio encoding settings</CardDescription>
                  </div>
                  <FormField
                    control={form.control}
                    name="audio.copy"
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
                    name="audio.codec"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Codec</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <FormControl>
                            <SelectTrigger className="data-[placeholder]:italic">
                              <SelectValue placeholder="default" />
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
                    name="audio.bitrate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bitrate (kbps)</FormLabel>
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
                    name="audio.channels"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Channels</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(Number(v))}
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
                    name="audio.sample_rate"
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
                    name="audio.normalize"
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

        <div className="flex justify-end gap-2">
          {form.formState.isDirty && (
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset(toFormValues(stream))}
            >
              Discard
            </Button>
          )}
          <Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
