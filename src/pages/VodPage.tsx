import { useState } from 'react';
import { Folder, HardDrive, Pencil, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BASE_URL } from '@/api/client';
import type { VODMount } from '@/api/vod';
import { VodMountDialog } from '@/features/vod/components/VodMountDialog';
import { useDeleteVodMount, useVodMounts } from '@/features/vod/hooks/useVod';

export function VodPage() {
  const { data: mounts = [], isLoading, error } = useVodMounts();
  const deleteMount = useDeleteVodMount();
  const [dialogMount, setDialogMount] = useState<VODMount | null | 'new'>(null);

  function handleDelete(name: string) {
    if (!confirm(`Delete VOD mount "${name}"? Files on disk are kept.`)) return;
    deleteMount.mutate(name, {
      onSuccess: () => toast.success('Mount deleted'),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">VOD</h1>
          {!isLoading && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {mounts.length} mount{mounts.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button size="sm" className="gap-2" onClick={() => setDialogMount('new')}>
          <Plus className="h-4 w-4" />
          New mount
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load VOD mounts. Make sure the Open Streamer server is running at{' '}
          <code className="font-mono">{BASE_URL}</code>.
        </div>
      ) : isLoading ? (
        <div className="rounded-md border divide-y">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="ml-auto h-4 w-32 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : mounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground rounded-md border">
          <HardDrive className="h-8 w-8" />
          <p className="text-sm">No VOD mounts configured yet</p>
          <Button variant="outline" size="sm" onClick={() => setDialogMount('new')}>
            Create your first mount
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Storage</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead className="w-[160px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {mounts.map((mount) => (
                <TableRow key={mount.name}>
                  <TableCell>
                    <Link
                      to={`/vod/${encodeURIComponent(mount.name)}`}
                      className="flex items-center gap-2 font-medium hover:underline"
                    >
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      {mount.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground" title={mount.storage}>
                      {mount.storage}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{mount.comment || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setDialogMount(mount)}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(mount.name)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {dialogMount !== null && (
        <VodMountDialog
          mount={dialogMount === 'new' ? null : dialogMount}
          onClose={() => setDialogMount(null)}
        />
      )}
    </div>
  );
}
