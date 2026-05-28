import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import type { Stream } from '@/api/types';
import { useFormConfigSync } from '@/features/streams/hooks/useFormConfigSync';
import { useSaveStream } from '@/features/streams/hooks/useStreams';
import { useStreamTemplate } from '@/features/streams/hooks/useStreamTemplate';
import { InheritedSectionNotice } from '@/features/streams/components/detail/InheritedSectionNotice';
import {
  RuntimeReadOnlyBanner,
  isRuntimeStream,
} from '@/features/streams/components/detail/RuntimeReadOnlyBanner';
import { generalSchema, type GeneralFormValues } from '@/features/streams/schemas';
import { useTemplates } from '@/features/templates/hooks/useTemplates';
import { Link } from 'react-router-dom';

interface GeneralTabProps {
  stream: Stream;
}

function toFormValues(stream: Stream): GeneralFormValues {
  return {
    name: stream.name,
    description: stream.description ?? '',
    stream_key: stream.stream_key ?? '',
    disabled: stream.disabled ?? false,
    tags: stream.tags?.join(', ') ?? '',
    template: stream.template ?? '',
  };
}

export function GeneralTab({ stream }: GeneralTabProps) {
  const update = useSaveStream();
  const { data: templates } = useTemplates();
  const tplState = useStreamTemplate(stream);

  const initial = toFormValues(tplState.resolved);

  const form = useForm<GeneralFormValues>({
    resolver: zodResolver(generalSchema),
    defaultValues: initial,
  });

  useFormConfigSync(form, initial);

  function onSubmit(values: GeneralFormValues) {
    const original = initial;

    const patch: Partial<Record<string, unknown>> = {};
    if (values.name !== original.name) patch.name = values.name;
    if (values.description !== original.description)
      patch.description = values.description || undefined;
    if (values.stream_key !== original.stream_key)
      patch.stream_key = values.stream_key || undefined;
    if (values.disabled !== original.disabled) patch.disabled = values.disabled;
    if (values.tags !== original.tags) {
      patch.tags = values.tags
        ? values.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
    }
    // Empty template = inherit nothing; explicit '' clears a previously-set
    // reference. Server treats missing field as no-op so we send '' when the
    // user removes the template.
    if (values.template !== original.template) patch.template = values.template;

    if (Object.keys(patch).length === 0) {
      toast.info('No changes to save');
      return;
    }

    update.mutate(
      { code: stream.code, body: patch },
      {
        onSuccess: () => {
          toast.success('Stream updated');
          form.reset(values); // mark as clean
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Update failed');
        },
      },
    );
  }

  // Build a concise list of inherited general fields (e.g. "Name, Tags").
  const inheritedFields = (
    Object.entries(tplState.generalInherited) as [keyof typeof tplState.generalInherited, boolean][]
  )
    .filter(([, v]) => v)
    .map(([k]) => k);

  const readOnly = isRuntimeStream(stream.source);

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-10">
        {readOnly && <RuntimeReadOnlyBanner />}
        {stream.template && tplState.inherited.general && (
          <InheritedSectionNotice
            templateCode={stream.template}
            label={`General (${inheritedFields.join(', ')})`}
            isLoading={tplState.isLoading}
          />
        )}
        <fieldset disabled={readOnly} className="contents space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic info</CardTitle>
              <CardDescription>Stream identity and access settings</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
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

              {/* Stream key */}
              <FormField
                control={form.control}
                name="stream_key"
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

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
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

              {/* Tags */}
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input placeholder="news, hd, live — comma separated" {...field} />
                    </FormControl>
                    <FormDescription>Comma-separated tags for filtering</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Template */}
              <FormField
                control={form.control}
                name="template"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
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
                      . Fields you set explicitly on this stream override the template.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Disabled */}
              <FormField
                control={form.control}
                name="disabled"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0 sm:col-span-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel>Disabled</FormLabel>
                      <FormDescription>
                        Exclude this stream from server bootstrap and reject pipeline starts
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </fieldset>

        {!readOnly && (
          <div className="flex justify-end gap-2 border-t pt-4">
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
        )}
      </form>
    </Form>
  );
}
