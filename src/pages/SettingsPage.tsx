import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { GlobalConfig } from '@/api/config';
import { useServerConfig, useUpdateGlobalConfig } from '@/features/config/hooks/useServerConfig';

// ─── Zod schemas ───────────────────────────────────────────────────────────────

const serverSchema = z.object({
  httpaddr: z.string().optional(),
  cors: z.object({
    enabled: z.boolean().optional(),
    allowedOrigins: z.string().optional(),   // newline-separated in UI
    allowedMethods: z.string().optional(),
    allowedHeaders: z.string().optional(),
    exposedHeaders: z.string().optional(),
    allowCredentials: z.boolean().optional(),
    maxAge: z.coerce.number().int().min(0).optional(),
  }).optional(),
});
type ServerValues = z.infer<typeof serverSchema>;

const ingestorSchema = z.object({
  rtmpenabled: z.boolean().optional(),
  rtmpaddr: z.string().optional(),
  srtenabled: z.boolean().optional(),
  srtaddr: z.string().optional(),
  hlsmaxSegmentBuffer: z.coerce.number().int().min(0).optional(),
});
type IngestorValues = z.infer<typeof ingestorSchema>;

const hlsSchema = z.object({
  dir: z.string().optional(),
  baseURL: z.string().optional(),
  liveSegmentSec: z.coerce.number().int().min(1).optional(),
  liveWindow: z.coerce.number().int().min(1).optional(),
  liveHistory: z.coerce.number().int().min(0).optional(),
  liveEphemeral: z.boolean().optional(),
});
type HlsValues = z.infer<typeof hlsSchema>;

const dashSchema = z.object({
  dir: z.string().optional(),
  liveSegmentSec: z.coerce.number().int().min(1).optional(),
  liveWindow: z.coerce.number().int().min(1).optional(),
  liveHistory: z.coerce.number().int().min(0).optional(),
  liveEphemeral: z.boolean().optional(),
});
type DashValues = z.infer<typeof dashSchema>;

const rtmpServeSchema = z.object({
  listenHost: z.string().optional(),
  port: z.coerce.number().int().min(0).max(65535).optional(),
});
type RtmpServeValues = z.infer<typeof rtmpServeSchema>;

const rtspSchema = z.object({
  listenHost: z.string().optional(),
  portMin: z.coerce.number().int().min(0).max(65535).optional(),
  transport: z.enum(['tcp', 'udp']).optional(),
});
type RtspValues = z.infer<typeof rtspSchema>;

const srtServeSchema = z.object({
  listenHost: z.string().optional(),
  port: z.coerce.number().int().min(0).max(65535).optional(),
  latencyMS: z.coerce.number().int().min(0).optional(),
});
type SrtServeValues = z.infer<typeof srtServeSchema>;

const transcoderSchema = z.object({
  ffmpegPath: z.string().optional(),
  maxWorkers: z.coerce.number().int().min(0).optional(),
  maxRestarts: z.coerce.number().int().min(0).optional(),
});
type TranscoderValues = z.infer<typeof transcoderSchema>;

const managerSchema = z.object({
  inputPacketTimeoutSec: z.coerce.number().int().min(0).optional(),
});
type ManagerValues = z.infer<typeof managerSchema>;

const hooksSchema = z.object({
  workerCount: z.coerce.number().int().min(1).optional(),
  kafkaBrokers: z.string().optional(),  // newline-separated in UI
});
type HooksValues = z.infer<typeof hooksSchema>;

const bufferSchema = z.object({
  capacity: z.coerce.number().int().min(0).optional(),
});
type BufferValues = z.infer<typeof bufferSchema>;

const metricsSchema = z.object({
  addr: z.string().optional(),
  path: z.string().optional(),
});
type MetricsValues = z.infer<typeof metricsSchema>;

const logSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  format: z.enum(['text', 'json']).optional(),
});
type LogValues = z.infer<typeof logSchema>;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toLines(arr?: string[]): string {
  return arr?.join('\n') ?? '';
}

