import { Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

interface InheritedSectionNoticeProps {
  /** Template code being inherited from. */
  templateCode: string;
  /** Optional human-readable label for the section (e.g. "Inputs"). */
  label?: string;
  /** True while the linked template is still being fetched. */
  isLoading?: boolean;
}

/**
 * Slim banner shown at the top of a stream-detail tab whose section is
 * being inherited from the linked template. The form fields below are
 * pre-populated with the template's values (via `resolveStream`), so the
 * notice only needs to explain what's happening — the actual values are
 * already visible in the controls themselves.
 */
export function InheritedSectionNotice({
  templateCode,
  label,
  isLoading,
}: InheritedSectionNoticeProps) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
      <Layers className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="flex-1 space-y-0.5">
        <p className="font-medium">
          {label ? `${label} inherited from template` : 'Inherited from template'}{' '}
          <Link
            to={`/templates/${templateCode}`}
            className="font-mono text-primary hover:underline"
          >
            {templateCode}
          </Link>
          {isLoading && <span className="ml-2 text-xs italic text-muted-foreground">loading…</span>}
        </p>
      </div>
    </div>
  );
}
