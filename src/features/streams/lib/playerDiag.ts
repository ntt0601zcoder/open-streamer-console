/**
 * In-memory ring buffer of player events (hls.js / dash.js / <video>) used for
 * troubleshooting. The active stream-detail player exposes its instance as
 * `window.__osPlayerDiag` so external tooling (e.g. a Playwright check) can
 * read `events()`. `t` is `Date.now()` (wall clock, comparable with server logs).
 * `detail` never contains URL query strings (playback tokens may live there).
 */
export type DiagKind =
  | 'hls_error'
  | 'dash_error'
  | 'recover'
  | 'retry'
  | 'level_switch'
  | 'video_error'
  | 'stall'
  | 'state';

export interface DiagEvent {
  t: number;
  kind: DiagKind;
  fatal?: boolean;
  detail: string;
}

export interface PlayerDiag {
  record(e: DiagEvent): void;
  events(): DiagEvent[];
  toJSON(): string;
}

declare global {
  interface Window {
    __osPlayerDiag?: PlayerDiag;
  }
}

export function createPlayerDiag(capacity = 500): PlayerDiag {
  let buf: DiagEvent[] = [];
  return {
    record(e) {
      buf.push({ ...e });
      if (buf.length > capacity) buf = buf.slice(buf.length - capacity);
    },
    events: () => buf.slice(),
    toJSON: () => JSON.stringify(buf),
  };
}

/** Drop query string and fragment so tokens never reach diagnostics. */
export function stripQuery(url: string): string {
  return url.split('#')[0].split('?')[0];
}

/** Strip query/fragment from every http(s) URL embedded in free text. */
export function scrubUrls(text: string): string {
  return text.replace(/https?:\/\/\S+/gi, (u) => stripQuery(u));
}

/** Record a diagnostic event stamped with the current wall-clock time. */
export function recordNow(
  diag: PlayerDiag | null | undefined,
  kind: DiagKind,
  detail: string,
  fatal?: boolean,
): void {
  diag?.record({
    t: Date.now(),
    kind,
    detail: scrubUrls(detail),
    ...(fatal === undefined ? {} : { fatal }),
  });
}

/** Publish `diag` as the active player's buffer (replacing any stale one). */
export function installPlayerDiag(diag: PlayerDiag): void {
  if (typeof window !== 'undefined') window.__osPlayerDiag = diag;
}

/** Clear the global only if it is still ours (a newer player may have replaced it). */
export function uninstallPlayerDiag(diag: PlayerDiag): void {
  if (typeof window !== 'undefined' && window.__osPlayerDiag === diag) {
    delete window.__osPlayerDiag;
  }
}

interface HlsErrorLike {
  type?: string;
  details?: string;
  fatal?: boolean;
  url?: string;
  response?: { code?: number };
}

/** Handler factory for `Hls.Events.ERROR`: records every error, fatal or not. */
export function hlsErrorRecorder(diag: PlayerDiag) {
  return (_event: unknown, data: HlsErrorLike): void => {
    const parts = [data.type, data.details].filter(Boolean).join('/');
    const extra = [
      data.response?.code != null ? `http=${data.response.code}` : '',
      data.url ? stripQuery(data.url) : '',
    ]
      .filter(Boolean)
      .join(' ');
    recordNow(diag, 'hls_error', extra ? `${parts} ${extra}` : parts, !!data.fatal);
  };
}

/**
 * Map a dash.js ERROR event to a diagnostic payload. `message` is the
 * human-readable text (also used by the console UI). `fatal` is only set when
 * dash.js itself marks the event fatal; otherwise it is left undefined (unknown).
 */
export function dashErrorInfo(e: unknown): { message: string; detail: string; fatal?: boolean } {
  const obj = (e ?? {}) as {
    fatal?: unknown;
    message?: unknown;
    event?: { message?: unknown };
    error?: { code?: unknown; message?: unknown; fatal?: unknown } | string;
  };
  const inner = typeof obj.error === 'object' && obj.error ? obj.error : undefined;
  const candidates = [
    inner?.message,
    typeof obj.error === 'string' ? obj.error : undefined,
    obj.event?.message,
    obj.message,
  ];
  const message =
    candidates.find((m): m is string => typeof m === 'string' && m.length > 0) ?? 'DASH error';
  const code = inner?.code != null ? String(inner.code) : '?';
  const flag = typeof inner?.fatal === 'boolean' ? inner.fatal : obj.fatal;
  return {
    message,
    detail: `code=${code} ${message}`,
    ...(typeof flag === 'boolean' ? { fatal: flag } : {}),
  };
}
