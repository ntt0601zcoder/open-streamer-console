import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { FlaskConical, Pencil, Plus, Settings, Trash2, X } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Hook } from '@/api/types';
import { EventType } from '@/api/types';
import { useConfigDefaults } from '@/features/config/hooks/useServerConfig';
import {
  useCreateHook,
  useDeleteHook,
  useHooks,
  useTestHook,
  useUpdateHook,
} from '@/features/hooks-config/hooks/useHooks';

// ─── Schema ───────────────────────────────────────────────────────────────────

const hookFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['http', 'file']),
  target: z.string().min(1, 'Target is required'),
  enabled: z.boolean(),
  event_types: z.array(z.string()),
  stream_filter_mode: z.enum(['all', 'only', 'except']),
  stream_codes: z.string(),
  metadata: z.array(z.object({ key: z.string(), value: z.string() })),
  secret: z.string(),
  max_retries: z.coerce.number().int().min(0).optional(),
  timeout_sec: z.coerce.number().int().min(0).optional(),
  batch_max_items: z.coerce.number().int().min(0).optional(),
  batch_flush_interval_sec: z.coerce.number().int().min(0).optional(),
  batch_max_queue_items: z.coerce.number().int().min(0).optional(),
});

type HookFormValues = z.infer<typeof hookFormSchema>;

// ─── Event groups ─────────────────────────────────────────────────────────────

