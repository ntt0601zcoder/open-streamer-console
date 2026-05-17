// See InputsSection.tsx for rationale on reading `control` via useFormContext.
import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Link } from 'react-router-dom';
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
import { Switch } from '@/components/ui/switch';
import { useServerConfig } from '@/features/config/hooks/useServerConfig';
import { CollapsibleRow } from '@/features/streams/components/CollapsibleRow';

const PROTOCOL_LABELS: Record<string, string> = {
  hls: 'HLS — HTTP Live Streaming',
  dash: 'DASH — Dynamic Adaptive Streaming',
  mpegts: 'MPEGTS — Raw MPEG-TS over chunked HTTP (sub-second relay)',
  rtmp: 'RTMP — Real-Time Messaging Protocol',
  rtsp: 'RTSP — Real-Time Streaming Protocol',
  srt: 'SRT — Secure Reliable Transport',
};

/**
 * Output protocols + push destinations editor. Form must have a `protocols`
 * object (hls/dash/mpegts/rtmp/rtsp/srt booleans) and a `push` field array.
 */
export function OutputSection() {
  const { control } = useFormContext();
  const { data: serverConfig } = useServerConfig();
  const ports = serverConfig?.ports;

  const { fields, append, remove } = useFieldArray({ control, name: 'push' });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Output protocols</CardTitle>
          <CardDescription>
            Enable the delivery protocols. RTMP/RTSP/SRT require the matching listener to be
            configured in{' '}
            <Link to="/settings" className="underline">
              global config
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {(['hls', 'dash', 'mpegts', 'rtmp', 'rtsp', 'srt'] as const).map((key) => {
            const portMissing =
              (key === 'rtmp' && !ports?.rtmp_port) ||
              (key === 'rtsp' && !ports?.rtsp_port) ||
              (key === 'srt' && !ports?.srt_port);
            return (
              <FormField
                key={key}
                control={control}
                name={`protocols.${key}`}
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div>
                      <FormLabel>{PROTOCOL_LABELS[key]}</FormLabel>
                      {portMissing && (
                        <FormDescription className="text-xs text-amber-600 dark:text-amber-400">
                          Listener port not configured
                        </FormDescription>
                      )}
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={portMissing && !field.value}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Push destinations</CardTitle>
              <CardDescription>
                External RTMP/RTMPS endpoints the server actively pushes to (YouTube, Twitch, …).
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
              No push destinations. Add one to forward this stream to an external service.
            </p>
          )}
          {fields.map((field, index) => (
            <CollapsibleRow
              key={field.id}
              header={<span className="text-sm font-medium">Destination {index + 1}</span>}
              actions={
                <>
                  <FormField
                    control={control}
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
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              }
            >
              <div className="grid gap-4 p-4 sm:grid-cols-2">
                <FormField
                  control={control}
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
                  control={control}
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
              </div>
            </CollapsibleRow>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
