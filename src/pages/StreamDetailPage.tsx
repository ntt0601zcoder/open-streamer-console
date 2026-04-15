import { useParams } from 'react-router-dom';
import { useStream } from '@/features/streams/hooks/useStreams';

export function StreamDetailPage() {
  const { code } = useParams<{ code: string }>();
  const { data: stream, isLoading, error } = useStream(code!);

  if (isLoading) return <p className="text-muted-foreground">Loading stream…</p>;
  if (error) return <p className="text-destructive">Failed to load stream.</p>;
  if (!stream) return null;

  return (
    <div>
      <h1 className="text-2xl font-semibold">{stream.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{stream.code}</p>
    </div>
  );
}
