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
import { useSaveStream } from '@/features/streams/hooks/useStreams';
import { transcoderFormSchema, type TranscoderFormValues } from '@/features/streams/schemas';

interface TranscoderTabProps {
  stream: Stream;
}

function toFormValues(stream: Stream): TranscoderFormValues {
  const t = stream.transcoder;
  return {
    audio: {
      copy: t?.audio?.copy ?? false,
      codec: t?.audio?.codec,
      bitrate: t?.audio?.bitrate,
      channels: t?.audio?.channels,
      sample_rate: t?.audio?.sample_rate,
      normalize: t?.audio?.normalize ?? false,
    },
    video: {
      copy: t?.video?.copy ?? false,
      codec: t?.video?.profiles?.[0]?.codec,
      bitrate: t?.video?.profiles?.[0]?.bitrate,
      width: t?.video?.profiles?.[0]?.width,
      height: t?.video?.profiles?.[0]?.height,
      framerate: t?.video?.profiles?.[0]?.framerate,
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

  const audioCopy = useWatch({ control: form.control, name: 'audio.copy' });
  const videoCopy = useWatch({ control: form.control, name: 'video.copy' });

  function onSubmit(values: TranscoderFormValues) {
    const { copy, codec, bitrate, width, height, framerate } = values.video;
    const hasProfile = [codec, bitrate, width, height, framerate].some((v) => v !== undefined);
    const transcoder: TranscoderConfig = {
      audio: values.audio as TranscoderConfig['audio'],
      video: {
        copy,
        profiles: hasProfile
          ? [{ codec: codec as VideoCodec | undefined, bitrate, width, height, framerate }]
          : undefined,
      },
      global: values.global as TranscoderConfig['global'],
    };
    update.mutate(
      { code: stream.code, body: { transcoder } },
      {
        onSuccess: () => {
          toast.success('Transcoder settings updated');
          form.reset(values);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
      },
    );
  }

  const hwOptions = serverConfig?.hw_accels ?? [];
  const videoCodecOptions = serverConfig?.video_codecs ?? [];
  const audioCodecOptions = serverConfig?.audio_codecs ?? [];

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
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
                      <SelectTrigger>
                        <SelectValue placeholder="None (CPU)" />
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
                    <Input type="number" min={0} placeholder="0" {...field} value={field.value ?? ''} />
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
                    <Input type="number" min={0} placeholder="default" {...field} value={field.value ?? ''} />
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
                    <FormLabel className="text-sm text-muted-foreground">Copy (passthrough)</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardHeader>
          {!videoCopy && (
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="video.codec"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codec</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Default" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {videoCodecOptions
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
                name="video.bitrate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bitrate (kbps)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="source" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="video.framerate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>FPS</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="source" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="video.width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Width (px)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="source" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="video.height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (px)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="source" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
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
                    <FormLabel className="text-sm text-muted-foreground">Copy (passthrough)</FormLabel>
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
                        <SelectTrigger>
                          <SelectValue placeholder="Default" />
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
                      <Input type="number" min={0} placeholder="default" {...field} value={field.value ?? ''} />
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
                        <SelectTrigger>
                          <SelectValue placeholder="Default" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CHANNEL_LABELS).map(([v, label]) => (
                          <SelectItem key={v} value={v}>{label}</SelectItem>
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
                      <Input type="number" min={0} placeholder="source" {...field} value={field.value ?? ''} />
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
                      <FormDescription className="text-xs">Apply EBU R128 normalization</FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          )}
        </Card>

        <div className="flex justify-end gap-2">
          {form.formState.isDirty && (
            <Button type="button" variant="outline" onClick={() => form.reset(toFormValues(stream))}>
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
