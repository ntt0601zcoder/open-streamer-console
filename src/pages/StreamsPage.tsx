import { useStreams } from '@/features/streams/hooks/useStreams';

export function StreamsPage() {
  const { data: streams, isLoading, error } = useStreams();

  if (isLoading) return <p className="text-muted-foreground">Loading streams…</p>;
  if (error) return <p className="text-destructive">Failed to load streams.</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Streams</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {streams?.length ?? 0} stream(s) configured
      </p>
    </div>
  );
}
