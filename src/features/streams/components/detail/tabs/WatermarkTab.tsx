import { Link } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ImageIcon, Type as TypeIcon } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import {
  WatermarkPosition,
  WatermarkType,
  type Stream,
  type WatermarkConfig,
} from '@/api/types';
import { watermarksApi } from '@/api/watermarks';
import { useFormConfigSync } from '@/features/streams/hooks/useFormConfigSync';
import { useSaveStream } from '@/features/streams/hooks/useStreams';
import {
  watermarkFormSchema,
  type WatermarkFormValues,
} from '@/features/streams/schemas';
import { useWatermarkAssets } from '@/features/watermarks/hooks/useWatermarks';

interface WatermarkTabProps {
  stream: Stream;
}

const NO_ASSET = '__none__';

const POSITION_LABELS: Record<WatermarkPosition, string> = {
  top_left: 'Top-left',
  top_right: 'Top-right',
  bottom_left: 'Bottom-left',
  bottom_right: 'Bottom-right',
  center: 'Center',
  custom: 'Custom (FFmpeg expression)',
};

function toFormValues(stream: Stream): WatermarkFormValues {
  const w = stream.watermark;
  return {
    enabled: w?.enabled ?? false,
    type: w?.type ?? WatermarkType.image,
    text: w?.text ?? '',
    asset_id: w?.asset_id ?? '',
    image_path: w?.image_path ?? '',
    position: w?.position ?? WatermarkPosition.bottom_right,
    opacity: w?.opacity,
    font_size: w?.font_size,
    font_file: w?.font_file ?? '',
    font_color: w?.font_color ?? '',
    offset_x: w?.offset_x,
    offset_y: w?.offset_y,
    x: w?.x ?? '',
    y: w?.y ?? '',
    resize: w?.resize ?? false,
    resize_ratio: w?.resize_ratio,
  };
}

function toApiBody(v: WatermarkFormValues): WatermarkConfig {
  const out: WatermarkConfig = {
    enabled: v.enabled,
    type: v.type,
    position: v.position,
  };
  if (v.opacity != null) out.opacity = v.opacity;

  if (v.type === WatermarkType.text) {
    if (v.text) out.text = v.text;
    if (v.font_size != null) out.font_size = v.font_size;
    if (v.font_file) out.font_file = v.font_file;
    if (v.font_color) out.font_color = v.font_color;
  } else {
    if (v.asset_id) out.asset_id = v.asset_id;
    else if (v.image_path) out.image_path = v.image_path;
  }

  if (v.position === WatermarkPosition.custom) {
    if (v.x) out.x = v.x;
    if (v.y) out.y = v.y;
  } else if (v.position !== WatermarkPosition.center) {
    if (v.offset_x != null) out.offset_x = v.offset_x;
    if (v.offset_y != null) out.offset_y = v.offset_y;
  }

  out.resize = v.resize;
  if (v.resize && v.resize_ratio != null) out.resize_ratio = v.resize_ratio;

  return out;
}

