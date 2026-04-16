import { Link2, Link2Off } from 'lucide-react';
import type { Input } from '@/api/types';

interface StreamInputSummaryProps {
  inputs: Input[] | undefined;
}

export function StreamInputSummary({ inputs }: StreamInputSummaryProps) {
  if (!inputs || inputs.length === 0) {
    return <span className="text-xs text-muted-foreground">No inputs</span>;
  }

  const primary = inputs.find((i) => (i.priority ?? 0) === Math.min(...inputs.map((x) => x.priority ?? 0))) ?? inputs[0];

  const short = shortenUrl(primary.url);

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        <Link2 className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="max-w-[180px] truncate text-xs font-mono" title={primary.url}>
          {short}
        </span>
      </div>
      {inputs.length > 1 && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Link2Off className="h-3 w-3 shrink-0" />
          <span className="text-xs">+{inputs.length - 1} fallback</span>
        </div>
      )}
    </div>
  );
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}${u.pathname}`.replace(/(.{28}).*$/, '$1…');
  } catch {
    return url.length > 32 ? url.slice(0, 32) + '…' : url;
  }
}