const EVENT_GROUPS: { label: string; events: { value: string; label: string }[] }[] = [
  {
    label: 'Stream',
    events: [
      { value: EventType.stream_created, label: 'Stream created' },
      { value: EventType.stream_started, label: 'Stream started' },
      { value: EventType.stream_stopped, label: 'Stream stopped' },
      { value: EventType.stream_deleted, label: 'Stream deleted' },
    ],
  },
  {
    label: 'Input',
    events: [
      { value: EventType.input_connected, label: 'Input connected' },
      { value: EventType.input_reconnecting, label: 'Input reconnecting' },
      { value: EventType.input_degraded, label: 'Input degraded' },
      { value: EventType.input_failed, label: 'Input failed' },
      { value: EventType.input_failover, label: 'Input failover' },
    ],
  },
  {
    label: 'Recording',
    events: [
      { value: EventType.recording_started, label: 'Recording started' },
      { value: EventType.recording_stopped, label: 'Recording stopped' },
      { value: EventType.recording_failed, label: 'Recording failed' },
      { value: EventType.segment_written, label: 'Segment written' },
    ],
  },
  {
    label: 'Transcoder',
    events: [
      { value: EventType.transcoder_started, label: 'Transcoder started' },
      { value: EventType.transcoder_stopped, label: 'Transcoder stopped' },
      { value: EventType.transcoder_error, label: 'Transcoder error' },
    ],
  },
  {
    label: 'Session',
    events: [
      { value: EventType.session_opened, label: 'Session opened' },
      { value: EventType.session_closed, label: 'Session closed' },
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export function HooksPage() {
  const { data: hooks = [], isLoading, error } = useHooks();
  const deleteHook = useDeleteHook();
  const testHook = useTestHook();
  const [dialogHook, setDialogHook] = useState<Hook | null | 'new'>(null);

  function handleDelete(hid: string, name: string) {
    if (!confirm(`Delete hook "${name}"?`)) return;
    deleteHook.mutate(hid, {
      onSuccess: () => toast.success('Hook deleted'),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
    });
  }

  function handleTest(hid: string) {
    testHook.mutate(hid, {
      onSuccess: (res) => toast.success(`Test delivered — status: ${res.data.status}`),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Test failed'),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Webhooks</h1>
          {!isLoading && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {hooks.length} hook{hooks.length !== 1 ? 's' : ''} configured
            </p>
          )}
        </div>
        <Button size="sm" className="gap-2" onClick={() => setDialogHook('new')}>
          <Plus className="h-4 w-4" />
          New hook
        </Button>
      </div>

      {/* Content */}
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load hooks.
        </div>
      ) : isLoading ? (
        <div className="rounded-md border divide-y">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="ml-auto h-4 w-32 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : hooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground rounded-md border">
          <Settings className="h-8 w-8" />
          <p className="text-sm">No hooks configured yet</p>
          <Button variant="outline" size="sm" onClick={() => setDialogHook('new')}>
            Create your first hook
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[80px]">Type</TableHead>
                <TableHead>Target</TableHead>
                <TableHead className="w-[90px]">Status</TableHead>
                <TableHead className="w-[120px]">Events</TableHead>
                <TableHead className="w-[130px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {hooks.map((hook) => (
                <HookRow
                  key={hook.id}
                  hook={hook}
                  onEdit={() => setDialogHook(hook)}
                  onDelete={() => handleDelete(hook.id, hook.name)}
                  onTest={() => handleTest(hook.id)}
                  testPending={testHook.isPending && testHook.variables === hook.id}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit dialog */}
      {dialogHook !== null && (
        <HookDialog
          hook={dialogHook === 'new' ? null : dialogHook}
          onClose={() => setDialogHook(null)}
        />
      )}
    </div>
  );
}

// ─── Hook row ─────────────────────────────────────────────────────────────────

function HookRow({
  hook,
  onEdit,
  onDelete,
  onTest,
  testPending,
}: {
  hook: Hook;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
  testPending: boolean;
}) {
  const eventCount = hook.event_types?.length ?? 0;

  return (
    <TableRow>
      <TableCell className="font-medium">{hook.name}</TableCell>
      <TableCell>
        <Badge variant="outline" className="text-[10px] uppercase">
          {hook.type}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[260px]">
        <span
          className="block truncate font-mono text-xs text-muted-foreground"
          title={hook.target}
        >
          {hook.target}
        </span>
      </TableCell>
      <TableCell>
        {hook.enabled !== false ? (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">Enabled</span>
        ) : (
          <span className="text-xs text-muted-foreground">Disabled</span>
        )}
      </TableCell>
      <TableCell>
        <span className="text-xs text-muted-foreground">
          {eventCount === 0 ? 'All events' : `${eventCount} event${eventCount !== 1 ? 's' : ''}`}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={onTest}
            disabled={testPending}
          >
            <FlaskConical className="h-3.5 w-3.5" />
            Test
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Create / Edit dialog ─────────────────────────────────────────────────────

function HookDialog({ hook, onClose }: { hook: Hook | null; onClose: () => void }) {
  const createHook = useCreateHook();
  const updateHook = useUpdateHook();
  const { data: defaults } = useConfigDefaults();
  const isEdit = hook !== null;
  const maxRetriesPlaceholder =
    defaults?.hook?.max_retries != null ? String(defaults.hook.max_retries) : 'default';
  const timeoutPlaceholder =
    defaults?.hook?.timeout_sec != null ? String(defaults.hook.timeout_sec) : 'default';
  const batchMaxItemsPlaceholder =
    defaults?.hook?.batch_max_items != null ? String(defaults.hook.batch_max_items) : 'default';
  const batchFlushPlaceholder =
    defaults?.hook?.batch_flush_interval_sec != null
      ? String(defaults.hook.batch_flush_interval_sec)
      : 'default';
  const batchQueuePlaceholder =
    defaults?.hook?.batch_max_queue_items != null
      ? String(defaults.hook.batch_max_queue_items)
      : 'default';

  const form = useForm<HookFormValues>({
    resolver: zodResolver(hookFormSchema),
    defaultValues: {
      name: hook?.name ?? '',
      type: hook?.type ?? 'http',
      target: hook?.target ?? '',
      enabled: hook?.enabled ?? true,
      event_types: hook?.event_types ?? [],
      stream_filter_mode: hook?.stream_codes?.only
        ? 'only'
        : hook?.stream_codes?.except
          ? 'except'
          : 'all',
      stream_codes: (hook?.stream_codes?.only ?? hook?.stream_codes?.except ?? []).join(', '),
      metadata: Object.entries(hook?.metadata ?? {}).map(([key, value]) => ({ key, value })),
      secret: hook?.secret ?? '',
      max_retries: hook?.max_retries,
      timeout_sec: hook?.timeout_sec,
      batch_max_items: hook?.batch_max_items,
      batch_flush_interval_sec: hook?.batch_flush_interval_sec,
      batch_max_queue_items: hook?.batch_max_queue_items,
    },
  });

  const hookType = form.watch('type');
  const filterMode = form.watch('stream_filter_mode');
  const isPending = createHook.isPending || updateHook.isPending;
  const {
    fields: metaFields,
    append: appendMeta,
    remove: removeMeta,
  } = useFieldArray({
    control: form.control,
    name: 'metadata',
  });

  function onSubmit(values: HookFormValues) {
    const codes = values.stream_codes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const stream_codes =
      values.stream_filter_mode === 'only' && codes.length > 0
        ? { only: codes }
        : values.stream_filter_mode === 'except' && codes.length > 0
          ? { except: codes }
          : undefined;

    const body = {
      name: values.name,
      type: values.type,
      target: values.target,
      enabled: values.enabled,
      event_types:
        values.event_types.length > 0
          ? (values.event_types as (typeof EventType)[keyof typeof EventType][])
          : undefined,
      stream_codes,
      metadata:
        values.metadata.length > 0
          ? Object.fromEntries(values.metadata.filter((m) => m.key).map((m) => [m.key, m.value]))
          : undefined,
      secret: values.secret || undefined,
      max_retries: values.max_retries || undefined,
      timeout_sec: values.timeout_sec || undefined,
      batch_max_items: values.batch_max_items || undefined,
      batch_flush_interval_sec: values.batch_flush_interval_sec || undefined,
      batch_max_queue_items: values.batch_max_queue_items || undefined,
    };

    if (isEdit) {
      updateHook.mutate(
        { hid: hook.id, patch: body },
        {
          onSuccess: () => {
            toast.success('Hook updated');
            onClose();
          },
          onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
        },
      );
    } else {
      createHook.mutate(body, {
        onSuccess: () => {
          toast.success('Hook created');
          onClose();
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Create failed'),
      });
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit hook' : 'New hook'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-5">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My webhook" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="http">HTTP</SelectItem>
                      <SelectItem value="file">File</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Target */}
            <FormField
              control={form.control}
              name="target"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{hookType === 'file' ? 'File path' : 'URL'}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        hookType === 'file'
                          ? '/var/log/open-streamer/events.log'
                          : 'https://example.com/webhook'
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {hookType === 'file'
                      ? 'Absolute path to a file that events will be appended to as JSONL.'
                      : 'HTTP(S) endpoint that receives the event payload as POST body.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Secret — HTTP only */}
            {hookType === 'http' && (
              <FormField
                control={form.control}
                name="secret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Signing secret</FormLabel>
                    <FormControl>
                      <Input placeholder="Leave empty to disable signing" {...field} />
                    </FormControl>
                    <FormDescription>
                      HMAC-SHA256 signature sent in X-Signature header
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Retries + timeout */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="max_retries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max retries</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder={maxRetriesPlaceholder}
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
                control={form.control}
                name="timeout_sec"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timeout (s)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder={timeoutPlaceholder}
                        className="placeholder:italic"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Batching overrides */}
            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Batching overrides</p>
                <p className="text-xs text-muted-foreground">
                  Override the global batch settings just for this hook. Leave any field empty
                  to inherit.
                  {hookType === 'file' &&
                    ' File hooks always write one event per line, so "Batch max items" has no effect.'}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="batch_max_items"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Batch max items</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder={batchMaxItemsPlaceholder}
                          className="placeholder:italic"
                          disabled={hookType === 'file'}
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
                  name="batch_flush_interval_sec"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Flush interval (s)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder={batchFlushPlaceholder}
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
                  control={form.control}
                  name="batch_max_queue_items"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Queue cap</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder={batchQueuePlaceholder}
                          className="placeholder:italic"
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

            {/* Event filter */}
            <FormField
              control={form.control}
              name="event_types"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event filter</FormLabel>
                  <FormDescription>Leave all unchecked to receive every event.</FormDescription>
                  <div className="space-y-4 pt-1">
                    {EVENT_GROUPS.map((group) => (
                      <div key={group.label}>
                        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {group.label}
                        </p>
                        <div className="grid grid-cols-2 gap-1">
                          {group.events.map((ev) => (
                            <label
                              key={ev.value}
                              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted cursor-pointer select-none"
                            >
                              <Checkbox
                                checked={field.value.includes(ev.value)}
                                onCheckedChange={(checked) => {
                                  field.onChange(
                                    checked
                                      ? [...field.value, ev.value]
                                      : field.value.filter((v) => v !== ev.value),
                                  );
                                }}
                              />
                              {ev.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Stream filter */}
            <FormField
              control={form.control}
              name="stream_filter_mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stream filter</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">All streams</SelectItem>
                      <SelectItem value="only">Only specific streams</SelectItem>
                      <SelectItem value="except">All except specific streams</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {filterMode !== 'all' && (
              <FormField
                control={form.control}
                name="stream_codes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stream codes</FormLabel>
                    <FormControl>
                      <Input placeholder="obs-main, rtmp-backup, ..." {...field} />
                    </FormControl>
                    <FormDescription>Comma-separated stream codes</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Metadata */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium leading-none">Metadata</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 gap-1 px-2 text-xs"
                  onClick={() => appendMeta({ key: '', value: '' })}
                >
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Key-value pairs merged into every event payload from this hook.
              </p>
              {metaFields.length > 0 && (
                <div className="space-y-2 pt-1">
                  {metaFields.map((f, i) => (
                    <div key={f.id} className="flex items-center gap-2">
                      <Input
                        placeholder="key"
                        className="h-8 text-xs font-mono"
                        {...form.register(`metadata.${i}.key`)}
                      />
                      <Input
                        placeholder="value"
                        className="h-8 text-xs font-mono"
                        {...form.register(`metadata.${i}.value`)}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeMeta(i)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Enabled */}
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0 rounded-md border p-3">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div>
                    <FormLabel>Enabled</FormLabel>
                    <FormDescription className="text-xs">
                      Deliver events to this hook
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create hook'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
