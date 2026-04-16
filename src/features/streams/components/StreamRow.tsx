import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import type { Stream } from '@/api/types';
import { StreamInputSummary } from './StreamInputSummary';
import { StreamStatusBadge } from './StreamStatusBadge';

interface StreamRowProps {
  stream: Stream;
}

export function StreamRow({ stream }: StreamRowProps) {
  const navigate = useNavigate();
  const enabledProtocols = stream.protocols
    ? (Object.entries(stream.protocols) as [string, boolean | undefined][])
        .filter(([, v]) => v)
        .map(([k]) => k.toUpperCase())
    : [];

  const activePushCount = stream.push?.filter(
    (p) => p.enabled && p.status === 'active',
  ).length ?? 0;

  const totalPushCount = stream.push?.filter((p) => p.enabled).length ?? 0;

  const detailPath = `/streams/${stream.code}`;

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => void navigate(detailPath)}>
      {/* Stream name + code */}
      <TableCell className="min-w-[160px]">
        <div className="space-y-0.5">
          <Link
            to={detailPath}
            className="font-medium hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {stream.name}
          </Link>
          <span className="font-mono text-xs text-muted-foreground">{stream.code}</span>
        </div>
      </TableCell>

      {/* Status */}
      <TableCell>
        <StreamStatusBadge status={stream.status} />
      </TableCell>

      {/* Inputs */}
      <TableCell className="min-w-[180px]">
        <StreamInputSummary inputs={stream.inputs} />
      </TableCell>

      {/* Protocols / Output */}
      <TableCell className="min-w-[160px]">
        <div className="space-y-1.5">
          {enabledProtocols.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {enabledProtocols.map((p) => (
                <Badge key={p} variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {p}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No output</span>
          )}
          {totalPushCount > 0 && (
            <p className="text-xs text-muted-foreground">
              Push: {activePushCount}/{totalPushCount} active
            </p>
          )}
        </div>
      </TableCell>

      {/* DVR */}
      <TableCell>
        {stream.dvr?.enabled ? (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">Enabled</span>
        ) : (
          <span className="text-xs text-muted-foreground">Off</span>
        )}
      </TableCell>

      {/* Tags */}
      <TableCell className="hidden lg:table-cell">
        {stream.tags && stream.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {stream.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="h-4 px-1.5 text-[10px]">
                {tag}
              </Badge>
            ))}
            {stream.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">+{stream.tags.length - 3}</span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

    </TableRow>
  );
}
