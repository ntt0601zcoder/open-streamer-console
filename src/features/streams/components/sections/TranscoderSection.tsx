// See InputsSection.tsx for rationale on reading `control` via useFormContext.
import { useFormContext, useWatch } from 'react-hook-form';
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
import { useConfigDefaults, useServerConfig } from '@/features/config/hooks/useServerConfig';
import { VideoProfilesEditor } from '@/features/streams/components/VideoProfilesEditor';

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

/**
 * Full transcoder editor — hardware/video/audio. Form must have a
 * `transcoder` object matching `transcoderFormSchema` (enabled, video, audio,
 * global). The native libav pipeline doesn't accept raw FFmpeg argv or a
 * topology mode, so those fields are gone server-side.
 */
export function TranscoderSection() {
  const { control, setValue } = useFormContext();
  const { data: serverConfig } = useServerConfig();
  const enabled = useWatch({ control, name: 'transcoder.enabled' });
  const videoCopy = useWatch({ control, name: 'transcoder.video.copy' });
  const audioCopy = useWatch({ control, name: 'transcoder.audio.copy' });

  const hwOptions = serverConfig?.hw_accels ?? [];
  const videoCodecOptions = serverConfig?.video_codecs ?? [];
  const audioCodecOptions = serverConfig?.audio_codecs ?? [];

  const { data: defaults } = useConfigDefaults();
  const hwPlaceholder = defaults?.transcoder?.global?.hw ?? 'default';
  const deviceIdPlaceholder =
    defaults?.transcoder?.global?.deviceid != null
      ? String(defaults.transcoder.global.deviceid)
      : 'default';
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
              control={control}
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
                control={control}
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
                control={control}
                name="transcoder.global.deviceid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Device ID</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder={deviceIdPlaceholder}
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
                control={control}
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
                  control={control}
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
                    control={control}
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
                  control={control}
                  setValue={setValue}
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
                  control={control}
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
                  control={control}
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
                  control={control}
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
                  control={control}
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
                  control={control}
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
                  control={control}
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
