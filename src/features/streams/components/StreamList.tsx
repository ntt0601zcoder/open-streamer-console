import { AlertCircle, Radio } from 'lucide-react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Stream } from '@/api/types';
import { StreamRow } from './StreamRow';

interface StreamListProps {
  streams: Stream[];
  filter: string;
}

export function StreamList({ streams, filter }: StreamListProps) {
  const filtered = filter.trim()
    ? streams.filter(
        (s) =>
          s.name.toLowerCase().includes(filter.toLowerCase()) ||
          s.code.toLowerCase().includes(filter.toLowerCase()) ||
          s.tags?.some((t) => t.toLowerCase().includes(filter.toLowerCase())),
      )
    : streams;

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        {filter ? (
          <>
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm">No streams match "{filter}"</p>
          </>
        ) : (
          <>
            <Radio className="h-8 w-8" />
            <p className="text-sm">No streams configured yet</p>
          </>
        )}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[200px]">Stream</TableHead>
          <TableHead className="w-[90px]">Status</TableHead>
          <TableHead className="w-[200px]">Input</TableHead>
          <TableHead className="w-[180px]">Output</TableHead>
          <TableHead className="w-[80px]">DVR</TableHead>
          <TableHead className="hidden lg:table-cell">Tags</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.map((stream) => (
          <StreamRow key={stream.code} stream={stream} />
        ))}
      </TableBody>
    </Table>
  );
}
