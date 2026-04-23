export interface TranscodePreset {
  id: string;
  label: string;
  width: number;
  height: number;
  video_bitrate: number;
  audio_bitrate: number;
  framerate: number;
}

export const TRANSCODE_PRESETS: readonly TranscodePreset[] = [
  {
    id: '4k',
    label: '4K UHD (2160p)',
    width: 3840,
    height: 2160,
    video_bitrate: 15000,
    audio_bitrate: 192,
    framerate: 30,
  },
  {
    id: '2k',
    label: '2K QHD (1440p)',
    width: 2560,
    height: 1440,
    video_bitrate: 8000,
    audio_bitrate: 160,
    framerate: 30,
  },
  {
    id: 'fhd',
    label: 'FHD (1080p)',
    width: 1920,
    height: 1080,
    video_bitrate: 4500,
    audio_bitrate: 128,
    framerate: 30,
  },
  {
    id: 'hd',
    label: 'HD (720p)',
    width: 1280,
    height: 720,
    video_bitrate: 2500,
    audio_bitrate: 128,
    framerate: 30,
  },
  {
    id: 'ls',
    label: 'LS (480p)',
    width: 854,
    height: 480,
    video_bitrate: 1200,
    audio_bitrate: 96,
    framerate: 30,
  },
  {
    id: 'sd',
    label: 'SD (360p)',
    width: 640,
    height: 360,
    video_bitrate: 800,
    audio_bitrate: 96,
    framerate: 30,
  },
];

export function findPresetMatch(
  width?: number,
  height?: number,
  video_bitrate?: number,
): TranscodePreset | undefined {
  return TRANSCODE_PRESETS.find(
    (p) => p.width === width && p.height === height && p.video_bitrate === video_bitrate,
  );
}
