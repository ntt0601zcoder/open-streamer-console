import { BASE_URL } from '@/api/client';
import type { ServerPorts } from '@/api/config';

const hostname = new URL(BASE_URL).hostname;

export function hlsUrl(code: string) {
  return `${BASE_URL}/${code}/index.m3u8`;
}

export function dashUrl(code: string) {
  return `${BASE_URL}/${code}/index.mpd`;
}

export function mpegtsUrl(code: string) {
  return `${BASE_URL}/${code}/mpegts`;
}

export function rtmpUrl(code: string, ports: ServerPorts | undefined): string | null {
  const port = ports?.rtmp_port;
  if (!port) return null;
  return `rtmp://${hostname}:${port}/live/${code}`;
}

export function rtspUrl(code: string, ports: ServerPorts | undefined): string | null {
  const port = ports?.rtsp_port;
  if (!port) return null;
  return `rtsp://${hostname}:${port}/live/${code}`;
}

export function srtUrl(code: string, ports: ServerPorts | undefined): string | null {
  const port = ports?.srt_port;
  if (!port) return null;
  return `srt://${hostname}:${port}?streamid=live/${code}`;
}
