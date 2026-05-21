import { Send, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Stream } from '@/api/types';
import { StreamStatus } from '@/api/types';
import { useStreamTemplate } from '@/features/streams/hooks/useStreamTemplate';
import { cn } from '@/lib/utils';
import { RuntimeErrorIndicator } from './RuntimeErrorIndicator';
import { StreamInputSummary } from './StreamInputSummary';
import { StreamQuickView } from './StreamQuickView';
import { StreamStatusBadge } from './StreamStatusBadge';

interface StreamRowProps {
  stream: Stream;
  /** Active watcher count for this stream — supplied by the page-level session query. */
  watchers?: number;
}

export function StreamRow({ stream, watchers = 0 }: StreamRowProps) {
  const navigate = useNavigate();
  const detailPath = `/streams/${stream.code}`;

  // Use the resolved view so rows for template-inheriting streams show the
  // effective config (protocols / transcoder / dvr / push) the runtime is
  // actually using, not the raw empty placeholders the server persists.
  const { resolved } = useStreamTemplate(stream);

  // Output summary
  const enabledProtocols = resolved.protocols
    ? (Object.entries(resolved.protocols) as [string, boolean | undefined][])
        .filter(([, v]) => v)
        .map(([k]) => k.toUpperCase())
    : [];

  const activePushCount =
    stream.runtime?.publisher?.pushes?.filter((p) => p.status === 'active').length ?? 0;
  const totalPushCount = resolved.push?.filter((p) => p.enabled).length ?? 0;

  const streamStatus = stream.runtime?.status;
  const isRunning =
    streamStatus === StreamStatus.active || streamStatus === StreamStatus.degraded;

  // Transcode summary. The Go server emits empty strings for unset enum fields
  // (codec: "" instead of omitting), so treat both as "no codec set" and let the
  // rendition count speak for itself.
  const tc = resolved.transcoder;
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
      <TableCell className="align-top">
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
      <TableCell className="align-top">
        <StreamInputSummary stream={stream} />
      </TableCell>

      {/* Transcode */}
      <TableCell className="align-top">
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
                        errorsAreHistorical
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
      <TableCell className="align-top">
        {resolved.dvr?.enabled ? (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">Enabled</span>
        ) : (
          <span className="text-xs text-muted-foreground">Disabled</span>
        )}
      </TableCell>

      {/* Output */}
      <TableCell className="align-top">
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
          {isRunning && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {watchers}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {watchers === 0
                    ? 'No watchers'
                    : `${watchers} active watcher${watchers === 1 ? '' : 's'}`}
                </TooltipContent>
              </Tooltip>
              {totalPushCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1',
                        activePushCount < totalPushCount &&
                          'text-amber-600 dark:text-amber-400',
                      )}
                    >
                      <Send className="h-3 w-3" />
                      {activePushCount}/{totalPushCount}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {activePushCount === totalPushCount
                      ? `All ${totalPushCount} push destination${totalPushCount === 1 ? '' : 's'} active`
                      : `${activePushCount} of ${totalPushCount} push destinations active`}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
