import { Volume1, Volume2, VolumeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VolumeControlProps {
  /** 0..1 — current playback volume (separate from muted). */
  volume: number;
  muted: boolean;
  onToggleMute: () => void;
  onVolumeChange: (v: number) => void;
}

export function VolumeControl({
  volume,
  muted,
  onToggleMute,
  onVolumeChange,
}: VolumeControlProps) {
  const Icon = muted || volume === 0 ? VolumeOff : volume < 0.5 ? Volume1 : Volume2;
  const effective = muted ? 0 : volume;
  const fillPct = effective * 100;
  return (
    <div className="group/vol relative flex items-center">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20"
        onClick={onToggleMute}
      >
        <Icon className="h-4 w-4" />
      </Button>
      <div className="overflow-hidden transition-[width] duration-150 w-0 group-hover/vol:w-24 ml-0 group-hover/vol:ml-1.5 flex items-center">
        {/* Custom track + fill — drawn with divs so the value=0 case has no
            stray thumb visible. The native <input> sits on top, transparent,
            and handles the actual drag. */}
        <div className="relative h-1 w-24 rounded-full bg-white/25">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white"
            style={{ width: `${fillPct}%` }}
          />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={effective}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
      </div>
    </div>
  );
}
