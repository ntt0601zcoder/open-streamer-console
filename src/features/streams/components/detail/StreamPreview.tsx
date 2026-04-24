import { useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Stream } from '@/api/types';
import { useServerConfig } from '@/features/config/hooks/useServerConfig';
import { copyText } from '@/lib/clipboard';
import { dashUrl, hlsUrl, rtmpUrl } from '@/lib/streamUrls';
import { StreamPlayer } from './StreamPlayer';

interface StreamPreviewProps {
  stream: Stream;
}

export function StreamPreview({ stream }: StreamPreviewProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const { data: serverConfig } = useServerConfig();
  const ports = serverConfig?.ports;

  const hlsUrl_ = hlsUrl(stream.code);
  const status = stream.runtime?.status;
  const pipelineActive = stream.runtime?.pipeline_active;
  const isRunning = status === 'active' || status === 'degraded';
  const hlsEnabled = stream.protocols?.hls ?? false;

  async function copyToClipboard(text: string, key: string) {
    const ok = await copyText(text);
    if (!ok) {
      toast.error('Copy failed — your browser blocked clipboard access');
      return;
    }
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* Player */}
      <Card className="lg:col-span-3">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Preview</CardTitle>
            {isRunning && hlsEnabled && (
              <a
                href={hlsUrl_}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Open in player
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {hlsEnabled ? (
            <StreamPlayer hlsUrl={hlsUrl_} active={isRunning} />
          ) : (
            <NoHlsPlaceholder isRunning={isRunning} />
          )}
        </CardContent>
      </Card>

      {/* Runtime info */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Runtime info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Static stream info */}
          <div className="space-y-2 text-sm">
            <InfoRow
              label="Code"
              value={<span className="font-mono text-xs">{stream.code}</span>}
            />
            {stream.stream_key && (
              <InfoRow
                label="Stream key"
                value={
                  <span
                    className="font-mono text-xs truncate max-w-[120px]"
                    title={stream.stream_key}
                  >
                    {stream.stream_key}
                  </span>
                }
              />
            )}
            {stream.description && (
              <InfoRow
                label="Description"
                value={<span className="text-xs text-right">{stream.description}</span>}
              />
            )}
          </div>

          {/* Pipeline active */}
          {pipelineActive != null && (
            <div className="border-t pt-3">
              <InfoRow
                label="Pipeline active"
                value={
                  <span
                    className={`font-mono text-xs font-medium ${pipelineActive ? 'text-emerald-500' : 'text-muted-foreground'}`}
                  >
                    {pipelineActive ? 'true' : 'false'}
                  </span>
                }
              />
            </div>
          )}

          {/* Output URLs */}
          {isRunning && (
            <div className="space-y-1.5 border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Output URLs</p>
              {hlsEnabled && (
                <UrlRow
                  label="HLS"
                  url={hlsUrl_}
                  copied={copied === 'hls'}
                  onCopy={() => void copyToClipboard(hlsUrl_, 'hls')}
                />
              )}
              {stream.protocols?.dash && (
                <UrlRow
                  label="DASH"
                  url={dashUrl(stream.code)}
                  copied={copied === 'dash'}
                  onCopy={() => void copyToClipboard(dashUrl(stream.code), 'dash')}
                />
              )}
              {stream.protocols?.rtmp && rtmpUrl(stream.code, ports) && (
                <UrlRow
                  label="RTMP"
                  url={rtmpUrl(stream.code, ports)!}
                  copied={copied === 'rtmp'}
                  onCopy={() => void copyToClipboard(rtmpUrl(stream.code, ports)!, 'rtmp')}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function NoHlsPlaceholder({ isRunning }: { isRunning: boolean }) {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-md bg-muted text-muted-foreground">
      <p className="text-sm">
        {isRunning ? 'HLS not enabled for this stream' : 'Stream not running'}
      </p>
      <p className="text-xs">Enable HLS in the Output tab to view the live preview</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="shrink-0 text-xs capitalize text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

interface UrlRowProps {
  label: string;
  url: string;
  copied: boolean;
  onCopy: () => void;
}

function UrlRow({ label, url, copied, onCopy }: UrlRowProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Badge variant="outline" className="h-4 w-10 justify-center px-1 text-[10px] shrink-0">
        {label}
      </Badge>
      <span className="flex-1 truncate font-mono text-[10px] text-muted-foreground" title={url}>
        {url}
      </span>
      <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={onCopy}>
        <Copy className={`h-3 w-3 ${copied ? 'text-emerald-500' : ''}`} />
      </Button>
    </div>
  );
}
