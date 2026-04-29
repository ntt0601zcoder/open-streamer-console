import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Stream } from '@/api/types';
import { hlsUrl } from '@/lib/streamUrls';
import { InputBytesChart } from './InputBytesChart';
import { MediaSummaryCard } from './MediaSummaryCard';
import { StreamPlayer } from './StreamPlayer';

interface StreamPreviewProps {
  stream: Stream;
}

export function StreamPreview({ stream }: StreamPreviewProps) {
  const hlsUrl_ = hlsUrl(stream.code);
  const status = stream.runtime?.status;
  const isRunning = status === 'active' || status === 'degraded';
  const hlsEnabled = stream.protocols?.hls ?? false;

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

      {/* Right column: media summary + throughput chart */}
      <div className="flex flex-col gap-3 lg:col-span-2">
        <MediaSummaryCard media={stream.runtime?.media} />
        <div className="min-h-0 flex-1">
          <InputBytesChart streamCode={stream.code} />
        </div>
      </div>
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
