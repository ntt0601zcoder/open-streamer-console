import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, List, Plus, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BASE_URL } from '@/api/client';
import { StreamGrid, type GridProto } from '@/features/streams/components/StreamGrid';
import { StreamList } from '@/features/streams/components/StreamList';
import { useSessions } from '@/features/streams/hooks/useSessions';
import { useStreams } from '@/features/streams/hooks/useStreams';
import { cn } from '@/lib/utils';

type ViewMode = 'table' | 'grid';

export function StreamsPage() {
  const [filter, setFilter] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [gridProto, setGridProto] = useState<GridProto>('hls');
  const { data: streams, isLoading, isRefetching, error, refetch } = useStreams();
  // Single global query that all rows share. TanStack dedups the cache key,
  // so individual rows don't have to fan out their own requests.
  const { data: sessionsData } = useSessions({ status: 'active' });
  const watchersByStream = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sessionsData?.sessions ?? []) {
      m.set(s.stream_code, (m.get(s.stream_code) ?? 0) + 1);
    }
    return m;
  }, [sessionsData]);

  const counts = {
    total: streams?.length ?? 0,
    active: streams?.filter((s) => s.runtime?.status === 'active').length ?? 0,
    degraded: streams?.filter((s) => s.runtime?.status === 'degraded').length ?? 0,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Streams</h1>
          {!isLoading && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {counts.total} stream{counts.total !== 1 ? 's' : ''}
              {counts.active > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400">
                  {' '}
                  · {counts.active} active
                </span>
              )}
              {counts.degraded > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  {' '}
                  · {counts.degraded} degraded
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9"
            onClick={() => void refetch()}
            disabled={isRefetching}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button asChild size="sm" className="gap-2">
            <Link to="/streams/new">
              <Plus className="h-4 w-4" />
              New stream
            </Link>
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, code or tag…"
            className="pl-9"
            value={filter}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilter(e.target.value)}
          />
        </div>
        <SegmentedToggle
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: 'table', label: 'List', icon: <List className="h-3.5 w-3.5" /> },
            { value: 'grid', label: 'Players', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
          ]}
        />
        {viewMode === 'grid' && (
          <SegmentedToggle
            value={gridProto}
            onChange={setGridProto}
            options={[
              { value: 'hls', label: 'HLS' },
              { value: 'dash', label: 'DASH' },
            ]}
          />
        )}
      </div>

      {/* Content */}
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load streams. Make sure the Open Streamer server is running at{' '}
          <code className="font-mono">{BASE_URL}</code>.
        </div>
      ) : isLoading ? (
        <div className="rounded-md border">
          <StreamListSkeleton />
        </div>
      ) : viewMode === 'table' ? (
        <div className="rounded-md border">
          <StreamList
            streams={streams ?? []}
            filter={filter}
            watchersByStream={watchersByStream}
          />
        </div>
      ) : (
        <StreamGrid streams={streams ?? []} filter={filter} proto={gridProto} />
      )}
    </div>
  );
}

interface SegmentedToggleOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentedToggleOption<T>[];
}) {
  return (
    <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors',
            value === opt.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function StreamListSkeleton() {
  return (
    <div className="divide-y">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-3 w-40 animate-pulse rounded bg-muted" />
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-3 w-8 animate-pulse rounded bg-muted" />
          <div className="ml-auto flex gap-1">
            <div className="h-7 w-7 animate-pulse rounded bg-muted" />
            <div className="h-7 w-7 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
