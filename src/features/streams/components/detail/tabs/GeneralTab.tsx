import { useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { Stream } from '@/api/types';
import { useSaveStream } from '@/features/streams/hooks/useStreams';
import { generalSchema, type GeneralFormValues } from '@/features/streams/schemas';

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
  };
}

export function GeneralTab({ stream }: GeneralTabProps) {
  const update = useSaveStream();

  const form = useForm<GeneralFormValues>({
    resolver: zodResolver(generalSchema),
    defaultValues: toFormValues(stream),
  });

  // Sync form when fresh data arrives from polling (only if user hasn't made changes)
  useEffect(() => {
    if (!form.formState.isDirty) {
      form.reset(toFormValues(stream));
    }
  }, [stream, form]);

  function onSubmit(values: GeneralFormValues) {
    const original = toFormValues(stream);

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

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
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