export function WatermarkTab({ stream }: WatermarkTabProps) {
  const update = useSaveStream();
  const { data: assets } = useWatermarkAssets();

  const form = useForm<WatermarkFormValues>({
    resolver: zodResolver(watermarkFormSchema),
    defaultValues: toFormValues(stream),
  });

  useFormConfigSync(form, toFormValues(stream));

  const enabled = useWatch({ control: form.control, name: 'enabled' });
  const type = useWatch({ control: form.control, name: 'type' });
  const position = useWatch({ control: form.control, name: 'position' });
  const assetId = useWatch({ control: form.control, name: 'asset_id' });
  const resize = useWatch({ control: form.control, name: 'resize' });

  const selectedAsset = assets?.find((a) => a.id === assetId);

  function onSubmit(values: WatermarkFormValues) {
    update.mutate(
      { code: stream.code, body: { watermark: toApiBody(values) } },
      {
        onSuccess: () => {
          toast.success('Watermark settings updated');
          form.reset(values);
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'Update failed'),
      },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Saving any change here <strong>restarts the transcoder</strong>. Live viewers will
            see a brief drop until encoding resumes.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Watermark / Logo overlay</CardTitle>
                <CardDescription>
                  Burn a text or image overlay into every encoded frame. Applied during
                  transcoding — the source feed is unchanged.
                </CardDescription>
              </div>
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormLabel className="text-sm text-muted-foreground">
                      Watermark enabled
                    </FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardHeader>

          {enabled && (
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Type</FormLabel>
                    <div className="flex gap-2">
                      <TypeButton
                        active={field.value === WatermarkType.image}
                        onClick={() => field.onChange(WatermarkType.image)}
                        icon={<ImageIcon className="h-4 w-4" />}
                        label="Image / Logo"
                      />
                      <TypeButton
                        active={field.value === WatermarkType.text}
                        onClick={() => field.onChange(WatermarkType.text)}
                        icon={<TypeIcon className="h-4 w-4" />}
                        label="Text"
                      />
                    </div>
                  </FormItem>
                )}
              />

              {type === WatermarkType.image ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="asset_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset from library</FormLabel>
                        <Select
                          value={field.value || NO_ASSET}
                          onValueChange={(v) =>
                            field.onChange(v === NO_ASSET ? '' : v)
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an uploaded asset" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={NO_ASSET}>
                              <span className="text-muted-foreground">
                                — None (use file path) —
                              </span>
                            </SelectItem>
                            {(assets ?? []).map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Manage assets in{' '}
                          <Link
                            to="/watermarks"
                            className="underline underline-offset-2 hover:text-foreground"
                          >
                            Watermarks library
                          </Link>
                          .
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="image_path"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image path (fallback)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="/var/lib/open-streamer/logos/foo.png"
                            disabled={!!assetId}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          {assetId
                            ? 'Ignored — asset above takes precedence.'
                            : 'Absolute path to a host-staged image. PNG with alpha recommended.'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedAsset && (
                    <div className="sm:col-span-2">
                      <p className="mb-2 text-xs text-muted-foreground">Preview</p>
                      <div className="inline-block rounded-md border bg-[repeating-conic-gradient(#888_0_25%,_#aaa_0_50%)] bg-[length:16px_16px] p-3 dark:bg-[repeating-conic-gradient(#333_0_25%,_#555_0_50%)]">
                        <img
                          src={watermarksApi.rawUrl(selectedAsset.id)}
                          alt={selectedAsset.name}
                          className="max-h-32 object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="text"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Text</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={2}
                            placeholder="LIVE %{localtime:%H:%M:%S}"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Supports FFmpeg <code className="font-mono">strftime</code> directives
                          for live timestamps.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="font_size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Font size (px)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            placeholder="24"
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
                    name="font_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Font color</FormLabel>
                        <FormControl>
                          <Input placeholder="white@0.8 or #FFFFFF" {...field} />
                        </FormControl>
                        <FormDescription>FFmpeg color syntax.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="font_file"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Font file (optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Absolute path to a .ttf/.otf file. Empty = FFmpeg default.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {enabled && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Position & opacity</CardTitle>
              <CardDescription>
                Where and how strongly the overlay is composited.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(POSITION_LABELS).map(([v, label]) => (
                          <SelectItem key={v} value={v}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="opacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opacity (0.0 – 1.0)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        placeholder="1.0"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {position === WatermarkPosition.custom ? (
                <>
                  <FormField
                    control={form.control}
                    name="x"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>X expression</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="main_w-overlay_w-50"
                            className="font-mono"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="y"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Y expression</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="main_h-overlay_h-50"
                            className="font-mono"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    FFmpeg expressions. Variables: <code>main_w</code>, <code>main_h</code>,{' '}
                    <code>overlay_w</code>, <code>overlay_h</code> (image) or{' '}
                    <code>w</code>, <code>h</code>, <code>tw</code>, <code>th</code> (text).
                  </p>
                </>
              ) : position !== WatermarkPosition.center ? (
                <>
                  <FormField
                    control={form.control}
                    name="offset_x"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Offset X (px)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormDescription>Inward padding from horizontal edge.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="offset_y"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Offset Y (px)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormDescription>Inward padding from vertical edge.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : null}
            </CardContent>
          </Card>
        )}

        {enabled && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Scaling</CardTitle>
                  <CardDescription>
                    Make a single asset render at a consistent visual ratio across every
                    output rendition (e.g. a logo that looks the same on 720p and 480p).
                  </CardDescription>
                </div>
                <FormField
                  control={form.control}
                  name="resize"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormLabel className="text-sm text-muted-foreground">
                        Scale to frame
                      </FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardHeader>

            {resize && (
              <CardContent>
                <FormField
                  control={form.control}
                  name="resize_ratio"
                  render={({ field }) => (
                    <FormItem className="max-w-sm">
                      <FormLabel>Resize ratio (0.0 – 1.0)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={1}
                          step={0.01}
                          placeholder="server default"
                          className="placeholder:italic"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Fraction of the frame's reference dimension. Image uses frame
                        width, text uses frame height. Typical: ~0.05 for a station logo,
                        ~0.20 for a sponsor banner. Empty = inherit per-server default.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            )}
          </Card>
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

interface TypeButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TypeButton({ active, onClick, icon, label }: TypeButtonProps) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      className="gap-2"
    >
      {icon}
      {label}
    </Button>
  );
}
