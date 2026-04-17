import { toast } from 'sonner';
import type { Input as InputType, InputRuntimeInfo, Stream } from '@/api/types';
import { StreamStatus } from '@/api/types';
import { cn } from '@/lib/utils';
import { useSwitchInput } from '@/features/streams/hooks/useStreams';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface StreamInputSummaryProps {
  stream: Stream;
}

export function StreamInputSummary({ stream }: StreamInputSummaryProps) {
  const inputs = stream.inputs;
  const switchInput = useSwitchInput();
  const activeIndex =
    stream.runtime?.override_input_priority ?? stream.runtime?.active_input_priority ?? null;
  const runtimeInputs = stream.runtime?.inputs;
  const isStreamLive =
    stream.status === StreamStatus.active || stream.status === StreamStatus.degraded;

  if (!inputs || inputs.length === 0) {
    return <span className="text-xs text-muted-foreground">No inputs</span>;
  }

  const activeInput = activeIndex !== null ? inputs[activeIndex] : inputs[0];

  function handleSwitch(priority: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!isStreamLive) return;
    if (priority === activeIndex) return;
    switchInput.mutate(
      { code: stream.code, priority },
      {
        onSuccess: () => toast.success(`Switched to input ${priority + 1}`),
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Switch failed'),
      },
    );
  }

  return (
    <div className="space-y-1">
      {/* Input URL */}
      <span
        className="block max-w-[220px] truncate font-mono text-xs text-muted-foreground"
        title={activeInput?.url}
      >
        {shortenUrl(activeInput?.url ?? '')}
      </span>

      {/* Input dots */}
      <div className="flex items-center gap-1">
        {inputs.map((inp, i) => (
          <InputDot
            key={i}
            input={inp}
            runtime={runtimeInputs?.[i]}
            index={i}
            isActive={i === activeIndex}
            canSwitch={isStreamLive && i !== activeIndex}
            isPending={switchInput.isPending && switchInput.variables?.priority === i}
            onClick={(e) => handleSwitch(i, e)}
          />
        ))}
      </div>
    </div>
  );
}

interface InputDotProps {
  input: InputType;
  runtime?: InputRuntimeInfo;
  index: number;
  isActive: boolean;
  canSwitch: boolean;
  isPending: boolean;
  onClick: (e: React.MouseEvent) => void;
}

function InputDot({
  input,
  runtime,
  index,
  isActive,
  canSwitch,
  isPending,
  onClick,
}: InputDotProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={!canSwitch || isPending}
          className={cn(
            'h-3 w-3 rounded-full border-2 transition-colors shrink-0',
            isActive
              ? 'bg-emerald-500 border-emerald-500'
              : 'border-muted-foreground/40 bg-transparent',
            canSwitch && !isPending && 'cursor-pointer hover:border-primary hover:bg-primary/20',
            isPending && 'animate-pulse border-primary bg-primary/30',
            !canSwitch && !isActive && 'cursor-default',
          )}
        />
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[300px] space-y-1">
        <p className="text-xs font-medium">
          Input {index + 1}
          {isActive ? ' (active)' : ''}
        </p>
        <p className="font-mono text-xs break-all text-muted-foreground">{input.url}</p>
        {runtime && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 pt-0.5 text-xs text-muted-foreground">
            {runtime.bitrate_kbps != null && <span>{runtime.bitrate_kbps} kbps</span>}
            {runtime.packet_loss != null && (
              <span>loss {(runtime.packet_loss * 100).toFixed(1)}%</span>
            )}
            {runtime.status && (
              <span
                className={runtime.status === 'connected' ? 'text-emerald-400' : 'text-amber-400'}
              >
                {runtime.status}
              </span>
            )}
          </div>
        )}
        {canSwitch && <p className="text-xs text-muted-foreground">Click to switch</p>}
      </TooltipContent>
    </Tooltip>
  );
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}${u.pathname}`.replace(/(.{35}).*$/, '$1…');
  } catch {
    return url.length > 38 ? url.slice(0, 38) + '…' : url;
  }
}
