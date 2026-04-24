import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Copy, Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { ServerPorts } from '@/api/config';
import type { PushSnapshot, Stream } from '@/api/types';
import { useServerConfig } from '@/features/config/hooks/useServerConfig';
import { CollapsibleRow } from '@/features/streams/components/CollapsibleRow';
import { RuntimeErrorIndicator } from '@/features/streams/components/RuntimeErrorIndicator';
import { useFormConfigSync } from '@/features/streams/hooks/useFormConfigSync';
import { useSaveStream } from '@/features/streams/hooks/useStreams';
import { outputFormSchema, type OutputFormValues } from '@/features/streams/schemas';
import { copyText } from '@/lib/clipboard';
import { formatDurationSince } from '@/lib/format';
import { dashUrl, hlsUrl, rtmpUrl, rtspUrl, srtUrl } from '@/lib/streamUrls';

function protocolDisabledReason(
  key: 'hls' | 'dash' | 'rtmp' | 'rtsp' | 'srt',
  ports: ServerPorts | undefined,
): string | null {
  if (key === 'hls' || key === 'dash') return null;
  const portField = key === 'rtmp' ? 'rtmp_port' : key === 'rtsp' ? 'rtsp_port' : 'srt_port';
  if (!ports?.[portField]) {
    return `Server publisher.${key}.port is not configured.`;
  }
  return null;
}

interface OutputTabProps {
  stream: Stream;
}

const PROTOCOL_LABELS: Record<string, { label: string; description: string }> = {
  hls: {
    label: 'HLS',
    description: 'Adaptive bitrate streaming over HTTP',
  },
  dash: {
    label: 'DASH',
    description: 'Dynamic Adaptive Streaming over HTTP',
  },
  rtmp: {
    label: 'RTMP',
    description: 'Real-Time Messaging Protocol',
  },
  rtsp: {
    label: 'RTSP',
    description: 'Real-Time Streaming Protocol',
  },
  srt: {
    label: 'SRT',
    description: 'Secure Reliable Transport',
  },
};

function toFormValues(stream: Stream): OutputFormValues {
  return {
    protocols: {
      hls: stream.protocols?.hls ?? false,
      dash: stream.protocols?.dash ?? false,
      rtmp: stream.protocols?.rtmp ?? false,
      rtsp: stream.protocols?.rtsp ?? false,
      srt: stream.protocols?.srt ?? false,
    },
    push: (stream.push ?? []).map((p) => ({
      url: p.url,
      enabled: p.enabled ?? true,
      comment: p.comment ?? '',
      timeout_sec: p.timeout_sec,
      retry_timeout_sec: p.retry_timeout_sec,
      limit: p.limit,
    })),
  };
}

