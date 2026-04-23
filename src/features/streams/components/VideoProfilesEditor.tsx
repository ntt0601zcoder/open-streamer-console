import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import {
  useFieldArray,
  useWatch,
  type Control,
  type FieldArrayPath,
  type FieldValues,
  type Path,
  type UseFormSetValue,
} from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TranscodePresetPicker } from '@/features/streams/components/TranscodePresetPicker';

const CODEC_LABELS: Record<string, string> = {
  h264: 'H.264 (AVC)',
  h265: 'H.265 (HEVC)',
  av1: 'AV1',
  vp9: 'VP9',
};

const PRESET_OPTIONS = [
  'ultrafast',
  'superfast',
  'veryfast',
  'faster',
  'fast',
  'medium',
  'slow',
  'veryslow',
];

const H264_PROFILE_OPTIONS = ['baseline', 'main', 'high'];
const H264_LEVEL_OPTIONS = ['3.0', '3.1', '4.0', '4.1', '4.2', '5.0', '5.1'];

const RESIZE_MODE_OPTIONS: { value: string; label: string }[] = [
  { value: 'pad', label: 'Pad — letterbox (keep aspect, fill black)' },
  { value: 'crop', label: 'Crop — fill (keep aspect, crop excess)' },
  { value: 'stretch', label: 'Stretch — distort to W×H' },
  { value: 'fit', label: 'Fit — keep aspect, no padding' },
];

interface VideoProfilesEditorProps<T extends FieldValues> {
  control: Control<T>;
  setValue: UseFormSetValue<T>;
  /** Field array path, e.g. "video.profiles" or "transcoder.video.profiles". */
  name: FieldArrayPath<T>;
  /** Codec options from server. */
  codecOptions: string[];
}

export function VideoProfilesEditor<T extends FieldValues>({
  control,
  setValue,
  name,
  codecOptions,
}: VideoProfilesEditorProps<T>) {
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {fields.length === 0
            ? 'No profiles configured. Add one to define an output rendition.'
            : `${fields.length} ${fields.length === 1 ? 'rendition' : 'renditions'} (ABR ladder)`}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() =>
            append({
              codec: undefined,
              bitrate: undefined,
              max_bitrate: undefined,
              width: undefined,
              height: undefined,
              framerate: undefined,
              keyframe_interval: undefined,
              preset: undefined,
              profile: undefined,
              level: undefined,
              bframes: undefined,
              refs: undefined,
              sar: undefined,
              resize_mode: undefined,
            } as never)
          }
        >
          <Plus className="h-4 w-4" />
          Add profile
        </Button>
      </div>

      {fields.map((field, index) => (
        <ProfileCard
          key={field.id}
          control={control}
          setValue={setValue}
          basePath={`${name}.${index}` as Path<T>}
          index={index}
          onRemove={() => remove(index)}
          codecOptions={codecOptions}
        />
      ))}
    </div>
  );
}

interface ProfileCardProps<T extends FieldValues> {
  control: Control<T>;
  setValue: UseFormSetValue<T>;
  basePath: Path<T>;
  index: number;
  onRemove: () => void;
  codecOptions: string[];
}

