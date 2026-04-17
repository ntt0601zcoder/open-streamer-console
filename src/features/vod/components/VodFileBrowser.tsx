import { useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  File as FileIcon,
  Folder,
  Loader2,
  Play,
  Trash2,
  Upload,
} from 'lucide-react';
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
import type { VODFileEntry } from '@/api/vod';
import { formatBytes, formatRelativeTime } from '@/lib/format';
import { useDeleteVodFile, useUploadVodFile, useVodFiles } from '../hooks/useVod';
import { VodPlayerDialog } from './VodPlayerDialog';

interface VodFileBrowserProps {
  mountName: string;
}

export function VodFileBrowser({ mountName }: VodFileBrowserProps) {
  const [path, setPath] = useState('');
  const [playFile, setPlayFile] = useState<VODFileEntry | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, error } = useVodFiles(mountName, path);
  const uploadFile = useUploadVodFile(mountName);
  const deleteFile = useDeleteVodFile(mountName);

  const segments = path.split('/').filter(Boolean);

  function navigateTo(next: string) {
    setPath(next);
  }

  function handleEntryClick(entry: VODFileEntry) {
    if (entry.is_dir) {
      navigateTo(entry.path);
    } else if (isPlayable(entry.name)) {
      setPlayFile(entry);
    }
  }

  function handleDelete(entry: VODFileEntry) {
    const label = entry.is_dir ? 'directory' : 'file';
    if (!confirm(`Delete ${label} "${entry.path}"? This cannot be undone.`)) return;
    deleteFile.mutate(entry.path, {
      onSuccess: () => toast.success(`${label[0].toUpperCase()}${label.slice(1)} deleted`),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
    });
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    files.forEach((file) => {
      uploadFile.mutate(
        { file, path },
        {
          onSuccess: () => toast.success(`Uploaded "${file.name}"`),
          onError: (err) =>
            toast.error(
              `Upload "${file.name}" failed: ${err instanceof Error ? err.message : 'unknown'}`,
            ),
        },
      );
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Breadcrumb segments={segments} onNavigate={navigateTo} />
        <div className="ml-auto flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelected}
          />
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadFile.isPending}
          >
            {uploadFile.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload
          </Button>
        </div>
      </div>

      {/* Content */}
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to list files: {error instanceof Error ? error.message : 'unknown error'}
        </div>
      ) : isLoading ? (
        <FileListSkeleton />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[120px]">Size</TableHead>
                <TableHead className="w-[140px]">Modified</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {path && (
                <TableRow className="cursor-pointer" onClick={() => navigateTo(parentPath(path))}>
                  <TableCell colSpan={4}>
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ArrowLeft className="h-4 w-4" />
                      Up to parent
                    </span>
                  </TableCell>
                </TableRow>
              )}
              {(data?.data ?? []).length === 0 && !path && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    Empty mount — upload a file to get started.
                  </TableCell>
                </TableRow>
              )}
              {(data?.data ?? []).map((entry) => (
                <TableRow
                  key={entry.path}
                  className={entry.is_dir || isPlayable(entry.name) ? 'cursor-pointer' : ''}
                  onClick={() => handleEntryClick(entry)}
                >
                  <TableCell>
                    <span className="flex items-center gap-2">
                      {entry.is_dir ? (
                        <Folder className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <FileIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{entry.name}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {entry.is_dir ? '—' : formatBytes(entry.size)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(entry.mod_time_unix)}
                    </span>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {!entry.is_dir && isPlayable(entry.name) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setPlayFile(entry)}
                          title="Play"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(entry)}
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

      {playFile && (
        <VodPlayerDialog mountName={mountName} file={playFile} onClose={() => setPlayFile(null)} />
      )}
    </div>
  );
}

function Breadcrumb({
  segments,
  onNavigate,
}: {
  segments: string[];
  onNavigate: (path: string) => void;
}) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm">
      <button
        type="button"
        onClick={() => onNavigate('')}
        className="rounded-md px-2 py-1 hover:bg-muted"
      >
        root
      </button>
      {segments.map((seg, i) => {
        const path = segments.slice(0, i + 1).join('/');
        const isLast = i === segments.length - 1;
        return (
          <span key={path} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              type="button"
              onClick={() => onNavigate(path)}
              className={
                isLast ? 'rounded-md px-2 py-1 font-medium' : 'rounded-md px-2 py-1 hover:bg-muted'
              }
            >
              {seg}
            </button>
          </span>
        );
      })}
    </nav>
  );
}

function FileListSkeleton() {
  return (
    <div className="rounded-md border divide-y">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <div className="h-4 w-4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function parentPath(path: string): string {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? '' : path.slice(0, idx);
}

const PLAYABLE = /\.(mp4|m4v|mov|webm|mkv|m3u8|mpd|mp3|aac|ogg|wav|flac)$/i;
function isPlayable(name: string): boolean {
  return PLAYABLE.test(name);
}
