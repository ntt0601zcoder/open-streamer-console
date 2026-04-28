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

interface StringListEditorProps<T extends FieldValues> {
  control: Control<T>;
  /** Field array path. Items must be shaped `{ value: string }`. */
  name: FieldArrayPath<T>;
  placeholder?: string;
  emptyHint?: string;
  addLabel?: string;
}

export function StringListEditor<T extends FieldValues>({
  control,
  name,
  placeholder,
  emptyHint,
  addLabel = 'Add',
}: StringListEditorProps<T>) {
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <div className="space-y-2">
      {fields.length === 0 && emptyHint && (
        <p className="text-xs text-muted-foreground">{emptyHint}</p>
      )}

      {fields.map((field, index) => {
        const valuePath = `${name}.${index}.value` as Path<T>;
        return (
          <div key={field.id} className="flex items-start gap-2">
            <FormField
              control={control}
              name={valuePath}
              render={({ field: f }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      placeholder={placeholder}
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
        onClick={() => append({ value: '' } as never)}
      >
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}
