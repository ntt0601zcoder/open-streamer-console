import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { OutputProtocols, Template } from '@/api/types';
import { useDeleteTemplate, useTemplates } from '@/features/templates/hooks/useTemplates';

export function TemplatesPage() {
  const { data: templates = [], isLoading, error } = useTemplates();
  const deleteTemplate = useDeleteTemplate();

  function handleDelete(code: string) {
    if (!confirm(`Delete template "${code}"?`)) return;
    deleteTemplate.mutate(code, {
      onSuccess: () => toast.success('Template deleted'),
      onError: (err) => {
        // Server returns 409 when streams still reference the template.
        const msg = err instanceof Error ? err.message : 'Delete failed';
        toast.error(msg);
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Templates</h1>
          {!isLoading && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {templates.length} template{templates.length !== 1 ? 's' : ''} · streams inherit
              config-like fields by referencing a template code
            </p>
          )}
        </div>
        <Button asChild size="sm" className="gap-2">
          <Link to="/templates/new">
            <Plus className="h-4 w-4" />
            New template
          </Link>
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load templates.
        </div>
      ) : isLoading ? (
        <div className="rounded-md border divide-y">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              <div className="ml-auto h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground rounded-md border">
          <Layers className="h-8 w-8" />
          <p className="text-sm">No templates yet</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/templates/new">Create your first template</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Prefixes</TableHead>
                <TableHead>Protocols</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((tpl) => (
                <TemplateRow
                  key={tpl.code}
                  template={tpl}
                  onDelete={() => handleDelete(tpl.code)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function TemplateRow({ template, onDelete }: { template: Template; onDelete: () => void }) {
  const prefixes = template.prefixes ?? [];
  const enabledProtocols = template.protocols
    ? (Object.entries(template.protocols) as [keyof OutputProtocols, boolean | undefined][])
        .filter(([, v]) => v)
        .map(([k]) => k.toUpperCase())
    : [];

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">
        <Link to={`/templates/${template.code}`} className="hover:underline">
          {template.code}
        </Link>
      </TableCell>
      <TableCell className="font-medium">{template.name || '—'}</TableCell>
      <TableCell>
        {prefixes.length === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {prefixes.slice(0, 3).map((p) => (
              <Badge key={p} variant="outline" className="font-mono text-[10px]">
                {p}
              </Badge>
            ))}
            {prefixes.length > 3 && (
              <span className="text-xs text-muted-foreground">+{prefixes.length - 3}</span>
            )}
          </div>
        )}
      </TableCell>
      <TableCell>
        {enabledProtocols.length === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {enabledProtocols.map((p) => (
              <Badge key={p} variant="secondary" className="text-[10px]">
                {p}
              </Badge>
            ))}
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <Button asChild size="icon" variant="ghost" className="h-7 w-7">
            <Link to={`/templates/${template.code}`}>
              <Pencil className="h-3.5 w-3.5" />
            </Link>
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
