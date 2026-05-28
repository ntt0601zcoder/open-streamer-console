import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronRight } from 'lucide-react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
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
import { DvrSection } from '@/features/streams/components/sections/DvrSection';
import { InputsSection } from '@/features/streams/components/sections/InputsSection';
import { OutputSection } from '@/features/streams/components/sections/OutputSection';
import { TranscoderSection } from '@/features/streams/components/sections/TranscoderSection';
import { streamKeys } from '@/features/streams/hooks/useStreams';
import { createStreamSchema, parsePids, type CreateStreamValues } from '@/features/streams/schemas';
import { useTemplates } from '@/features/templates/hooks/useTemplates';
import { listToRecord } from '@/lib/kvList';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const DEFAULT_VALUES: CreateStreamValues = {
  code: '',
  general: { name: '', description: '', stream_key: '', disabled: false, tags: '', template: '' },
  inputs: [{ url: '', priority: 0 }],
  protocols: { hls: true, dash: false, rtmp: false, rtsp: false, srt: false, mpegts: false },
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
        <span className="text-foreground">New</span>
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
              <InputsSection />
            </TabsContent>
            <TabsContent value="output" className="mt-6">
              <OutputSection />
            </TabsContent>
            <TabsContent value="transcoder" className="mt-6">
              <TranscoderSection />
            </TabsContent>
            <TabsContent value="dvr" className="mt-6">
              <DvrSection />
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
    template: v.general.template || undefined,
    inputs: v.inputs.map((inp, i) => ({
      ...inp,
      priority: i,
      headers: listToRecord(inp.headers),
      params: listToRecord(inp.params),
      pids: parsePids(inp.pids),
    })),
    protocols: v.protocols,
    push: v.push.length ? v.push : undefined,
    transcoder,
    dvr: v.dvr.enabled ? v.dvr : { enabled: false },
  };
}

// ─── General section ──────────────────────────────────────────────────────────

function GeneralSection({ form }: { form: UseFormReturn<CreateStreamValues> }) {
  const { data: templates } = useTemplates();
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
          name="general.template"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template</FormLabel>
              <Select
                onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                value={field.value ? field.value : '__none__'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {(templates ?? []).map((t) => (
                    <SelectItem key={t.code} value={t.code}>
                      {t.name ? `${t.name} (${t.code})` : t.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Inherit config-like fields from a{' '}
                <Link to="/templates" className="underline">
                  template
                </Link>
                . Fields you set below override the template.
              </FormDescription>
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
