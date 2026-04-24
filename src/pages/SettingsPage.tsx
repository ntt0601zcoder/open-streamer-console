import { zodResolver } from '@hookform/resolvers/zod';
import { Code2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
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

// ─── Zod schemas (snake_case to match Go JSON tags) ───────────────────────────

const serverSchema = z.object({
  http_addr: z.string().optional(),
  cors: z
    .object({
      enabled: z.boolean().optional(),
      allowed_origins: z.string().optional(), // newline-separated in UI
      allowed_methods: z.string().optional(),
      allowed_headers: z.string().optional(),
      exposed_headers: z.string().optional(),
      allow_credentials: z.boolean().optional(),
      max_age: z.coerce.number().int().min(0).optional(),
    })
    .optional(),
});
type ServerValues = z.infer<typeof serverSchema>;

const ingestorSchema = z.object({
  hls_max_segment_buffer: z.coerce.number().int().min(0).optional(),
});
type IngestorValues = z.infer<typeof ingestorSchema>;

const listenerPort = z.coerce.number().int().min(0).max(65535).optional();
const listenersSchema = z
  .object({
    rtmp: z
      .object({
        enabled: z.boolean().optional(),
        listen_host: z.string().optional(),
        port: listenerPort,
      })
      .optional(),
    rtsp: z
      .object({
        enabled: z.boolean().optional(),
        listen_host: z.string().optional(),
        port: listenerPort,
        transport: z.enum(['tcp', 'udp']).optional(),
      })
      .optional(),
    srt: z
      .object({
        enabled: z.boolean().optional(),
        listen_host: z.string().optional(),
        port: listenerPort,
        latency_ms: z.coerce.number().int().min(0).optional(),
      })
      .optional(),
  })
  .superRefine((val, ctx) => {
    (['rtmp', 'rtsp', 'srt'] as const).forEach((key) => {
      const l = val[key];
      if (l?.enabled && (!l.port || l.port <= 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key, 'port'],
          message: 'Port is required when this listener is enabled.',
        });
      }
    });
  });
type ListenersValues = z.infer<typeof listenersSchema>;

const hlsSchema = z.object({
  dir: z.string().optional(),
  live_segment_sec: z.coerce.number().int().min(1).optional(),
  live_window: z.coerce.number().int().min(1).optional(),
  live_history: z.coerce.number().int().min(0).optional(),
  live_ephemeral: z.boolean().optional(),
});
type HlsValues = z.infer<typeof hlsSchema>;

const dashSchema = z.object({
  dir: z.string().optional(),
  live_segment_sec: z.coerce.number().int().min(1).optional(),
  live_window: z.coerce.number().int().min(1).optional(),
  live_history: z.coerce.number().int().min(0).optional(),
  live_ephemeral: z.boolean().optional(),
});
type DashValues = z.infer<typeof dashSchema>;

const transcoderSchema = z.object({
  ffmpeg_path: z.string().optional(),
  max_workers: z.coerce.number().int().min(0).optional(),
});
type TranscoderValues = z.infer<typeof transcoderSchema>;

const managerSchema = z.object({
  input_packet_timeout_sec: z.coerce.number().int().min(0).optional(),
});
type ManagerValues = z.infer<typeof managerSchema>;

const hooksSchema = z.object({
  worker_count: z.coerce.number().int().min(1).optional(),
  kafka_brokers: z.string().optional(), // newline-separated in UI
});
type HooksValues = z.infer<typeof hooksSchema>;

const bufferSchema = z.object({
  capacity: z.coerce.number().int().min(0).optional(),
});
type BufferValues = z.infer<typeof bufferSchema>;

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
  return s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Server Configuration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage global server settings. Changes are applied immediately without restart.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link to="/settings/editor">
            <Code2 className="h-3.5 w-3.5" />
            YAML editor
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="server">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="server">Server</TabsTrigger>
          <TabsTrigger value="listeners">Listeners</TabsTrigger>
          <TabsTrigger value="ingestor">Ingestor</TabsTrigger>
          <TabsTrigger value="publisher-hls">HLS</TabsTrigger>
          <TabsTrigger value="publisher-dash">DASH</TabsTrigger>
          <TabsTrigger value="transcoder">Transcoder</TabsTrigger>
          <TabsTrigger value="manager">Manager</TabsTrigger>
          <TabsTrigger value="hooks">Hooks</TabsTrigger>
          <TabsTrigger value="buffer">Buffer</TabsTrigger>
          <TabsTrigger value="log">Logging</TabsTrigger>
        </TabsList>

        <TabsContent value="server" className="mt-6">
          <ServerSection />
        </TabsContent>
        <TabsContent value="listeners" className="mt-6">
          <ListenersSection />
        </TabsContent>
        <TabsContent value="ingestor" className="mt-6">
          <IngestorSection />
        </TabsContent>
        <TabsContent value="publisher-hls" className="mt-6">
          <HlsSection />
        </TabsContent>
        <TabsContent value="publisher-dash" className="mt-6">
          <DashSection />
        </TabsContent>
        <TabsContent value="transcoder" className="mt-6">
          <TranscoderSection />
        </TabsContent>
        <TabsContent value="manager" className="mt-6">
          <ManagerSection />
        </TabsContent>
        <TabsContent value="hooks" className="mt-6">
          <HooksSection />
        </TabsContent>
        <TabsContent value="buffer" className="mt-6">
          <BufferSection />
        </TabsContent>
        <TabsContent value="log" className="mt-6">
          <LogSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Shared save button row ────────────────────────────────────────────────────

