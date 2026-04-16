import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { Stream } from '@/api/types';
import { useUpdateStream } from '@/features/streams/hooks/useStreams';
import { outputFormSchema, type OutputFormValues } from '@/features/streams/schemas';

interface OutputTabProps {
  stream: Stream;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

const PROTOCOL_LABELS: Record<string, { label: string; description: string }> = {
  hls: { label: 'HLS', description: 'Adaptive bitrate streaming over HTTP — compatible with all browsers and mobile devices' },
  dash: {
    label: 'DASH',
    description: 'Dynamic Adaptive Streaming over HTTP — ideal for multi-DRM and adaptive delivery',
  },
  rtmp: { label: 'RTMP', description: 'Real-Time Messaging Protocol — push output to CDNs and restream destinations' },
  rtsp: { label: 'RTSP', description: 'Real-Time Streaming Protocol — pull-based playback for media players and broadcast tools' },
  srt: {
    label: 'SRT',
    description: 'Secure Reliable Transport — low-latency contribution over unreliable networks',
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
  const update = useUpdateStream();

  const form = useForm<OutputFormValues>({
    resolver: zodResolver(outputFormSchema),
    defaultValues: toFormValues(stream),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'push',
  });

  useEffect(() => {
    if (!form.formState.isDirty) {
      form.reset(toFormValues(stream));
    }
  }, [stream, form]);

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
              Enable the delivery protocols for this stream. Each enabled protocol activates
              the corresponding output endpoint.
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
            ).map(([fieldName, key]) => (
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
                      </FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value as boolean}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
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
              {protocols.hls && (
                <OutputUrlRow
                  label="HLS"
                  url={`${BASE_URL}/${stream.code}/index.m3u8`}
                />
              )}
              {protocols.dash && (
                <OutputUrlRow
                  label="DASH"
                  url={`${BASE_URL}/${stream.code}/index.mpd`}
                />
              )}
              {protocols.rtmp && (
                <OutputUrlRow
                  label="RTMP"
                  url={`rtmp://${new URL(BASE_URL).hostname}/live/${stream.code}`}
                />
              )}
              {protocols.rtsp && (
                <OutputUrlRow
                  label="RTSP"
                  url={`rtsp://${new URL(BASE_URL).hostname}:554/streams/${stream.code}`}
                />
              )}
              {protocols.srt && (
                <OutputUrlRow
                  label="SRT"
                  url={`srt://${new URL(BASE_URL).hostname}:7777?streamid=${stream.code}`}
                />
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
                onClick={() =>
                  append({ url: '', enabled: true, comment: '' })
                }
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
              <PushDestRow key={field.id} index={index} form={form} onRemove={() => remove(index)} />
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

function OutputUrlRow({ label, url }: { label: string; url: string }) {
  function copy() {
    void navigator.clipboard.writeText(url).then(() => toast.success('Copied'));
  }

  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-2">
      <Badge variant="secondary" className="h-5 w-12 justify-center text-[11px] shrink-0">
        {label}
      </Badge>
      <span className="flex-1 truncate font-mono text-xs text-muted-foreground">{url}</span>
      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={copy}>
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

interface PushDestRowProps {
  index: number;
  form: ReturnType<typeof useForm<OutputFormValues>>;
  onRemove: () => void;
}

function PushDestRow({ index, form, onRemove }: PushDestRowProps) {
  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-2.5">
        <span className="flex-1 text-sm font-medium">Destination {index + 1}</span>
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
      </div>
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
    </div>
  );
}
