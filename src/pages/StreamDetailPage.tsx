import { useParams } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StreamDetailHeader } from '@/features/streams/components/detail/StreamDetailHeader';
import { StreamPreview } from '@/features/streams/components/detail/StreamPreview';
import { DvrTab } from '@/features/streams/components/detail/tabs/DvrTab';
import { GeneralTab } from '@/features/streams/components/detail/tabs/GeneralTab';
import { InputTab } from '@/features/streams/components/detail/tabs/InputTab';
import { OutputTab } from '@/features/streams/components/detail/tabs/OutputTab';
import { SessionsTab } from '@/features/streams/components/detail/tabs/SessionsTab';
import { TranscoderTab } from '@/features/streams/components/detail/tabs/TranscoderTab';
import { WatermarkTab } from '@/features/streams/components/detail/tabs/WatermarkTab';
import { useStream } from '@/features/streams/hooks/useStreams';

export function StreamDetailPage() {
  const { code } = useParams<{ code: string }>();
  const { data: stream, isLoading, error } = useStream(code!);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-56 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load stream. Make sure the stream code is correct and the server is running.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <StreamDetailHeader stream={stream} />

      <Separator />

      <StreamPreview stream={stream} />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="input">Input</TabsTrigger>
          <TabsTrigger value="output">Output</TabsTrigger>
          <TabsTrigger value="transcoder">Transcoder</TabsTrigger>
          <TabsTrigger value="dvr">DVR</TabsTrigger>
          <TabsTrigger value="watermark">Watermark</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <GeneralTab stream={stream} />
        </TabsContent>

        <TabsContent value="input" className="mt-6">
          <InputTab stream={stream} />
        </TabsContent>

        <TabsContent value="output" className="mt-6">
          <OutputTab stream={stream} />
        </TabsContent>

        <TabsContent value="transcoder" className="mt-6">
          <TranscoderTab stream={stream} />
        </TabsContent>

        <TabsContent value="dvr" className="mt-6">
          <DvrTab stream={stream} />
        </TabsContent>

        <TabsContent value="watermark" className="mt-6">
          <WatermarkTab stream={stream} />
        </TabsContent>

        <TabsContent value="sessions" className="mt-6">
          <SessionsTab stream={stream} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