function fromLines(s?: string): string[] | undefined {
  if (!s?.trim()) return undefined;
  return s.split('\n').map((l) => l.trim()).filter(Boolean);
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { data: serverConfig, isLoading } = useServerConfig();
  const cfg = serverConfig?.globalConfig;

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading configuration…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Server Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage global server settings. Changes are applied immediately without restart.
        </p>
      </div>

      <Tabs defaultValue="server">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="server">Server</TabsTrigger>
          <TabsTrigger value="ingestor">Ingestor</TabsTrigger>
          <TabsTrigger value="publisher-hls">HLS</TabsTrigger>
          <TabsTrigger value="publisher-dash">DASH</TabsTrigger>
          <TabsTrigger value="publisher-rtmp">RTMP out</TabsTrigger>
          <TabsTrigger value="publisher-rtsp">RTSP out</TabsTrigger>
          <TabsTrigger value="publisher-srt">SRT out</TabsTrigger>
          <TabsTrigger value="transcoder">Transcoder</TabsTrigger>
          <TabsTrigger value="manager">Manager</TabsTrigger>
          <TabsTrigger value="hooks">Hooks</TabsTrigger>
          <TabsTrigger value="buffer">Buffer</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="log">Logging</TabsTrigger>
        </TabsList>

        <TabsContent value="server" className="mt-6">
          <ServerSection cfg={cfg?.server} />
        </TabsContent>
        <TabsContent value="ingestor" className="mt-6">
          <IngestorSection cfg={cfg?.ingestor} />
        </TabsContent>
        <TabsContent value="publisher-hls" className="mt-6">
          <HlsSection cfg={cfg?.publisher?.hls} />
        </TabsContent>
        <TabsContent value="publisher-dash" className="mt-6">
          <DashSection cfg={cfg?.publisher?.dash} />
        </TabsContent>
        <TabsContent value="publisher-rtmp" className="mt-6">
          <RtmpServeSection cfg={cfg?.publisher?.rtmp} />
        </TabsContent>
        <TabsContent value="publisher-rtsp" className="mt-6">
          <RtspSection cfg={cfg?.publisher?.rtsp} />
        </TabsContent>
        <TabsContent value="publisher-srt" className="mt-6">
          <SrtServeSection cfg={cfg?.publisher?.srt} />
        </TabsContent>
        <TabsContent value="transcoder" className="mt-6">
          <TranscoderSection cfg={cfg?.transcoder} />
        </TabsContent>
        <TabsContent value="manager" className="mt-6">
          <ManagerSection cfg={cfg?.manager} />
        </TabsContent>
        <TabsContent value="hooks" className="mt-6">
          <HooksSection cfg={cfg?.hooks} />
        </TabsContent>
        <TabsContent value="buffer" className="mt-6">
          <BufferSection cfg={cfg?.buffer} />
        </TabsContent>
        <TabsContent value="metrics" className="mt-6">
          <MetricsSection cfg={cfg?.metrics} />
        </TabsContent>
        <TabsContent value="log" className="mt-6">
          <LogSection cfg={cfg?.log} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Shared save button row ────────────────────────────────────────────────────

function SaveRow({ isDirty, isPending, onDiscard }: { isDirty: boolean; isPending: boolean; onDiscard: () => void }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      {isDirty && (
        <Button type="button" variant="outline" onClick={onDiscard}>
          Discard
        </Button>
      )}
      <Button type="submit" disabled={isPending || !isDirty}>
        {isPending ? 'Saving…' : 'Save changes'}
      </Button>
    </div>
  );
}

// ─── Server section ────────────────────────────────────────────────────────────

