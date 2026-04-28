import { useEffect, useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUploadWatermark } from '@/features/watermarks/hooks/useWatermarks';
import { formatBytes } from '@/lib/format';

const ACCEPT = 'image/png,image/jpeg,image/gif';
const MAX_BYTES = 8 * 1024 * 1024;

interface WatermarkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WatermarkUploadDialog({ open, onOpenChange }: WatermarkUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadWatermark();

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setName('');
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [open]);

  function handleFile(f: File | null) {
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error(`Image too large (${formatBytes(f.size)}). Max 8 MiB.`);
      return;
    }
    setFile(f);
  }

  function handleSubmit() {
    if (!file) return;
    upload.mutate(
      { file, name: name.trim() || undefined },
      {
        onSuccess: (res) => {
          toast.success(`Uploaded "${res.data.name}"`);
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Upload failed'),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload watermark</DialogTitle>
          <DialogDescription>
            PNG, JPG or GIF. Max 8 MiB. Transparent PNG is recommended for overlays.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="watermark-file">Image file</Label>
            <Input
              id="watermark-file"
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} · {formatBytes(file.size)}
              </p>
            )}
          </div>

          {previewUrl && (
            <div className="rounded-md border bg-[repeating-conic-gradient(#888_0_25%,_#aaa_0_50%)] bg-[length:16px_16px] p-3 dark:bg-[repeating-conic-gradient(#333_0_25%,_#555_0_50%)]">
              <img
                src={previewUrl}
                alt="preview"
                className="mx-auto max-h-40 object-contain"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="watermark-name">Display name (optional)</Label>
            <Input
              id="watermark-name"
              placeholder={file?.name ?? 'Defaults to file name'}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!file || upload.isPending}>
            {upload.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
