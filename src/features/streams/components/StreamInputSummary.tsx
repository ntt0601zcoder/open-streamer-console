import { toast } from 'sonner';
import type { Input as InputType, InputHealthSnapshot, Stream } from '@/api/types';
import { StreamStatus } from '@/api/types';
import { formatRelativeIso } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useStreamTemplate } from '@/features/streams/hooks/useStreamTemplate';
import { useSwitchInput } from '@/features/streams/hooks/useStreams';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface StreamInputSummaryProps {
  stream: Stream;
}

export function StreamInputSummary({ stream }: StreamInputSummaryProps) {
  const { resolved } = useStreamTemplate(stream);
  const inputs = resolved.inputs;
  const switchInput = useSwitchInput();
  const activeIndex =
    stream.runtime?.override_input_priority ?? stream.runtime?.active_input_priority ?? null;
  const runtimeInputs = stream.runtime?.inputs;
  const streamStatus = stream.runtime?.status;
  const isStreamLive =
    streamStatus === StreamStatus.active || streamStatus === StreamStatus.degraded;

  if (!inputs || inputs.length === 0) {
    return <span className="text-xs text-muted-foreground">No inputs</span>;
  }

  const activeInput = activeIndex !== null ? inputs[activeIndex] : inputs[0];
  // Bitrate snapshot for the active input. Each runtime entry tags itself
  // with `input_priority`, so look it up by that — array order is not
  // guaranteed to mirror the config-side `inputs` order.
  const effectivePriority = activeIndex ?? 0;
  const activeRuntime =
    runtimeInputs?.find((r) => r.input_priority === effectivePriority) ?? runtimeInputs?.[0];
  const activeBitrateKbps = activeRuntime?.bitrate_kbps;

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
      {/* Input URL — full URL preserved (CSS handles overflow); hover for the
          untruncated form. Keeping port + query + userinfo visible matters for
          UDP/SRT sources where `?fifo_size=...` and `iface@host:port` change
          ingest behaviour. */}
      <span
        className="block max-w-[260px] truncate font-mono text-xs text-muted-foreground"
        title={activeInput?.url}
      >
        {activeInput?.url ?? ''}
      </span>

      {/* Input dots + active bitrate */}
      <div className="flex items-center gap-2">
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
        {isStreamLive && activeBitrateKbps != null && (
          // Render even when 0 kbps — a stale "no traffic" reading on a green
          // dot is itself diagnostic. The amber tint flags zero so operators
          // notice without having to read the digits.
          <span
            className={cn(
              'font-mono text-[11px]',
              activeBitrateKbps > 0
                ? 'text-muted-foreground'
                : 'text-amber-600 dark:text-amber-400',
            )}
          >
            {formatBitrateKbps(activeBitrateKbps)}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Compact bitrate label for the active input. Values are normalised so the
 * row stays tight even when the source emits multi-Mbps streams.
 *   600 kbps → "600 kbps"
 *   6491 kbps → "6.49 Mbps"
 */
function formatBitrateKbps(kbps: number): string {
  if (!Number.isFinite(kbps) || kbps <= 0) return '—';
  if (kbps < 1000) return `${kbps} kbps`;
  return `${(kbps / 1000).toFixed(2)} Mbps`;
}

interface InputDotProps {
  input: InputType;
  runtime?: InputHealthSnapshot;
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
  const errors = runtime?.errors ?? [];
  const isDegraded = runtime?.status === 'degraded' || errors.length > 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={!canSwitch || isPending}
          className={cn(
            'h-3 w-3 rounded-full border-2 transition-colors shrink-0',
            isActive && !isDegraded && 'bg-emerald-500 border-emerald-500',
            isActive && isDegraded && 'bg-amber-500 border-amber-500',
            !isActive && isDegraded && 'border-amber-500 bg-amber-500/30',
            !isActive && !isDegraded && 'border-muted-foreground/40 bg-transparent',
            canSwitch && !isPending && 'cursor-pointer hover:border-primary hover:bg-primary/20',
            isPending && 'animate-pulse border-primary bg-primary/30',
            !canSwitch && !isActive && 'cursor-default',
          )}
        />
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[360px] space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium">
            Input {index + 1}
            {isActive ? ' (active)' : ''}
          </p>
          {runtime?.status && (
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {runtime.status}
            </p>
          )}
        </div>
        <p className="font-mono text-[11px] break-all text-muted-foreground">{input.url}</p>
        {runtime && (runtime.bitrate_kbps != null || runtime.packet_loss != null) && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {runtime.bitrate_kbps != null && <span>{runtime.bitrate_kbps} kbps</span>}
            {runtime.packet_loss != null && (
              <span>loss {(runtime.packet_loss * 100).toFixed(1)}%</span>
            )}
          </div>
        )}
        {errors.length > 0 && (
          <ul className="space-y-1">
            {errors.slice(0, 5).map((e, i) => (
              <li key={i} className="rounded border border-amber-500/30 bg-amber-500/10 p-1.5">
                <p className="break-words font-mono text-[11px] leading-snug text-amber-900 dark:text-amber-100">
                  {e.message}
                </p>
                <p className="mt-0.5 text-[10px] text-amber-700/80 dark:text-amber-300/70">
                  {formatRelativeIso(e.at)}
                </p>
              </li>
            ))}
          </ul>
        )}
        {canSwitch && <p className="text-xs text-muted-foreground">Click to switch</p>}
      </TooltipContent>
    </Tooltip>
  );
}