export function OutputTab({ stream }: OutputTabProps) {
  const update = useSaveStream();
  const { data: serverConfig } = useServerConfig();
  const ports = serverConfig?.ports;

  const form = useForm<OutputFormValues>({
    resolver: zodResolver(outputFormSchema),
    defaultValues: toFormValues(stream),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'push',
  });

  useFormConfigSync(form, toFormValues(stream));

  function onSubmit(values: OutputFormValues) {
    const original = toFormValues(stream);
    const patch: Partial<Record<string, unknown>> = {};

    const protocolsChanged =
      JSON.stringify(values.protocols) !== JSON.stringify(original.protocols);
    const pushChanged = JSON.stringify(values.push) !== JSON.stringify(original.push);

    if (protocolsChanged) patch.protocols = values.protocols;
    if (pushChanged) patch.push = values.push;

    if (Object.keys(patch).length === 0) {
      toast.info('No changes to save');
      return;
    }

    update.mutate(
      { code: stream.code, body: patch },
      {
        onSuccess: () => {
          toast.success('Output settings updated');
          form.reset(values);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
      },
    );
  }

  const protocols = form.watch('protocols');

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        {/* Protocols */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Output protocols</CardTitle>
            <CardDescription>
              Enable the delivery protocols for this stream. Each enabled protocol activates the
              corresponding output endpoint.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {(
              [
                ['protocols.hls', 'hls'],
                ['protocols.dash', 'dash'],
                ['protocols.rtmp', 'rtmp'],
                ['protocols.rtsp', 'rtsp'],
                ['protocols.srt', 'srt'],
              ] as const
            ).map(([fieldName, key]) => {
              const disabledReason = protocolDisabledReason(key, ports);
              return (
                <FormField
                  key={key}
                  control={form.control}
                  name={fieldName}
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="space-y-0.5">
                        <FormLabel className="flex items-center gap-2">
                          <Badge variant="outline" className="h-5 w-12 justify-center text-[11px]">
                            {PROTOCOL_LABELS[key].label}
                          </Badge>
                          <span>{PROTOCOL_LABELS[key].description}</span>
                          {disabledReason && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[260px]">
                                <p className="text-xs">
                                  {disabledReason}{' '}
                                  <Link to="/settings" className="underline hover:no-underline">
                                    Open global config
                                  </Link>
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value as boolean}
                          onCheckedChange={field.onChange}
                          disabled={!!disabledReason && !field.value}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              );
            })}
          </CardContent>
        </Card>

        {/* Output URLs (read-only) */}
        {Object.values(protocols).some(Boolean) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Output URLs</CardTitle>
              <CardDescription>
                These URLs become active when the stream is running.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {protocols.hls && <OutputUrlRow label="HLS" url={hlsUrl(stream.code)} />}
              {protocols.dash && <OutputUrlRow label="DASH" url={dashUrl(stream.code)} />}
              {protocols.rtmp && (
                <OutputUrlRow label="RTMP" url={rtmpUrl(stream.code, ports)} protocol="rtmp" />
              )}
              {protocols.rtsp && (
                <OutputUrlRow label="RTSP" url={rtspUrl(stream.code, ports)} protocol="rtsp" />
              )}
              {protocols.srt && (
                <OutputUrlRow label="SRT" url={srtUrl(stream.code, ports)} protocol="srt" />
              )}
            </CardContent>
          </Card>
        )}

        {/* Push destinations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Push destinations</CardTitle>
                <CardDescription>
                  External RTMP/RTMPS endpoints the server actively pushes to (YouTube, Twitch,
                  Facebook, etc.)
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
                No push destinations configured
              </p>
            )}
            {fields.map((field, index) => (
              <PushDestRow
                key={field.id}
                index={index}
                form={form}
                runtimePushes={stream.runtime?.publisher?.pushes}
                onRemove={() => remove(index)}
              />
            ))}
          </CardContent>
        </Card>

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

interface OutputUrlRowProps {
  label: string;
  url: string | null;
  protocol?: 'rtmp' | 'rtsp' | 'srt';
}

function OutputUrlRow({ label, url, protocol }: OutputUrlRowProps) {
  if (!url) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2">
        <Badge variant="secondary" className="h-5 w-12 justify-center text-[11px] shrink-0">
          {label}
        </Badge>
        <div className="flex-1 flex items-center gap-2 text-xs">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span className="text-amber-700 dark:text-amber-300">
            Server publisher not configured
            {protocol ? ` (set publisher.${protocol}.port in ` : ' (configure ports in '}
            <Link to="/settings" className="underline hover:no-underline">
              global config
            </Link>
            )
          </span>
        </div>
      </div>
    );
  }

  async function copy() {
    const ok = await copyText(url!);
    if (ok) toast.success('Copied');
    else toast.error('Copy failed — your browser blocked clipboard access');
  }

  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-2">
      <Badge variant="secondary" className="h-5 w-12 justify-center text-[11px] shrink-0">
        {label}
      </Badge>
      <span className="flex-1 truncate font-mono text-xs text-muted-foreground">{url}</span>
      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => void copy()}>
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

interface PushDestRowProps {
  index: number;
  form: ReturnType<typeof useForm<OutputFormValues>>;
  runtimePushes?: PushSnapshot[];
  onRemove: () => void;
}

function PushDestRow({ index, form, runtimePushes, onRemove }: PushDestRowProps) {
  const url = useWatch({ control: form.control, name: `push.${index}.url` });
  const runtime = url ? runtimePushes?.find((p) => p.url === url) : undefined;
  const errors = runtime?.errors ?? [];
  const uptime = runtime?.connected_at ? formatDurationSince(runtime.connected_at) : null;

  return (
    <CollapsibleRow
      header={
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          <RuntimeErrorIndicator
            status={runtime?.status}
            errors={runtime?.errors}
            label={`Destination ${index + 1}`}
            meta={runtime?.attempt ? `Attempt ${runtime.attempt}` : undefined}
          />
          <span className="flex min-w-0 items-center gap-2 truncate text-sm">
            <span className="font-medium">Destination {index + 1}</span>
            {uptime && (
              <>
                <span className="text-muted-foreground/40">|</span>
                <span className="text-xs text-muted-foreground">Uptime {uptime}</span>
              </>
            )}
            {errors.length > 0 && (
              <>
                <span className="text-muted-foreground/40">|</span>
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  {errors.length} {errors.length === 1 ? 'error' : 'errors'}
                </span>
              </>
            )}
          </span>
        </span>
      }
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
            onClick={onRemove}
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
        <FormField
          control={form.control}
          name={`push.${index}.timeout_sec`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timeout (s)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  placeholder="default"
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
          name={`push.${index}.retry_timeout_sec`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Retry delay (s)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  placeholder="default"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </CollapsibleRow>
  );
}
