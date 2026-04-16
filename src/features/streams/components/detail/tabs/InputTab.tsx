import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
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
import { Separator } from '@/components/ui/separator';
import type { Stream } from '@/api/types';
import { useUpdateStream } from '@/features/streams/hooks/useStreams';
import { inputsFormSchema, type InputsFormValues } from '@/features/streams/schemas';

interface InputTabProps {
  stream: Stream;
}

function toFormValues(stream: Stream): InputsFormValues {
  return {
    inputs: (stream.inputs ?? []).map((inp) => ({
      url: inp.url,
      priority: inp.priority ?? 0,
      net: inp.net
        ? {
            connect_timeout_sec: inp.net.connect_timeout_sec,
            read_timeout_sec: inp.net.read_timeout_sec,
            reconnect_delay_sec: inp.net.reconnect_delay_sec,
            max_reconnects: inp.net.max_reconnects,
          }
        : undefined,
    })),
  };
}

export function InputTab({ stream }: InputTabProps) {
  const update = useUpdateStream();

  const form = useForm<InputsFormValues>({
    resolver: zodResolver(inputsFormSchema),
    defaultValues: toFormValues(stream),
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'inputs',
  });

  useEffect(() => {
    if (!form.formState.isDirty) {
      form.reset(toFormValues(stream));
    }
  }, [stream, form]);

  function onSubmit(values: InputsFormValues) {
    const inputs = values.inputs.map((inp, i) => ({ ...inp, priority: i }));
    update.mutate(
      { code: stream.code, patch: { inputs } },
      {
        onSuccess: () => {
          toast.success('Inputs updated');
          form.reset(values);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
      },
    );
  }

  function addInput() {
    append({ url: '', priority: fields.length });
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Input sources</CardTitle>
                <CardDescription>
                  First input is primary. Stream manager switches to the next input on failure.
                  Use the arrows to reorder.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addInput}>
                <Plus className="h-4 w-4" />
                Add input
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No inputs configured. Add an input source to get started.
              </p>
            )}

            {fields.map((field, index) => (
              <InputRow
                key={field.id}
                index={index}
                total={fields.length}
                form={form}
                onRemove={() => remove(index)}
                onMoveUp={() => move(index, index - 1)}
                onMoveDown={() => move(index, index + 1)}
              />
            ))}
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

interface InputRowProps {
  index: number;
  total: number;
  form: ReturnType<typeof useForm<InputsFormValues>>;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function InputRow({ index, total, form, onRemove, onMoveUp, onMoveDown }: InputRowProps) {
  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <div className="rounded-lg border bg-card">
      {/* Row header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-muted/40">
        <div className="flex flex-col">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-4 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
            onClick={onMoveUp}
            disabled={isFirst}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-4 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
            onClick={onMoveDown}
            disabled={isLast}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm font-medium">Input {index + 1}</span>
          {isFirst ? (
            <Badge variant="default" className="h-4 px-1.5 text-[10px]">primary</Badge>
          ) : (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">fallback</Badge>
          )}
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Row content */}
      <div className="grid gap-4 p-4 sm:grid-cols-1">
        {/* URL */}
        <FormField
          control={form.control}
          name={`inputs.${index}.url`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="rtmp://source/live/key  or  srt://host:port  or  https://…/stream.m3u8"
                  className="font-mono text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Net config */}
        <NetConfig index={index} form={form} />
      </div>
    </div>
  );
}

function NetConfig({
  index,
  form,
}: {
  index: number;
  form: ReturnType<typeof useForm<InputsFormValues>>;
}) {
  return (
    <div className="sm:col-span-3 space-y-3">
      <Separator />
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Network timeouts
      </p>
      <div className="grid gap-3 sm:grid-cols-4">
        {(
          [
            ['connect_timeout_sec', 'Connect timeout (s)'],
            ['read_timeout_sec', 'Read timeout (s)'],
            ['reconnect_delay_sec', 'Reconnect delay (s)'],
            ['max_reconnects', 'Max reconnects'],
          ] as const
        ).map(([name, label]) => (
          <FormField
            key={name}
            control={form.control}
            name={`inputs.${index}.net.${name}`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">{label}</FormLabel>
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
        ))}
      </div>
    </div>
  );
}
