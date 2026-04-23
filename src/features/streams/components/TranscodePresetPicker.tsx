import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  findPresetMatch,
  TRANSCODE_PRESETS,
  type TranscodePreset,
} from '@/features/streams/lib/transcodePresets';

interface TranscodePresetPickerProps {
  width: number | undefined;
  height: number | undefined;
  bitrate: number | undefined;
  onApply: (preset: TranscodePreset) => void;
}

export function TranscodePresetPicker({
  width,
  height,
  bitrate,
  onApply,
}: TranscodePresetPickerProps) {
  const matched = findPresetMatch(width, height, bitrate);
  const [selected, setSelected] = useState<string>(matched?.id ?? 'custom');

  useEffect(() => {
    setSelected(matched?.id ?? 'custom');
  }, [matched]);

  function handleChange(id: string) {
    setSelected(id);
    if (id === 'custom') return;
    const preset = TRANSCODE_PRESETS.find((p) => p.id === id);
    if (preset) onApply(preset);
  }

  return (
    <div className="flex items-end gap-3 rounded-md border bg-muted/30 p-3">
      <div className="flex-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Quality preset
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Fills resolution, bitrate and fps. Editing any of those fields manually switches to
          Custom.
        </p>
      </div>
      <Select value={selected} onValueChange={handleChange}>
        <SelectTrigger className="w-[220px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="custom">Custom</SelectItem>
          {TRANSCODE_PRESETS.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.label} — {p.video_bitrate / 1000} Mbps
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
