import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronRight } from 'lucide-react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { templatesApi } from '@/api/templates';
import type {
  InterlaceMode,
  ResizeMode,
  Template,
  TemplateBody,
  TranscoderConfig,
  VideoCodec,
} from '@/api/types';
import { DvrSection } from '@/features/streams/components/sections/DvrSection';
import { InputsSection } from '@/features/streams/components/sections/InputsSection';
import { OutputSection } from '@/features/streams/components/sections/OutputSection';
import { PrefixesSection } from '@/features/streams/components/sections/PrefixesSection';
import { TranscoderSection } from '@/features/streams/components/sections/TranscoderSection';
import {
  parsePids,
  templateSchema,
  type TemplateFormValues,
} from '@/features/streams/schemas';
import {
  templateKeys,
  useTemplate,
} from '@/features/templates/hooks/useTemplates';
import { listToRecord, recordToList, type KeyValuePair } from '@/lib/kvList';

const EMPTY_VALUES: TemplateFormValues = {
  code: '',
  general: { name: '', description: '', stream_key: '', tags: '' },
  prefixes: [],
  inputs: [],
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

export function TemplateEditorPage() {
  const params = useParams<{ code?: string }>();
  const editingCode = params.code;
  const isEdit = !!editingCode;

  const navigate = useNavigate();
  const qc = useQueryClient();

  const existing = useTemplate(editingCode ?? '');

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: EMPTY_VALUES,
  });

  // Once the template loads (edit mode), hydrate the form.
  useEffect(() => {
    if (!isEdit || !existing.data) return;
    form.reset(templateToFormValues(existing.data));
  }, [isEdit, existing.data, form]);

  const save = useMutation({
    mutationFn: ({ code, body }: { code: string; body: TemplateBody }) =>
      templatesApi.save(code, body),
    onSuccess: (res, { code }) => {
      qc.setQueryData(templateKeys.detail(code), res.data);
      void qc.invalidateQueries({ queryKey: templateKeys.all });
    },
  });

  function onSubmit(values: TemplateFormValues) {
    const body = buildTemplateBody(values, existing.data ?? null);
    save.mutate(
      { code: values.code, body },
      {
        onSuccess: () => {
          toast.success(isEdit ? 'Template updated' : `Template "${values.code}" created`);
          navigate('/templates');
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/templates" className="hover:text-foreground transition-colors">
          Templates
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{isEdit ? editingCode : 'New'}</span>
      </nav>

      <div>
        <h1 className="text-2xl font-semibold">
          {isEdit ? `Edit template "${editingCode}"` : 'Create template'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Templates are reusable bundles of stream config. Streams that reference a template
          inherit any field they leave empty.
        </p>
      </div>

      {isEdit && existing.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading template…</p>
      ) : isEdit && existing.error ? (
        <p className="text-sm text-destructive">
          Failed to load template: {existing.error instanceof Error ? existing.error.message : ''}
        </p>
      ) : (
        <FormProvider {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
            <Tabs defaultValue="general">
              <TabsList>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="prefixes">Prefixes</TabsTrigger>
                <TabsTrigger value="input">Input</TabsTrigger>
                <TabsTrigger value="output">Output</TabsTrigger>
                <TabsTrigger value="transcoder">Transcoder</TabsTrigger>
                <TabsTrigger value="dvr">DVR</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="mt-6">
                <GeneralSection form={form} isEdit={isEdit} />
              </TabsContent>
              <TabsContent value="prefixes" className="mt-6">
                <PrefixesSection />
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
              <Button type="button" variant="outline" onClick={() => navigate('/templates')}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create template'}
              </Button>
            </div>
          </form>
        </FormProvider>
      )}
    </div>
  );
}

// ─── General section ──────────────────────────────────────────────────────────

function GeneralSection({
  form,
  isEdit,
}: {
  form: UseFormReturn<TemplateFormValues>;
  isEdit: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Basic info</CardTitle>
        <CardDescription>Template identity and shared defaults</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code</FormLabel>
              <FormControl>
                <Input
                  placeholder="hls-default"
                  className="font-mono"
                  disabled={isEdit}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Unique slug. Cannot be changed after creation.
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
                <Input placeholder="Default HLS profile" {...field} />
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
                <Input placeholder="Shared ingest auth key (optional)" {...field} />
              </FormControl>
              <FormDescription>
                Inherited by streams that don't define their own RTMP/SRT push key.
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
      </CardContent>
    </Card>
  );
}

// ─── Form ↔ API conversion ────────────────────────────────────────────────────

function templateToFormValues(t: Template): TemplateFormValues {
  // Default-merge against EMPTY_VALUES so any optional sub-object the server
  // omits (e.g. transcoder when nil) still resolves to a fully-shaped form.
  const transcoderDefaults = EMPTY_VALUES.transcoder;
  const tc = t.transcoder;
  return {
    code: t.code,
    general: {
      name: t.name ?? '',
      description: t.description ?? '',
      stream_key: t.stream_key ?? '',
      tags: (t.tags ?? []).join(', '),
    },
    prefixes: (t.prefixes ?? []).map((value) => ({ value })),
    inputs: (t.inputs ?? []).map((inp, i) => ({
      url: inp.url ?? '',
      priority: inp.priority ?? i,
      headers: recordToList(inp.headers) as KeyValuePair[],
      params: recordToList(inp.params) as KeyValuePair[],
      net: inp.net,
      program: inp.program,
      pids: inp.pids ? inp.pids.join(', ') : '',
    })),
    protocols: {
      hls: t.protocols?.hls ?? false,
      dash: t.protocols?.dash ?? false,
      rtmp: t.protocols?.rtmp ?? false,
      rtsp: t.protocols?.rtsp ?? false,
      srt: t.protocols?.srt ?? false,
      mpegts: t.protocols?.mpegts ?? false,
    },
    push: (t.push ?? []).map((p) => ({
      url: p.url ?? '',
      enabled: p.enabled ?? true,
      comment: p.comment ?? '',
      timeout_sec: p.timeout_sec,
      retry_timeout_sec: p.retry_timeout_sec,
      limit: p.limit,
    })),
    transcoder: tc
      ? {
          enabled: true,
          audio: {
            copy: tc.audio?.copy ?? transcoderDefaults.audio.copy,
            codec: tc.audio?.codec,
            bitrate: tc.audio?.bitrate,
            channels: tc.audio?.channels,
            sample_rate: tc.audio?.sample_rate,
            normalize: tc.audio?.normalize ?? false,
          },
          video: {
            copy: tc.video?.copy ?? transcoderDefaults.video.copy,
            interlace: tc.video?.interlace,
            profiles: (tc.video?.profiles ?? []).map((p) => ({
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
              bframes: p.bframes,
              refs: p.refs,
              sar: p.sar,
              resize_mode: p.resize_mode,
            })),
          },
          global: {
            hw: tc.global?.hw,
            deviceid: tc.global?.deviceid,
            fps: tc.global?.fps,
            gop: tc.global?.gop,
          },
        }
      : transcoderDefaults,
    dvr: t.dvr
      ? {
          enabled: t.dvr.enabled ?? false,
          retention_sec: t.dvr.retention_sec,
          segment_duration: t.dvr.segment_duration,
          max_size_gb: t.dvr.max_size_gb,
          storage_path: t.dvr.storage_path ?? '',
        }
      : EMPTY_VALUES.dvr,
  };
}

function buildTemplateBody(v: TemplateFormValues, existing: Template | null): TemplateBody {
  const tags = v.general.tags
    ? v.general.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const prefixes = v.prefixes.map((p) => p.value.trim()).filter(Boolean);

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
    // Preserve template-level sub-config we don't expose yet (watermark,
    // thumbnail) so editing through the UI doesn't drop them.
    watermark: existing?.watermark,
    thumbnail: existing?.thumbnail,
    name: v.general.name || undefined,
    description: v.general.description || undefined,
    stream_key: v.general.stream_key || undefined,
    tags: tags.length ? tags : undefined,
    prefixes: prefixes.length ? prefixes : undefined,
    inputs: v.inputs.length
      ? v.inputs.map((inp, i) => ({
          ...inp,
          priority: i,
          headers: listToRecord(inp.headers),
          params: listToRecord(inp.params),
          pids: parsePids(inp.pids),
        }))
      : undefined,
    protocols: v.protocols,
    push: v.push.length ? v.push : undefined,
    transcoder,
    dvr: v.dvr.enabled ? v.dvr : { enabled: false },
  };
}