function SaveRow({
  isDirty,
  isPending,
  onDiscard,
}: {
  isDirty: boolean;
  isPending: boolean;
  onDiscard: () => void;
}) {
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

function ServerSection() {
  const { data: serverConfig } = useServerConfig();
  const cfg = serverConfig?.global_config?.server;
  const update = useUpdateGlobalConfig();
  const form = useForm<ServerValues>({
    resolver: zodResolver(serverSchema),
    values: {
      http_addr: cfg?.http_addr ?? '',
      cors: {
        enabled: cfg?.cors?.enabled ?? false,
        allowed_origins: toLines(cfg?.cors?.allowed_origins),
        allowed_methods: toLines(cfg?.cors?.allowed_methods),
        allowed_headers: toLines(cfg?.cors?.allowed_headers),
        exposed_headers: toLines(cfg?.cors?.exposed_headers),
        allow_credentials: cfg?.cors?.allow_credentials ?? false,
        max_age: cfg?.cors?.max_age,
      },
    },
  });

  function onSubmit(values: ServerValues) {
    const patch: GlobalConfig = {
      server: {
        http_addr: values.http_addr || undefined,
        cors: {
          enabled: values.cors?.enabled,
          allowed_origins: fromLines(values.cors?.allowed_origins),
          allowed_methods: fromLines(values.cors?.allowed_methods),
          allowed_headers: fromLines(values.cors?.allowed_headers),
          exposed_headers: fromLines(values.cors?.exposed_headers),
          allow_credentials: values.cors?.allow_credentials,
          max_age: values.cors?.max_age,
        },
      },
    };
    update.mutate(patch, {
      onSuccess: () => {
        toast.success('Server settings saved');
        form.reset(values);
      },
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
            <FormField
              control={form.control}
              name="http_addr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bind address</FormLabel>
                  <FormControl>
                    <Input placeholder=":8080" {...field} />
                  </FormControl>
                  <FormDescription>
                    Host:port to listen on, e.g. <code>:8080</code> or <code>0.0.0.0:8080</code>.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">CORS</CardTitle>
            <CardDescription>Cross-origin request handling for the HTTP API.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="cors.enabled"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel>Enable CORS</FormLabel>
                </FormItem>
              )}
            />

            {corsEnabled && (
              <>
                <FormField
                  control={form.control}
                  name="cors.allowed_origins"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allowed origins</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="https://example.com&#10;*"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription>
                        One origin per line. Use <code>*</code> for any (cannot combine with
                        Allow-Credentials).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cors.allowed_methods"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allowed methods</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          placeholder="GET&#10;POST&#10;PUT&#10;DELETE"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription>
                        One method per line. Leave empty for REST defaults.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cors.allowed_headers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allowed headers</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          placeholder="Content-Type&#10;Authorization"
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
                  name="cors.exposed_headers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exposed headers</FormLabel>
                      <FormControl>
                        <Textarea rows={2} placeholder="" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="cors.allow_credentials"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3 space-y-0">
                        <FormControl>
                          <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel>Allow credentials</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cors.max_age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preflight cache (s)</FormLabel>
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
              </>
            )}
          </CardContent>
        </Card>

        <SaveRow
          isDirty={form.formState.isDirty}
          isPending={update.isPending}
          onDiscard={() => form.reset()}
        />
      </form>
    </Form>
  );
}

// ─── Ingestor section ──────────────────────────────────────────────────────────

function IngestorSection() {
  const { data: serverConfig } = useServerConfig();
  const cfg = serverConfig?.global_config?.ingestor;
  const update = useUpdateGlobalConfig();
  const form = useForm<IngestorValues>({
    resolver: zodResolver(ingestorSchema),
    values: { hls_max_segment_buffer: cfg?.hls_max_segment_buffer },
  });

  function onSubmit(values: IngestorValues) {
    update.mutate(
      { ingestor: values },
      {
        onSuccess: () => {
          toast.success('Ingestor settings saved');
          form.reset(values);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
      },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">HLS Pull</CardTitle>
            <CardDescription>
              Settings for pulling HLS streams as inputs. RTMP and SRT push ingest are configured in
              the <strong>Listeners</strong> tab (shared with pull endpoints).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="hls_max_segment_buffer"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Max segment buffer</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="default"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum number of pre-fetched HLS segments held in memory.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <SaveRow
          isDirty={form.formState.isDirty}
          isPending={update.isPending}
          onDiscard={() => form.reset()}
        />
      </form>
    </Form>
  );
}

// ─── Listeners section ─────────────────────────────────────────────────────────

function ListenersSection() {
  const { data: serverConfig } = useServerConfig();
  const cfg = serverConfig?.global_config?.listeners;
  const update = useUpdateGlobalConfig();
  const form = useForm<ListenersValues>({
    resolver: zodResolver(listenersSchema),
    values: {
      rtmp: {
        enabled: cfg?.rtmp?.enabled ?? false,
        listen_host: cfg?.rtmp?.listen_host ?? '',
        port: cfg?.rtmp?.port,
      },
      rtsp: {
        enabled: cfg?.rtsp?.enabled ?? false,
        listen_host: cfg?.rtsp?.listen_host ?? '',
        port: cfg?.rtsp?.port,
        transport: (cfg?.rtsp?.transport as 'tcp' | 'udp' | undefined) ?? undefined,
      },
      srt: {
        enabled: cfg?.srt?.enabled ?? false,
        listen_host: cfg?.srt?.listen_host ?? '',
        port: cfg?.srt?.port,
        latency_ms: cfg?.srt?.latency_ms,
      },
    },
  });

  function onSubmit(values: ListenersValues) {
    update.mutate(
      {
        listeners: {
          rtmp: { ...values.rtmp, listen_host: values.rtmp?.listen_host || undefined },
          rtsp: { ...values.rtsp, listen_host: values.rtsp?.listen_host || undefined },
          srt: { ...values.srt, listen_host: values.srt?.listen_host || undefined },
        },
      },
      {
        onSuccess: () => {
          toast.success('Listeners saved');
          form.reset(values);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
      },
    );
  }

  const rtmpEnabled = form.watch('rtmp.enabled');
  const rtspEnabled = form.watch('rtsp.enabled');
  const srtEnabled = form.watch('srt.enabled');

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">RTMP Listener</CardTitle>
            <CardDescription>
              Shared port for RTMP push (ingest) and pull (play). Required when any stream uses
              RTMP.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="rtmp.enabled"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel>Enable RTMP listener</FormLabel>
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="rtmp.listen_host"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bind host</FormLabel>
                    <FormControl>
                      <Input placeholder="0.0.0.0" {...field} disabled={!rtmpEnabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rtmp.port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Port</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={65535}
                        placeholder="1935"
                        {...field}
                        value={field.value ?? ''}
                        disabled={!rtmpEnabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">RTSP Listener</CardTitle>
            <CardDescription>Shared port for RTSP push (ingest) and pull (play).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="rtsp.enabled"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel>Enable RTSP listener</FormLabel>
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="rtsp.listen_host"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bind host</FormLabel>
                    <FormControl>
                      <Input placeholder="0.0.0.0" {...field} disabled={!rtspEnabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rtsp.port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Port</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={65535}
                        placeholder="554"
                        {...field}
                        value={field.value ?? ''}
                        disabled={!rtspEnabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rtsp.transport"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transport</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ''}
                      disabled={!rtspEnabled}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="default (tcp)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="tcp">TCP</SelectItem>
                        <SelectItem value="udp">UDP</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">SRT Listener</CardTitle>
            <CardDescription>
              Shared port for SRT push (ingest) and pull (play). Stream is selected via{' '}
              <code>streamid</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="srt.enabled"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel>Enable SRT listener</FormLabel>
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="srt.listen_host"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bind host</FormLabel>
                    <FormControl>
                      <Input placeholder="0.0.0.0" {...field} disabled={!srtEnabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="srt.port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Port</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={65535}
                        placeholder="9999"
                        {...field}
                        value={field.value ?? ''}
                        disabled={!srtEnabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="srt.latency_ms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latency (ms)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="120"
                        {...field}
                        value={field.value ?? ''}
                        disabled={!srtEnabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <SaveRow
          isDirty={form.formState.isDirty}
          isPending={update.isPending}
          onDiscard={() => form.reset()}
        />
      </form>
    </Form>
  );
}

// ─── HLS Publisher section ─────────────────────────────────────────────────────

function HlsSection() {
  const { data: serverConfig } = useServerConfig();
  const cfg = serverConfig?.global_config?.publisher?.hls;
  const update = useUpdateGlobalConfig();
  const form = useForm<HlsValues>({
    resolver: zodResolver(hlsSchema),
    values: {
      dir: cfg?.dir ?? '',
      live_segment_sec: cfg?.live_segment_sec,
      live_window: cfg?.live_window,
      live_history: cfg?.live_history,
      live_ephemeral: cfg?.live_ephemeral ?? false,
    },
  });

  function onSubmit(values: HlsValues) {
    update.mutate(
      {
        publisher: {
          hls: { ...values, dir: values.dir || undefined },
        },
      },
      {
        onSuccess: () => {
          toast.success('HLS settings saved');
          form.reset(values);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
      },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">HLS Output</CardTitle>
            <CardDescription>
              Apple HLS packaging settings for live stream delivery.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="dir"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Output directory</FormLabel>
                    <FormControl>
                      <Input placeholder="/var/hls" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="live_segment_sec"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segment duration (s)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="2"
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
                name="live_window"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Playlist window (segments)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="5"
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
                name="live_history"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>History (segments)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Extra segments kept after they leave the manifest.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="live_ephemeral"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div>
                    <FormLabel>Ephemeral mode</FormLabel>
                    <FormDescription className="text-xs">
                      Sliding manifest — delete old segments to save disk.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        <SaveRow
          isDirty={form.formState.isDirty}
          isPending={update.isPending}
          onDiscard={() => form.reset()}
        />
      </form>
    </Form>
  );
}

// ─── DASH Publisher section ────────────────────────────────────────────────────

function DashSection() {
  const { data: serverConfig } = useServerConfig();
  const cfg = serverConfig?.global_config?.publisher?.dash;
  const update = useUpdateGlobalConfig();
  const form = useForm<DashValues>({
    resolver: zodResolver(dashSchema),
    values: {
      dir: cfg?.dir ?? '',
      live_segment_sec: cfg?.live_segment_sec,
      live_window: cfg?.live_window,
      live_history: cfg?.live_history,
      live_ephemeral: cfg?.live_ephemeral ?? false,
    },
  });

  function onSubmit(values: DashValues) {
    update.mutate(
      { publisher: { dash: { ...values, dir: values.dir || undefined } } },
      {
        onSuccess: () => {
          toast.success('DASH settings saved');
          form.reset(values);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
      },
    );
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
              <FormField
                control={form.control}
                name="dir"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Output directory</FormLabel>
                    <FormControl>
                      <Input placeholder="/var/dash" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="live_segment_sec"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segment duration (s)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="2"
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
                name="live_window"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Playlist window (segments)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="5"
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
                name="live_history"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>History (segments)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="live_ephemeral"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div>
                    <FormLabel>Ephemeral mode</FormLabel>
                    <FormDescription className="text-xs">
                      Mirror HLS ephemeral semantics for the DASH muxer.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        <SaveRow
          isDirty={form.formState.isDirty}
          isPending={update.isPending}
          onDiscard={() => form.reset()}
        />
      </form>
    </Form>
  );
}

// ─── Transcoder section ────────────────────────────────────────────────────────

function TranscoderSection() {
  const { data: serverConfig } = useServerConfig();
  const cfg = serverConfig?.global_config?.transcoder;
  const update = useUpdateGlobalConfig();
  const form = useForm<TranscoderValues>({
    resolver: zodResolver(transcoderSchema),
    values: {
      ffmpeg_path: cfg?.ffmpeg_path ?? '',
      max_workers: cfg?.max_workers,
    },
  });

  function onSubmit(values: TranscoderValues) {
    update.mutate(
      { transcoder: { ...values, ffmpeg_path: values.ffmpeg_path || undefined } },
      {
        onSuccess: () => {
          toast.success('Transcoder settings saved');
          form.reset(values);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
      },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">FFmpeg Worker Pool</CardTitle>
            <CardDescription>
              Controls the number of concurrent FFmpeg transcoding processes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="ffmpeg_path"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>FFmpeg path</FormLabel>
                  <FormControl>
                    <Input placeholder="/usr/bin/ffmpeg" {...field} />
                  </FormControl>
                  <FormDescription>
                    Absolute path to the FFmpeg binary. Leave empty to use <code>$PATH</code>.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="max_workers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max workers</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="default"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum concurrent FFmpeg processes. 0 = unlimited.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        <SaveRow
          isDirty={form.formState.isDirty}
          isPending={update.isPending}
          onDiscard={() => form.reset()}
        />
      </form>
    </Form>
  );
}

// ─── Manager section ───────────────────────────────────────────────────────────

function ManagerSection() {
  const { data: serverConfig } = useServerConfig();
  const cfg = serverConfig?.global_config?.manager;
  const update = useUpdateGlobalConfig();
  const form = useForm<ManagerValues>({
    resolver: zodResolver(managerSchema),
    values: { input_packet_timeout_sec: cfg?.input_packet_timeout_sec },
  });

  function onSubmit(values: ManagerValues) {
    update.mutate(
      { manager: values },
      {
        onSuccess: () => {
          toast.success('Manager settings saved');
          form.reset(values);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
      },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Input Health Monitor</CardTitle>
            <CardDescription>
              Controls how quickly the manager detects a failing input and triggers a failover.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="input_packet_timeout_sec"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Packet timeout (s)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="default"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum gap without a successful read before the active input is marked failed.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        <SaveRow
          isDirty={form.formState.isDirty}
          isPending={update.isPending}
          onDiscard={() => form.reset()}
        />
      </form>
    </Form>
  );
}

// ─── Hooks section ─────────────────────────────────────────────────────────────

function HooksSection() {
  const { data: serverConfig } = useServerConfig();
  const cfg = serverConfig?.global_config?.hooks;
  const update = useUpdateGlobalConfig();
  const form = useForm<HooksValues>({
    resolver: zodResolver(hooksSchema),
    values: { worker_count: cfg?.worker_count, kafka_brokers: toLines(cfg?.kafka_brokers) },
  });

  function onSubmit(values: HooksValues) {
    update.mutate(
      {
        hooks: {
          worker_count: values.worker_count,
          kafka_brokers: fromLines(values.kafka_brokers),
        },
      },
      {
        onSuccess: () => {
          toast.success('Hooks settings saved');
          form.reset(values);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
      },
    );
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
            <FormField
              control={form.control}
              name="worker_count"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Worker count</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="default"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>Number of concurrent hook delivery goroutines.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="kafka_brokers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kafka brokers</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="localhost:9092&#10;broker2:9092"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>
                    One broker per line. Leave empty to disable Kafka hook delivery.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        <SaveRow
          isDirty={form.formState.isDirty}
          isPending={update.isPending}
          onDiscard={() => form.reset()}
        />
      </form>
    </Form>
  );
}

// ─── Buffer section ────────────────────────────────────────────────────────────

function BufferSection() {
  const { data: serverConfig } = useServerConfig();
  const cfg = serverConfig?.global_config?.buffer;
  const update = useUpdateGlobalConfig();
  const form = useForm<BufferValues>({
    resolver: zodResolver(bufferSchema),
    values: { capacity: cfg?.capacity },
  });

  function onSubmit(values: BufferValues) {
    update.mutate(
      { buffer: values },
      {
        onSuccess: () => {
          toast.success('Buffer settings saved');
          form.reset(values);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
      },
    );
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
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Capacity (packets)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="default"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>Number of MPEG-TS packets per stream buffer.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        <SaveRow
          isDirty={form.formState.isDirty}
          isPending={update.isPending}
          onDiscard={() => form.reset()}
        />
      </form>
    </Form>
  );
}

// ─── Log section ───────────────────────────────────────────────────────────────

function LogSection() {
  const { data: serverConfig } = useServerConfig();
  const cfg = serverConfig?.global_config?.log;
  const update = useUpdateGlobalConfig();
  const form = useForm<LogValues>({
    resolver: zodResolver(logSchema),
    values: {
      level: (cfg?.level as LogValues['level']) ?? undefined,
      format: (cfg?.format as LogValues['format']) ?? undefined,
    },
  });

  function onSubmit(values: LogValues) {
    update.mutate(
      { log: values },
      {
        onSuccess: () => {
          toast.success('Logging settings saved');
          form.reset(values);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
      },
    );
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
            <FormField
              control={form.control}
              name="level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Log level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
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
              )}
            />
            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Output format</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="text">text</SelectItem>
                      <SelectItem value="json">json</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        <SaveRow
          isDirty={form.formState.isDirty}
          isPending={update.isPending}
          onDiscard={() => form.reset()}
        />
      </form>
    </Form>
  );
}
