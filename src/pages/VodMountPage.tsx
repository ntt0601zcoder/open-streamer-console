import { useState } from 'react';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { VodFileBrowser } from '@/features/vod/components/VodFileBrowser';
import { VodMountDialog } from '@/features/vod/components/VodMountDialog';
import { useDeleteVodMount, useVodMount } from '@/features/vod/hooks/useVod';

export function VodMountPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { data: mount, isLoading, error } = useVodMount(name);
  const deleteMount = useDeleteVodMount();
  const [editing, setEditing] = useState(false);

  function handleDelete() {
    if (!name) return;
    if (!confirm(`Delete VOD mount "${name}"? Files on disk are kept.`)) return;
    deleteMount.mutate(name, {
      onSuccess: () => {
        toast.success('Mount deleted');
        navigate('/vod');
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
    });
  }

  if (!name) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/vod"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All mounts
        </Link>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load mount: {error instanceof Error ? error.message : 'unknown error'}
        </div>
      ) : isLoading || !mount ? (
        <div className="space-y-2">
          <div className="h-7 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold">{mount.name}</h1>
              <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                {mount.storage}
              </p>
              {mount.comment && (
                <p className="mt-1 text-sm text-muted-foreground">{mount.comment}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 text-muted-foreground hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>

          <VodFileBrowser mountName={mount.name} />
        </>
      )}

      {editing && mount && <VodMountDialog mount={mount} onClose={() => setEditing(false)} />}
    </div>
  );
}
