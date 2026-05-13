import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import type { ErrorEntry, Stream } from '@/api/types';
import { RuntimeErrorIndicator } from './RuntimeErrorIndicator';
import { StreamInputSummary } from './StreamInputSummary';
import { StreamQuickView } from './StreamQuickView';
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

  const activePushCount =
    stream.runtime?.publisher?.pushes?.filter((p) => p.status === 'active').length ?? 0;
  const totalPushCount = stream.push?.filter((p) => p.enabled).length ?? 0;

  // Transcode summary. The Go server emits empty strings for unset enum fields
  // (codec: "" instead of omitting), so treat both as "no codec set" and let the
  // rendition count speak for itself.
  const tc = stream.transcoder;
  const hasTranscoder = !!tc;
  const videoProfileCount = tc?.video?.profiles?.length ?? 0;
  const videoCodec = tc?.video?.copy
    ? 'copy'
    : videoProfileCount > 0
      ? tc?.video?.profiles?.[0]?.codec || ''
      : null;
  const audioCodec = tc?.audio?.copy ? 'copy' : tc?.audio?.codec || null;

  // Aggregate transcoder runtime status so the row gets the same dot + tooltip
  // as the detail page's per-profile indicators. The server now reports a
  // per-profile `status` ('healthy' | 'unhealthy') — use it instead of
  // re-deriving from `errors.length`, which over-counts stale failures.
  const profiles = stream.runtime?.transcoder?.profiles ?? [];
  const transcoderActive = hasTranscoder && (stream.runtime?.pipeline_active ?? false);
  const allTranscoderErrors: ErrorEntry[] = profiles.flatMap((p) => p.errors ?? []);
  const totalRestarts = profiles.reduce((sum, p) => sum + (p.restart_count ?? 0), 0);
  const anyUnhealthy = profiles.some(
    (p) => p.status === 'unhealthy' || (!p.status && (p.errors ?? []).length > 0),
  );
  const transcoderStatus = !transcoderActive ? undefined : anyUnhealthy ? 'degraded' : 'active';

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => void navigate(detailPath)}
    >
      {/* Stream */}
      <TableCell>
        <StreamQuickView stream={stream}>
          <div className="space-y-0.5">
            <Link
              to={detailPath}
              className="block max-w-[180px] truncate font-medium hover:underline"
              onClick={(e) => e.stopPropagation()}
              title={stream.name || stream.code}
            >
              {stream.name || stream.code}
            </Link>
            <p className="font-mono text-xs text-muted-foreground truncate max-w-[180px]">
              {stream.code}
            </p>
            <StreamStatusBadge stream={stream} />
          </div>
        </StreamQuickView>
      </TableCell>

      {/* Input */}
      <TableCell>
        <StreamInputSummary stream={stream} />
      </TableCell>

      {/* Transcode */}
      <TableCell>
        {hasTranscoder ? (
          <div className="space-y-1">
            {transcoderStatus && (
              <div className="flex items-center gap-1.5">
                <span
                  className={
                    transcoderStatus === 'degraded'
                      ? 'text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400'
                      : 'text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400'
                  }
                >
                  {transcoderStatus}
                </span>
                <div className="flex items-center gap-1">
                  {profiles.map((p, i) => {
                    const errs = p.errors ?? [];
                    const restarts = p.restart_count ?? 0;
                    const label = p.track || `track_${(p.index ?? i) + 1}`;
                    const profileUnhealthy =
                      p.status === 'unhealthy' || (!p.status && errs.length > 0);
                    return (
                      <RuntimeErrorIndicator
                        key={p.index ?? i}
                        size="sm"
                        status={profileUnhealthy ? 'degraded' : 'active'}
                        errors={errs}
                        label={label}
                        meta={restarts > 0 ? `Restarts: ${restarts}` : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            )}
            {(videoCodec !== null || videoProfileCount > 0) && (
              <p className="text-xs">
                <span className="text-muted-foreground">Video:</span>{' '}
                {videoCodec && <span className="font-medium">{videoCodec}</span>}
                {videoCodec && videoProfileCount > 0 && (
                  <span className="text-muted-foreground"> · </span>
                )}
                {videoProfileCount > 0 && (
                  <span className="font-medium">
                    {videoProfileCount} {videoProfileCount === 1 ? 'rendition' : 'renditions'}
                  </span>
                )}
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
