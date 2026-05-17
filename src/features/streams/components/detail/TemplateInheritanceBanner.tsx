import { ExternalLink, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import type { Stream } from '@/api/types';
import { useStreamTemplate } from '@/features/streams/hooks/useStreamTemplate';

interface TemplateInheritanceBannerProps {
  stream: Stream;
}

/**
 * Surfaced at the top of the stream detail page whenever the stream
 * references a template. Per-section inheritance details are surfaced
 * inline on each tab (via InheritedSectionNotice) — this banner just
 * announces the template link.
 */
export function TemplateInheritanceBanner({ stream }: TemplateInheritanceBannerProps) {
  const { template, isLoading } = useStreamTemplate(stream);

  if (!stream.template) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col gap-2 py-4">
        <div className="flex items-start gap-2.5">
          <Layers className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              Inherits from template{' '}
              <Link
                to={`/templates/${stream.template}`}
                className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
              >
                {template?.name ? `${template.name} (${stream.template})` : stream.template}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-xs italic text-muted-foreground">Loading template…</p>
        ) : !template ? (
          <p className="text-xs italic text-amber-600 dark:text-amber-400">
            Template <code className="font-mono">{stream.template}</code> not found — the stream
            references a template that no longer exists.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
