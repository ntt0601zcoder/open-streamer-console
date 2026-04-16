import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
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
import type { Stream } from '@/api/types';
import { useUpdateStream } from '@/features/streams/hooks/useStreams';
import { dvrFormSchema, type DvrFormValues } from '@/features/streams/schemas';

interface DvrTabProps {
  stream: Stream;
}

function toFormValues(stream: Stream): DvrFormValues {
  const dvr = stream.dvr;
  return {
    enabled: dvr?.enabled ?? false,
    retention_sec: dvr?.retention_sec,
    segment_duration: dvr?.segment_duration,
    max_size_gb: dvr?.max_size_gb,
    storage_path: dvr?.storage_path ?? '',
  };
}

export function DvrTab({ stream }: DvrTabProps) {
  const update = useUpdateStream();

  const form = useForm<DvrFormValues>({
    resolver: zodResolver(dvrFormSchema),
    defaultValues: toFormValues(stream),
  });

  useEffect(() => {
    if (!form.formState.isDirty) {
      form.reset(toFormValues(stream));
    }
  }, [stream, form]);

  const enabled = useWatch({ control: form.control, name: 'enabled' });

  function onSubmit(values: DvrFormValues) {
    update.mutate(
      { code: stream.code, body: { dvr: values } },
      {
        onSuccess: () => {
          toast.success('DVR settings updated');
          form.reset(values);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
      },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">DVR / Recording</CardTitle>
                <CardDescription>
                  Configure DVR (time-shift) recording for this stream. When enabled, segments are
                  archived to disk and available for playback.
                </CardDescription>
              </div>
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormLabel className="text-sm text-muted-foreground">DVR enabled</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardHeader>

          {enabled && (
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="retention_sec"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Retention (seconds)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0 = keep forever"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription>
                      How long segments are kept on disk. 0 = unlimited.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="segment_duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segment duration (seconds)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0 = server default (4s)"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription>Overrides the global segment length for this stream</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_size_gb"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max size (GB)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        placeholder="0 = no limit"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Oldest segments are pruned when this cap is exceeded
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="storage_path"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage path</FormLabel>
                    <FormControl>
                      <Input placeholder="default: ./dvr/{code}" {...field} />
                    </FormControl>
                    <FormDescription>
                      Overrides the default DVR root directory for this stream
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          )}
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