function ServerSection({ cfg }: { cfg: GlobalConfig['server'] }) {
  const update = useUpdateGlobalConfig();
  const form = useForm<ServerValues>({
    resolver: zodResolver(serverSchema),
    defaultValues: {
      httpaddr: cfg?.httpaddr ?? '',
      cors: {
        enabled: cfg?.cors?.enabled ?? false,
        allowedOrigins: toLines(cfg?.cors?.allowedOrigins),
        allowedMethods: toLines(cfg?.cors?.allowedMethods),
        allowedHeaders: toLines(cfg?.cors?.allowedHeaders),
        exposedHeaders: toLines(cfg?.cors?.exposedHeaders),
        allowCredentials: cfg?.cors?.allowCredentials ?? false,
        maxAge: cfg?.cors?.maxAge,
      },
    },
  });

  useEffect(() => {
    form.reset({
      httpaddr: cfg?.httpaddr ?? '',
      cors: {
        enabled: cfg?.cors?.enabled ?? false,
        allowedOrigins: toLines(cfg?.cors?.allowedOrigins),
        allowedMethods: toLines(cfg?.cors?.allowedMethods),
        allowedHeaders: toLines(cfg?.cors?.allowedHeaders),
        exposedHeaders: toLines(cfg?.cors?.exposedHeaders),
        allowCredentials: cfg?.cors?.allowCredentials ?? false,
        maxAge: cfg?.cors?.maxAge,
      },
    });
  }, [cfg, form]);

  function onSubmit(values: ServerValues) {
    const patch: GlobalConfig = {
      server: {
        httpaddr: values.httpaddr || undefined,
        cors: {
          enabled: values.cors?.enabled,
          allowedOrigins: fromLines(values.cors?.allowedOrigins),
          allowedMethods: fromLines(values.cors?.allowedMethods),
          allowedHeaders: fromLines(values.cors?.allowedHeaders),
          exposedHeaders: fromLines(values.cors?.exposedHeaders),
          allowCredentials: values.cors?.allowCredentials,
          maxAge: values.cors?.maxAge,
        },
      },
    };
    update.mutate(patch, {
      onSuccess: () => { toast.success('Server settings saved'); form.reset(values); },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
    });
  }

  const corsEnabled = form.watch('cors.enabled');

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">HTTP Server</CardTitle>
            <CardDescription>API listener bind address.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="httpaddr" render={({ field }) => (
              <FormItem>
                <FormLabel>Bind address</FormLabel>
                <FormControl><Input placeholder=":8080" {...field} /></FormControl>
                <FormDescription>Host:port to listen on, e.g. <code>:8080</code> or <code>0.0.0.0:8080</code>.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">CORS</CardTitle>
            <CardDescription>Cross-origin request handling for the HTTP API.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="cors.enabled" render={({ field }) => (
              <FormItem className="flex items-center gap-3 space-y-0">
                <FormControl><Switch checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel>Enable CORS</FormLabel>
              </FormItem>
            )} />

            {corsEnabled && (
              <>
                <FormField control={form.control} name="cors.allowedOrigins" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allowed origins</FormLabel>
                    <FormControl><Textarea rows={3} placeholder="https://example.com&#10;*" {...field} value={field.value ?? ''} /></FormControl>
                    <FormDescription>One origin per line. Use <code>*</code> for any (cannot combine with Allow-Credentials).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="cors.allowedMethods" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allowed methods</FormLabel>
                    <FormControl><Textarea rows={2} placeholder="GET&#10;POST&#10;PUT&#10;DELETE" {...field} value={field.value ?? ''} /></FormControl>
                    <FormDescription>One method per line. Leave empty for REST defaults.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="cors.allowedHeaders" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allowed headers</FormLabel>
                    <FormControl><Textarea rows={2} placeholder="Content-Type&#10;Authorization" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="cors.exposedHeaders" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exposed headers</FormLabel>
                    <FormControl><Textarea rows={2} placeholder="" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField control={form.control} name="cors.allowCredentials" render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0">
                      <FormControl><Switch checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel>Allow credentials</FormLabel>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="cors.maxAge" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preflight cache (s)</FormLabel>
                      <FormControl><Input type="number" min={0} placeholder="default" {...field} value={field.value ?? ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <SaveRow isDirty={form.formState.isDirty} isPending={update.isPending} onDiscard={() => form.reset()} />
      </form>
    </Form>
  );
}

// ─── Ingestor section ──────────────────────────────────────────────────────────

function IngestorSection({ cfg }: { cfg: GlobalConfig['ingestor'] }) {
  const update = useUpdateGlobalConfig();
  const form = useForm<IngestorValues>({
    resolver: zodResolver(ingestorSchema),
    defaultValues: {
      rtmpenabled: cfg?.rtmpenabled ?? false,
      rtmpaddr: cfg?.rtmpaddr ?? '',
      srtenabled: cfg?.srtenabled ?? false,
      srtaddr: cfg?.srtaddr ?? '',
      hlsmaxSegmentBuffer: cfg?.hlsmaxSegmentBuffer,
    },
  });

  useEffect(() => {
    form.reset({
      rtmpenabled: cfg?.rtmpenabled ?? false,
      rtmpaddr: cfg?.rtmpaddr ?? '',
      srtenabled: cfg?.srtenabled ?? false,
      srtaddr: cfg?.srtaddr ?? '',
      hlsmaxSegmentBuffer: cfg?.hlsmaxSegmentBuffer,
    });
  }, [cfg, form]);

  function onSubmit(values: IngestorValues) {
    update.mutate({ ingestor: { ...values, rtmpaddr: values.rtmpaddr || undefined, srtaddr: values.srtaddr || undefined } }, {
      onSuccess: () => { toast.success('Ingestor settings saved'); form.reset(values); },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
    });
  }

  const rtmpEnabled = form.watch('rtmpenabled');
  const srtEnabled = form.watch('srtenabled');

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">RTMP Ingestor</CardTitle>
            <CardDescription>Accept RTMP push streams from external encoders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="rtmpenabled" render={({ field }) => (
              <FormItem className="flex items-center gap-3 space-y-0">
                <FormControl><Switch checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel>Enable RTMP push server</FormLabel>
              </FormItem>
            )} />
            {rtmpEnabled && (
              <FormField control={form.control} name="rtmpaddr" render={({ field }) => (
                <FormItem>
                  <FormLabel>Listen address</FormLabel>
                  <FormControl><Input placeholder=":1935" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">SRT Ingestor</CardTitle>
            <CardDescription>Accept SRT push streams from external encoders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="srtenabled" render={({ field }) => (
              <FormItem className="flex items-center gap-3 space-y-0">
                <FormControl><Switch checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel>Enable SRT push server</FormLabel>
              </FormItem>
            )} />
            {srtEnabled && (
              <FormField control={form.control} name="srtaddr" render={({ field }) => (
                <FormItem>
                  <FormLabel>Listen address</FormLabel>
                  <FormControl><Input placeholder=":9999" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">HLS Pull</CardTitle>
            <CardDescription>Settings for pulling HLS streams as inputs.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField control={form.control} name="hlsmaxSegmentBuffer" render={({ field }) => (
              <FormItem>
                <FormLabel>Max segment buffer</FormLabel>
                <FormControl><Input type="number" min={0} placeholder="default" {...field} value={field.value ?? ''} /></FormControl>
                <FormDescription>Maximum number of pre-fetched HLS segments held in memory.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <SaveRow isDirty={form.formState.isDirty} isPending={update.isPending} onDiscard={() => form.reset()} />
      </form>
    </Form>
  );
}

// ─── HLS Publisher section ─────────────────────────────────────────────────────

function HlsSection({ cfg }: { cfg: GlobalConfig['publisher'] extends infer P ? (P extends object ? (P extends { hls?: infer H } ? H : never) : never) : never }) {
  const update = useUpdateGlobalConfig();
  const form = useForm<HlsValues>({
    resolver: zodResolver(hlsSchema),
    defaultValues: {
      dir: cfg?.dir ?? '',
      baseURL: cfg?.baseURL ?? '',
      liveSegmentSec: cfg?.liveSegmentSec,
      liveWindow: cfg?.liveWindow,
      liveHistory: cfg?.liveHistory,
      liveEphemeral: cfg?.liveEphemeral ?? false,
    },
  });

  useEffect(() => {
    form.reset({
      dir: cfg?.dir ?? '',
      baseURL: cfg?.baseURL ?? '',
      liveSegmentSec: cfg?.liveSegmentSec,
      liveWindow: cfg?.liveWindow,
      liveHistory: cfg?.liveHistory,
      liveEphemeral: cfg?.liveEphemeral ?? false,
    });
  }, [cfg, form]);

  function onSubmit(values: HlsValues) {
    update.mutate({ publisher: { hls: { ...values, dir: values.dir || undefined, baseURL: values.baseURL || undefined } } }, {
      onSuccess: () => { toast.success('HLS settings saved'); form.reset(values); },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">HLS Output</CardTitle>
            <CardDescription>Apple HLS packaging settings for live stream delivery.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="dir" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Output directory</FormLabel>
                  <FormControl><Input placeholder="/var/hls" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="baseURL" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Base URL (CDN)</FormLabel>
                  <FormControl><Input placeholder="https://cdn.example.com" {...field} /></FormControl>
                  <FormDescription>Override URLs in manifests with a CDN endpoint.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="liveSegmentSec" render={({ field }) => (
                <FormItem>
                  <FormLabel>Segment duration (s)</FormLabel>
                  <FormControl><Input type="number" min={1} placeholder="2" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="liveWindow" render={({ field }) => (
                <FormItem>
                  <FormLabel>Playlist window (segments)</FormLabel>
                  <FormControl><Input type="number" min={1} placeholder="5" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="liveHistory" render={({ field }) => (
                <FormItem>
                  <FormLabel>History (segments)</FormLabel>
                  <FormControl><Input type="number" min={0} placeholder="0" {...field} value={field.value ?? ''} /></FormControl>
                  <FormDescription>Extra segments kept after they leave the manifest.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="liveEphemeral" render={({ field }) => (
              <FormItem className="flex items-center gap-3 space-y-0">
                <FormControl><Switch checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl>
                <div>
                  <FormLabel>Ephemeral mode</FormLabel>
                  <FormDescription className="text-xs">Sliding manifest — delete old segments to save disk.</FormDescription>
                </div>
              </FormItem>
            )} />
          </CardContent>
        </Card>
        <SaveRow isDirty={form.formState.isDirty} isPending={update.isPending} onDiscard={() => form.reset()} />
      </form>
    </Form>
  );
}

// ─── DASH Publisher section ────────────────────────────────────────────────────

function DashSection({ cfg }: { cfg: GlobalConfig['publisher'] extends infer P ? (P extends object ? (P extends { dash?: infer D } ? D : never) : never) : never }) {
  const update = useUpdateGlobalConfig();
  const form = useForm<DashValues>({
    resolver: zodResolver(dashSchema),
    defaultValues: {
      dir: cfg?.dir ?? '',
      liveSegmentSec: cfg?.liveSegmentSec,
      liveWindow: cfg?.liveWindow,
      liveHistory: cfg?.liveHistory,
      liveEphemeral: cfg?.liveEphemeral ?? false,
    },
  });

  useEffect(() => {
    form.reset({
      dir: cfg?.dir ?? '',
      liveSegmentSec: cfg?.liveSegmentSec,
      liveWindow: cfg?.liveWindow,
      liveHistory: cfg?.liveHistory,
      liveEphemeral: cfg?.liveEphemeral ?? false,
    });
  }, [cfg, form]);

  function onSubmit(values: DashValues) {
    update.mutate({ publisher: { dash: { ...values, dir: values.dir || undefined } } }, {
      onSuccess: () => { toast.success('DASH settings saved'); form.reset(values); },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">DASH Output</CardTitle>
            <CardDescription>MPEG-DASH packaging settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="dir" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Output directory</FormLabel>
                  <FormControl><Input placeholder="/var/dash" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="liveSegmentSec" render={({ field }) => (
                <FormItem>
                  <FormLabel>Segment duration (s)</FormLabel>
                  <FormControl><Input type="number" min={1} placeholder="2" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="liveWindow" render={({ field }) => (
                <FormItem>
                  <FormLabel>Playlist window (segments)</FormLabel>
                  <FormControl><Input type="number" min={1} placeholder="5" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="liveHistory" render={({ field }) => (
                <FormItem>
                  <FormLabel>History (segments)</FormLabel>
                  <FormControl><Input type="number" min={0} placeholder="0" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="liveEphemeral" render={({ field }) => (
              <FormItem className="flex items-center gap-3 space-y-0">
                <FormControl><Switch checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl>
                <div>
                  <FormLabel>Ephemeral mode</FormLabel>
                  <FormDescription className="text-xs">Mirror HLS ephemeral semantics for the DASH muxer.</FormDescription>
                </div>
              </FormItem>
            )} />
          </CardContent>
        </Card>
        <SaveRow isDirty={form.formState.isDirty} isPending={update.isPending} onDiscard={() => form.reset()} />
      </form>
    </Form>
  );
}

// ─── RTMP Serve section ────────────────────────────────────────────────────────

function RtmpServeSection({ cfg }: { cfg: GlobalConfig['publisher'] extends infer P ? (P extends object ? (P extends { rtmp?: infer R } ? R : never) : never) : never }) {
  const update = useUpdateGlobalConfig();
  const form = useForm<RtmpServeValues>({
    resolver: zodResolver(rtmpServeSchema),
    defaultValues: { listenHost: cfg?.listenHost ?? '', port: cfg?.port },
  });

  useEffect(() => {
    form.reset({ listenHost: cfg?.listenHost ?? '', port: cfg?.port });
  }, [cfg, form]);

  function onSubmit(values: RtmpServeValues) {
    update.mutate({ publisher: { rtmp: { ...values, listenHost: values.listenHost || undefined } } }, {
      onSuccess: () => { toast.success('RTMP output settings saved'); form.reset(values); },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">RTMP Output Listener</CardTitle>
            <CardDescription>RTMP pull endpoint — clients connect here to receive the stream. Port 0 disables.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="listenHost" render={({ field }) => (
              <FormItem>
                <FormLabel>Bind host</FormLabel>
                <FormControl><Input placeholder="0.0.0.0" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="port" render={({ field }) => (
              <FormItem>
                <FormLabel>Port</FormLabel>
                <FormControl><Input type="number" min={0} max={65535} placeholder="1935" {...field} value={field.value ?? ''} /></FormControl>
                <FormDescription>0 = disabled.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>
        <SaveRow isDirty={form.formState.isDirty} isPending={update.isPending} onDiscard={() => form.reset()} />
      </form>
    </Form>
  );
}

// ─── RTSP section ──────────────────────────────────────────────────────────────

function RtspSection({ cfg }: { cfg: GlobalConfig['publisher'] extends infer P ? (P extends object ? (P extends { rtsp?: infer R } ? R : never) : never) : never }) {
  const update = useUpdateGlobalConfig();
  const form = useForm<RtspValues>({
    resolver: zodResolver(rtspSchema),
    defaultValues: { listenHost: cfg?.listenHost ?? '', portMin: cfg?.portMin, transport: cfg?.transport as 'tcp' | 'udp' | undefined },
  });

  useEffect(() => {
    form.reset({ listenHost: cfg?.listenHost ?? '', portMin: cfg?.portMin, transport: cfg?.transport as 'tcp' | 'udp' | undefined });
  }, [cfg, form]);

  function onSubmit(values: RtspValues) {
    update.mutate({ publisher: { rtsp: { ...values, listenHost: values.listenHost || undefined } } }, {
      onSuccess: () => { toast.success('RTSP settings saved'); form.reset(values); },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">RTSP Output</CardTitle>
            <CardDescription>RTSP pull listener for media players and broadcast tools.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <FormField control={form.control} name="listenHost" render={({ field }) => (
              <FormItem>
                <FormLabel>Bind host</FormLabel>
                <FormControl><Input placeholder="0.0.0.0" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="portMin" render={({ field }) => (
              <FormItem>
                <FormLabel>Port</FormLabel>
                <FormControl><Input type="number" min={0} max={65535} placeholder="8554" {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="transport" render={({ field }) => (
              <FormItem>
                <FormLabel>Transport</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="default (tcp)" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="tcp">TCP</SelectItem>
                    <SelectItem value="udp">UDP</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>
        <SaveRow isDirty={form.formState.isDirty} isPending={update.isPending} onDiscard={() => form.reset()} />
      </form>
    </Form>
  );
}

// ─── SRT Serve section ─────────────────────────────────────────────────────────

function SrtServeSection({ cfg }: { cfg: GlobalConfig['publisher'] extends infer P ? (P extends object ? (P extends { srt?: infer S } ? S : never) : never) : never }) {
  const update = useUpdateGlobalConfig();
  const form = useForm<SrtServeValues>({
    resolver: zodResolver(srtServeSchema),
    defaultValues: { listenHost: cfg?.listenHost ?? '', port: cfg?.port, latencyMS: cfg?.latencyMS },
  });

  useEffect(() => {
    form.reset({ listenHost: cfg?.listenHost ?? '', port: cfg?.port, latencyMS: cfg?.latencyMS });
  }, [cfg, form]);

  function onSubmit(values: SrtServeValues) {
    update.mutate({ publisher: { srt: { ...values, listenHost: values.listenHost || undefined } } }, {
      onSuccess: () => { toast.success('SRT output settings saved'); form.reset(values); },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">SRT Output Listener</CardTitle>
            <CardDescription>SRT pull listener for low-latency delivery. Port 0 disables.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <FormField control={form.control} name="listenHost" render={({ field }) => (
              <FormItem>
                <FormLabel>Bind host</FormLabel>
                <FormControl><Input placeholder="0.0.0.0" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="port" render={({ field }) => (
              <FormItem>
                <FormLabel>Port</FormLabel>
                <FormControl><Input type="number" min={0} max={65535} placeholder="9000" {...field} value={field.value ?? ''} /></FormControl>
                <FormDescription>0 = disabled.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="latencyMS" render={({ field }) => (
              <FormItem>
                <FormLabel>Latency (ms)</FormLabel>
                <FormControl><Input type="number" min={0} placeholder="120" {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>
        <SaveRow isDirty={form.formState.isDirty} isPending={update.isPending} onDiscard={() => form.reset()} />
      </form>
    </Form>
  );
}

// ─── Transcoder section ────────────────────────────────────────────────────────

function TranscoderSection({ cfg }: { cfg: GlobalConfig['transcoder'] }) {
  const update = useUpdateGlobalConfig();
  const form = useForm<TranscoderValues>({
    resolver: zodResolver(transcoderSchema),
    defaultValues: { ffmpegPath: cfg?.ffmpegPath ?? '', maxWorkers: cfg?.maxWorkers, maxRestarts: cfg?.maxRestarts },
  });

  useEffect(() => {
    form.reset({ ffmpegPath: cfg?.ffmpegPath ?? '', maxWorkers: cfg?.maxWorkers, maxRestarts: cfg?.maxRestarts });
  }, [cfg, form]);

  function onSubmit(values: TranscoderValues) {
    update.mutate({ transcoder: { ...values, ffmpegPath: values.ffmpegPath || undefined } }, {
      onSuccess: () => { toast.success('Transcoder settings saved'); form.reset(values); },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">FFmpeg Worker Pool</CardTitle>
            <CardDescription>Controls the number of concurrent FFmpeg transcoding processes and restart behaviour.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="ffmpegPath" render={({ field }) => (
              <FormItem>
                <FormLabel>FFmpeg path</FormLabel>
                <FormControl><Input placeholder="/usr/bin/ffmpeg" {...field} /></FormControl>
                <FormDescription>Absolute path to the FFmpeg binary. Leave empty to use <code>$PATH</code>.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="maxWorkers" render={({ field }) => (
                <FormItem>
                  <FormLabel>Max workers</FormLabel>
                  <FormControl><Input type="number" min={0} placeholder="default" {...field} value={field.value ?? ''} /></FormControl>
                  <FormDescription>Maximum concurrent FFmpeg processes. 0 = unlimited.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="maxRestarts" render={({ field }) => (
                <FormItem>
                  <FormLabel>Max restarts</FormLabel>
                  <FormControl><Input type="number" min={0} placeholder="default" {...field} value={field.value ?? ''} /></FormControl>
                  <FormDescription>Max consecutive crashes before marking failure. 0 = unlimited.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>
        <SaveRow isDirty={form.formState.isDirty} isPending={update.isPending} onDiscard={() => form.reset()} />
      </form>
    </Form>
  );
}

// ─── Manager section ───────────────────────────────────────────────────────────

function ManagerSection({ cfg }: { cfg: GlobalConfig['manager'] }) {
  const update = useUpdateGlobalConfig();
  const form = useForm<ManagerValues>({
    resolver: zodResolver(managerSchema),
    defaultValues: { inputPacketTimeoutSec: cfg?.inputPacketTimeoutSec },
  });

  useEffect(() => {
    form.reset({ inputPacketTimeoutSec: cfg?.inputPacketTimeoutSec });
  }, [cfg, form]);

  function onSubmit(values: ManagerValues) {
    update.mutate({ manager: values }, {
      onSuccess: () => { toast.success('Manager settings saved'); form.reset(values); },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Input Health Monitor</CardTitle>
            <CardDescription>Controls how quickly the manager detects a failing input and triggers a failover.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField control={form.control} name="inputPacketTimeoutSec" render={({ field }) => (
              <FormItem className="max-w-xs">
                <FormLabel>Packet timeout (s)</FormLabel>
                <FormControl><Input type="number" min={0} placeholder="default" {...field} value={field.value ?? ''} /></FormControl>
                <FormDescription>Maximum gap without a successful read before the active input is marked failed.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>
        <SaveRow isDirty={form.formState.isDirty} isPending={update.isPending} onDiscard={() => form.reset()} />
      </form>
    </Form>
  );
}

// ─── Hooks section ─────────────────────────────────────────────────────────────

function HooksSection({ cfg }: { cfg: GlobalConfig['hooks'] }) {
  const update = useUpdateGlobalConfig();
  const form = useForm<HooksValues>({
    resolver: zodResolver(hooksSchema),
    defaultValues: {
      workerCount: cfg?.workerCount,
      kafkaBrokers: toLines(cfg?.kafkaBrokers),
    },
  });

  useEffect(() => {
    form.reset({ workerCount: cfg?.workerCount, kafkaBrokers: toLines(cfg?.kafkaBrokers) });
  }, [cfg, form]);

  function onSubmit(values: HooksValues) {
    update.mutate({
      hooks: {
        workerCount: values.workerCount,
        kafkaBrokers: fromLines(values.kafkaBrokers),
      },
    }, {
      onSuccess: () => { toast.success('Hooks settings saved'); form.reset(values); },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Webhook Delivery</CardTitle>
            <CardDescription>Controls how event webhooks are dispatched.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="workerCount" render={({ field }) => (
              <FormItem className="max-w-xs">
                <FormLabel>Worker count</FormLabel>
                <FormControl><Input type="number" min={1} placeholder="default" {...field} value={field.value ?? ''} /></FormControl>
                <FormDescription>Number of concurrent hook delivery goroutines.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="kafkaBrokers" render={({ field }) => (
              <FormItem>
                <FormLabel>Kafka brokers</FormLabel>
                <FormControl><Textarea rows={3} placeholder="localhost:9092&#10;broker2:9092" {...field} value={field.value ?? ''} /></FormControl>
                <FormDescription>One broker per line. Leave empty to disable Kafka hook delivery.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>
        <SaveRow isDirty={form.formState.isDirty} isPending={update.isPending} onDiscard={() => form.reset()} />
      </form>
    </Form>
  );
}

// ─── Buffer section ────────────────────────────────────────────────────────────

function BufferSection({ cfg }: { cfg: GlobalConfig['buffer'] }) {
  const update = useUpdateGlobalConfig();
  const form = useForm<BufferValues>({
    resolver: zodResolver(bufferSchema),
    defaultValues: { capacity: cfg?.capacity },
  });

  useEffect(() => {
    form.reset({ capacity: cfg?.capacity });
  }, [cfg, form]);

  function onSubmit(values: BufferValues) {
    update.mutate({ buffer: values }, {
      onSuccess: () => { toast.success('Buffer settings saved'); form.reset(values); },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">MPEG-TS Buffer</CardTitle>
            <CardDescription>Per-stream ring buffer for MPEG-TS packets.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField control={form.control} name="capacity" render={({ field }) => (
              <FormItem className="max-w-xs">
                <FormLabel>Capacity (packets)</FormLabel>
                <FormControl><Input type="number" min={0} placeholder="default" {...field} value={field.value ?? ''} /></FormControl>
                <FormDescription>Number of MPEG-TS packets per stream buffer.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>
        <SaveRow isDirty={form.formState.isDirty} isPending={update.isPending} onDiscard={() => form.reset()} />
      </form>
    </Form>
  );
}

// ─── Metrics section ───────────────────────────────────────────────────────────

function MetricsSection({ cfg }: { cfg: GlobalConfig['metrics'] }) {
  const update = useUpdateGlobalConfig();
  const form = useForm<MetricsValues>({
    resolver: zodResolver(metricsSchema),
    defaultValues: { addr: cfg?.addr ?? '', path: cfg?.path ?? '' },
  });

  useEffect(() => {
    form.reset({ addr: cfg?.addr ?? '', path: cfg?.path ?? '' });
  }, [cfg, form]);

  function onSubmit(values: MetricsValues) {
    update.mutate({ metrics: { addr: values.addr || undefined, path: values.path || undefined } }, {
      onSuccess: () => { toast.success('Metrics settings saved'); form.reset(values); },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prometheus Metrics</CardTitle>
            <CardDescription>Expose runtime metrics for scraping.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="addr" render={({ field }) => (
              <FormItem>
                <FormLabel>Listen address</FormLabel>
                <FormControl><Input placeholder=":9090" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="path" render={({ field }) => (
              <FormItem>
                <FormLabel>Metrics path</FormLabel>
                <FormControl><Input placeholder="/metrics" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>
        <SaveRow isDirty={form.formState.isDirty} isPending={update.isPending} onDiscard={() => form.reset()} />
      </form>
    </Form>
  );
}

// ─── Log section ───────────────────────────────────────────────────────────────

function LogSection({ cfg }: { cfg: GlobalConfig['log'] }) {
  const update = useUpdateGlobalConfig();
  const form = useForm<LogValues>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      level: (cfg?.level as LogValues['level']) ?? undefined,
      format: (cfg?.format as LogValues['format']) ?? undefined,
    },
  });

  useEffect(() => {
    form.reset({
      level: (cfg?.level as LogValues['level']) ?? undefined,
      format: (cfg?.format as LogValues['format']) ?? undefined,
    });
  }, [cfg, form]);

  function onSubmit(values: LogValues) {
    update.mutate({ log: values }, {
      onSuccess: () => { toast.success('Logging settings saved'); form.reset(values); },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logging</CardTitle>
            <CardDescription>Server log level and output format.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="level" render={({ field }) => (
              <FormItem>
                <FormLabel>Log level</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="debug">debug</SelectItem>
                    <SelectItem value="info">info</SelectItem>
                    <SelectItem value="warn">warn</SelectItem>
                    <SelectItem value="error">error</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="format" render={({ field }) => (
              <FormItem>
                <FormLabel>Output format</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="text">text</SelectItem>
                    <SelectItem value="json">json</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>
        <SaveRow isDirty={form.formState.isDirty} isPending={update.isPending} onDiscard={() => form.reset()} />
      </form>
    </Form>
  );
}
