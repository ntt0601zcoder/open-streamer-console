import { useState } from 'react';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StreamList } from '@/features/streams/components/StreamList';
import { useStreams } from '@/features/streams/hooks/useStreams';

export function StreamsPage() {
  const [filter, setFilter] = useState('');
  const { data: streams, isLoading, isRefetching, error, refetch } = useStreams();

  const counts = {
    total: streams?.length ?? 0,
    active: streams?.filter((s) => s.status === 'active').length ?? 0,
    degraded: streams?.filter((s) => s.status === 'degraded').length ?? 0,
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
                  {' '}· {counts.active} active
                </span>
              )}
              {counts.degraded > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  {' '}· {counts.degraded} degraded
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
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New stream
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, code or tag…"
          className="pl-9"
          value={filter}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilter(e.target.value)}
        />
      </div>

      {/* Content */}
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load streams. Make sure the Open Streamer server is running at{' '}
          <code className="font-mono">{import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'}</code>.
        </div>
      ) : isLoading ? (
        <div className="rounded-md border">
          <StreamListSkeleton />
        </div>
      ) : (
        <div className="rounded-md border">
          <StreamList streams={streams ?? []} filter={filter} />
        </div>
      )}
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
