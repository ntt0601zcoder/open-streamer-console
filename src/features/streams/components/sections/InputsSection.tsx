// Section is wrapped in a <FormProvider> at the call site (StreamCreatePage,
// TemplateEditorPage). Reading `control` via useFormContext avoids the
// invariance issue with passing `Control<SpecificForm>` into a generic
// `Control<any>` prop — react-hook-form's invariant `ValidateForm<T>`
// rejects the downcast on newer versions.
import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { KeyValueListEditor } from '@/features/streams/components/KeyValueListEditor';

export function InputsSection() {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: 'inputs' });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Input sources</CardTitle>
            <CardDescription>
              First input is primary. Additional inputs serve as failovers in priority order.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => append({ url: '', priority: fields.length })}
          >
            <Plus className="h-4 w-4" />
            Add input
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">No inputs configured.</p>
        )}
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-lg border">
            <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-2.5">
              <span className="flex-1 text-sm font-medium">Input {index + 1}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => remove(index)}
                title="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-4 p-4">
              <FormField
                control={control}
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

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  HTTP headers
                </p>
                <KeyValueListEditor
                  control={control}
                  name={`inputs.${index}.headers`}
                  keyPlaceholder="Authorization"
                  valuePlaceholder="Bearer …"
                  emptyHint="Sent with every request for HTTP/HLS pull inputs."
                  addLabel="Add header"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  URL params
                </p>
                <KeyValueListEditor
                  control={control}
                  name={`inputs.${index}.params`}
                  keyPlaceholder="passphrase"
                  valuePlaceholder="value"
                  emptyHint="Merged into the source URL — useful for SRT passphrases, S3 keys, etc."
                  addLabel="Add param"
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
