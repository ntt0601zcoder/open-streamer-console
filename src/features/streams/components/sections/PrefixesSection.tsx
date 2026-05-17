// See InputsSection.tsx for rationale on reading `control` via useFormContext.
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StringListEditor } from '@/features/streams/components/StringListEditor';

/**
 * URL-path prefixes — template-specific. Ingest URLs matching any of these
 * path prefixes auto-publish using this template. Form must have a
 * `prefixes` field array of `{ value: string }`.
 */
export function PrefixesSection() {
  const { control } = useFormContext();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Auto-publish prefixes</CardTitle>
        <CardDescription>
          Ingest URLs whose path matches any of these prefixes auto-publish using this template.
          Leave empty to require explicit <code>stream.template</code> references.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <StringListEditor
          control={control}
          name="prefixes"
          placeholder="/live/"
          emptyHint="No prefixes configured."
          addLabel="Add prefix"
        />
      </CardContent>
    </Card>
  );
}
