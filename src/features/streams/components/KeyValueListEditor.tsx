import { Plus, X } from 'lucide-react';
import {
  useFieldArray,
  type Control,
  type FieldArrayPath,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface KeyValueListEditorProps<T extends FieldValues> {
  control: Control<T>;
  /** Field array path, e.g. `inputs.0.headers`. */
  name: FieldArrayPath<T>;
  /** Placeholder text for the key column, e.g. "Authorization". */
  keyPlaceholder?: string;
  /** Placeholder text for the value column. */
  valuePlaceholder?: string;
  /** Empty-state hint shown above the Add button. */
  emptyHint?: string;
  /** Label on the Add button. */
  addLabel?: string;
}

export function KeyValueListEditor<T extends FieldValues>({
  control,
  name,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  emptyHint,
  addLabel = 'Add',
}: KeyValueListEditorProps<T>) {
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <div className="space-y-2">
      {fields.length === 0 && emptyHint && (
        <p className="text-xs text-muted-foreground">{emptyHint}</p>
      )}

      {fields.map((field, index) => {
        const keyPath = `${name}.${index}.key` as Path<T>;
        const valuePath = `${name}.${index}.value` as Path<T>;
        return (
          <div key={field.id} className="flex items-start gap-2">
            <FormField
              control={control}
              name={keyPath}
              render={({ field: f }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      placeholder={keyPlaceholder}
                      className="font-mono text-sm"
                      autoComplete="off"
                      spellCheck={false}
                      {...f}
                      value={(f.value as string | undefined) ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={valuePath}
              render={({ field: f }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      placeholder={valuePlaceholder}
                      className="font-mono text-sm"
                      autoComplete="off"
                      spellCheck={false}
                      {...f}
                      value={(f.value as string | undefined) ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => remove(index)}
              title="Remove"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => append({ key: '', value: '' } as never)}
      >
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}
