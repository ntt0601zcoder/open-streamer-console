import { useState } from 'react';
import { ImagePlus, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WatermarkAssetCard } from '@/features/watermarks/components/WatermarkAssetCard';
import { WatermarkUploadDialog } from '@/features/watermarks/components/WatermarkUploadDialog';
import { useWatermarkAssets } from '@/features/watermarks/hooks/useWatermarks';

export function WatermarksPage() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const { data, isLoading, error, refetch, isRefetching } = useWatermarkAssets();
  const assets = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Watermarks</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Shared image library used for stream overlays. Reference an asset by ID in any stream's
            Watermark tab.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-9 w-9"
            onClick={() => void refetch()}
            disabled={isRefetching}
            title="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
          </Button>
          <Button onClick={() => setUploadOpen(true)}>
            <ImagePlus className="mr-2 h-4 w-4" />
            Upload watermark
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load watermarks'}
        </div>
      )}

      {isLoading && !data && (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading watermarks…
        </div>
      )}

      {data && assets.length === 0 && (
        <div className="rounded-md border border-dashed py-16 text-center">
          <ImagePlus className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">No watermarks yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload a PNG/JPG/GIF to start overlaying logos on your streams.
          </p>
        </div>
      )}

      {assets.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {assets.map((asset) => (
            <WatermarkAssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}

      <WatermarkUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
