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
  const detailPath = `/streams/${stream.code}`;

  // Output summary
  const enabledProtocols = stream.protocols
    ? (Object.entries(stream.protocols) as [string, boolean | undefined][])
        .filter(([, v]) => v)
        .map(([k]) => k.toUpperCase())
    : [];

  const activePushCount = stream.push?.filter(
    (p) => p.enabled && p.status === 'active',
  ).length ?? 0;
  const totalPushCount = stream.push?.filter((p) => p.enabled).length ?? 0;

  // Transcode summary
  const tc = stream.transcoder;
  const hasTranscoder = !!(tc?.video || tc?.audio);
  const videoCodec = tc?.video?.copy
    ? 'copy'
    : tc?.video?.profiles?.[0]?.codec;
  const audioCodec = tc?.audio?.copy
    ? 'copy'
    : tc?.audio?.codec;

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => void navigate(detailPath)}
    >
      {/* Stream */}
      <TableCell>
        <div className="space-y-0.5">
          <Link
            to={detailPath}
            className="font-medium hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {stream.code}
          </Link>
          <p className="text-xs text-muted-foreground truncate max-w-[180px]">{stream.name}</p>
          <StreamStatusBadge status={stream.status} />
        </div>
      </TableCell>

      {/* Input */}
      <TableCell>
        <StreamInputSummary stream={stream} />
      </TableCell>

      {/* Transcode */}
      <TableCell>
        {hasTranscoder ? (
          <div className="space-y-0.5">
            {videoCodec && (
              <p className="text-xs">
                <span className="text-muted-foreground">Video:</span>{' '}
                <span className="font-medium">{videoCodec}</span>
              </p>
            )}
            {audioCodec && (
              <p className="text-xs">
                <span className="text-muted-foreground">Audio:</span>{' '}
                <span className="font-medium">{audioCodec}</span>
              </p>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* DVR */}
      <TableCell>
        {stream.dvr?.enabled ? (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">Enabled</span>
        ) : (
          <span className="text-xs text-muted-foreground">Disabled</span>
        )}
      </TableCell>

      {/* Output */}
      <TableCell>
        <div className="space-y-1">
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
    </TableRow>
  );
}
