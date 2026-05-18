import { useState } from 'react';
import { Copy, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { watermarksApi } from '@/api/watermarks';
import type { WatermarkAsset } from '@/api/types';
import { useDeleteWatermark } from '@/features/watermarks/hooks/useWatermarks';
import { copyText } from '@/lib/clipboard';
import { formatBytes, formatRelativeIso } from '@/lib/format';

interface WatermarkAssetCardProps {
  asset: WatermarkAsset;
}

export function WatermarkAssetCard({ asset }: WatermarkAssetCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const remove = useDeleteWatermark();

  function handleDelete() {
    remove.mutate(asset.filename, {
      onSuccess: () => {
        toast.success(`Deleted "${asset.filename}"`);
        setConfirmOpen(false);
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
    });
  }

  async function handleCopyFilename() {
    const ok = await copyText(asset.filename);
    toast[ok ? 'success' : 'error'](ok ? 'Filename copied' : 'Copy failed');
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="aspect-video bg-[repeating-conic-gradient(#888_0_25%,_#aaa_0_50%)] bg-[length:16px_16px] dark:bg-[repeating-conic-gradient(#333_0_25%,_#555_0_50%)]">
          <img
            src={watermarksApi.rawUrl(asset.filename)}
            alt={asset.filename}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        </div>
        <CardContent className="space-y-2 p-3">
          <p
            className="truncate text-sm font-medium font-mono"
            title={asset.filename}
          >
            {asset.filename}
          </p>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{formatBytes(asset.size_bytes)}</span>
            <span>{formatRelativeIso(asset.uploaded_at)}</span>
          </div>
          <div className="flex items-center justify-between gap-1 pt-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 flex-1 font-mono text-[10px]"
                  onClick={() => void handleCopyFilename()}
                >
                  <Copy className="mr-1 h-3 w-3" />
                  Copy filename
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy filename — {asset.filename}</TooltipContent>
            </Tooltip>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete watermark "{asset.filename}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Streams currently referencing this asset will fail to apply the overlay until they
              are reconfigured. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={remove.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {remove.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
