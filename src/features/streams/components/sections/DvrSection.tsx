// See InputsSection.tsx for rationale on reading `control` via useFormContext.
import { useFormContext, useWatch } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useConfigDefaults } from '@/features/config/hooks/useServerConfig';

interface DvrSectionProps {
  /**
   * The form field name to read for the storage-path placeholder substitution
   * (the placeholder shows `dvr/{streamCode}` rendered with the live code).
   * Defaults to `'code'` to match StreamCreatePage; pass another path
   * (e.g. `'code'` for the Template editor) as needed.
   */
  codeFieldName?: string;
}

export function DvrSection({ codeFieldName = 'code' }: DvrSectionProps = {}) {
  const { control } = useFormContext();
  const enabled = useWatch({ control, name: 'dvr.enabled' });
  const code = useWatch({ control, name: codeFieldName });
  const { data: defaults } = useConfigDefaults();
  const segmentDurationPlaceholder =
    defaults?.dvr?.segment_duration != null ? String(defaults.dvr.segment_duration) : 'default';
  const storagePathPlaceholder =
    defaults?.dvr?.storage_path_template?.replace('{streamCode}', code || '{streamCode}') ??
    'default';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">DVR / Recording</CardTitle>
            <CardDescription>
              Configure DVR (time-shift) recording. When enabled, segments are archived to disk.
            </CardDescription>
          </div>
          <FormField
            control={control}
            name="dvr.enabled"
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
            control={control}
            name="dvr.retention_sec"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Retention (seconds)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder="default"
                    className="placeholder:italic"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="dvr.segment_duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Segment duration (seconds)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder={segmentDurationPlaceholder}
                    className="placeholder:italic"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="dvr.max_size_gb"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max size (GB)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder="default"
                    className="placeholder:italic"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="dvr.storage_path"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Storage path</FormLabel>
                <FormControl>
                  <Input
                    placeholder={storagePathPlaceholder}
                    className="placeholder:italic"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      )}
    </Card>
  );
}