function ProfileCard<T extends FieldValues>({
  control,
  setValue,
  basePath,
  index,
  onRemove,
  codecOptions,
}: ProfileCardProps<T>) {
  const widthPath = `${basePath}.width` as Path<T>;
  const heightPath = `${basePath}.height` as Path<T>;
  const bitratePath = `${basePath}.bitrate` as Path<T>;
  const codecPath = `${basePath}.codec` as Path<T>;
  const maxBitratePath = `${basePath}.max_bitrate` as Path<T>;
  const framerratePath = `${basePath}.framerate` as Path<T>;
  const keyframePath = `${basePath}.keyframe_interval` as Path<T>;
  const presetPath = `${basePath}.preset` as Path<T>;
  const profilePath = `${basePath}.profile` as Path<T>;
  const levelPath = `${basePath}.level` as Path<T>;
  const bframesPath = `${basePath}.bframes` as Path<T>;
  const refsPath = `${basePath}.refs` as Path<T>;
  const sarPath = `${basePath}.sar` as Path<T>;
  const resizeModePath = `${basePath}.resize_mode` as Path<T>;

  const width = useWatch({ control, name: widthPath }) as number | undefined;
  const height = useWatch({ control, name: heightPath }) as number | undefined;
  const bitrate = useWatch({ control, name: bitratePath }) as number | undefined;

  const summary = width && height ? `${width}×${height}` : 'Unscaled';
  const summaryBitrate = bitrate ? ` · ${bitrate} kbps` : '';

  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-lg border">
      <div className="flex items-stretch border-b bg-muted/40">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex flex-1 items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-muted/60"
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            Profile {index + 1}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {summary}
              {summaryBitrate}
            </span>
          </span>
        </button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="mx-2 my-auto h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          title="Remove profile"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {!collapsed && (
        <div className="space-y-4 p-4">
          <TranscodePresetPicker
            width={width}
            height={height}
            bitrate={bitrate}
            onApply={(preset) => {
              setValue(widthPath, preset.width as never, { shouldDirty: true });
              setValue(heightPath, preset.height as never, { shouldDirty: true });
              setValue(bitratePath, preset.video_bitrate as never, { shouldDirty: true });
              setValue(framerratePath, preset.framerate as never, { shouldDirty: true });
            }}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={control}
              name={codecPath}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Codec</FormLabel>
                  <Select onValueChange={field.onChange} value={(field.value as string) ?? ''}>
                    <FormControl>
                      <SelectTrigger className="data-[placeholder]:italic">
                        <SelectValue placeholder="default" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {codecOptions
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
              name={bitratePath}
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
                      value={(field.value as number | string | undefined) ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={maxBitratePath}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max bitrate (kbps)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="default"
                      className="placeholder:italic"
                      {...field}
                      value={(field.value as number | string | undefined) ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={widthPath}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Width (px)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="default"
                      className="placeholder:italic"
                      {...field}
                      value={(field.value as number | string | undefined) ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={heightPath}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Height (px)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="default"
                      className="placeholder:italic"
                      {...field}
                      value={(field.value as number | string | undefined) ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={framerratePath}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>FPS</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="default"
                      className="placeholder:italic"
                      {...field}
                      value={(field.value as number | string | undefined) ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <FormField
              control={control}
              name={presetPath}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preset</FormLabel>
                  <Select onValueChange={field.onChange} value={(field.value as string) ?? ''}>
                    <FormControl>
                      <SelectTrigger className="data-[placeholder]:italic">
                        <SelectValue placeholder="default" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PRESET_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
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
              name={profilePath}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile (H.264/H.265)</FormLabel>
                  <Select onValueChange={field.onChange} value={(field.value as string) ?? ''}>
                    <FormControl>
                      <SelectTrigger className="data-[placeholder]:italic">
                        <SelectValue placeholder="default" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {H264_PROFILE_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
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
              name={levelPath}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Level</FormLabel>
                  <Select onValueChange={field.onChange} value={(field.value as string) ?? ''}>
                    <FormControl>
                      <SelectTrigger className="data-[placeholder]:italic">
                        <SelectValue placeholder="default" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {H264_LEVEL_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
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
              name={keyframePath}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keyframe interval (s)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="default"
                      className="placeholder:italic"
                      {...field}
                      value={(field.value as number | string | undefined) ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <FormField
              control={control}
              name={bframesPath}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>B-frames</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="default"
                      className="placeholder:italic"
                      {...field}
                      value={(field.value as number | string | undefined) ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={refsPath}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference frames</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="default"
                      className="placeholder:italic"
                      {...field}
                      value={(field.value as number | string | undefined) ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={sarPath}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SAR (e.g. 1:1)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="default"
                      className="placeholder:italic"
                      {...field}
                      value={(field.value as string | undefined) ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={resizeModePath}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resize mode</FormLabel>
                  <Select onValueChange={field.onChange} value={(field.value as string) ?? ''}>
                    <FormControl>
                      <SelectTrigger className="data-[placeholder]:italic">
                        <SelectValue placeholder="default" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RESIZE_MODE_OPTIONS.map((opt) => (
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
        </div>
      )}
    </div>
  );
}
