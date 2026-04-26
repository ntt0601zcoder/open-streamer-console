# Features

Reference of every screen and capability the console exposes. The console is a
thin frontend over the [Open Streamer](https://github.com/ntt0601zcoder/open-streamer)
REST API; behaviour, validation, and supported values come from the server. See
the [API documentation](https://github.com/ntt0601zcoder/open-streamer/tree/main/api/docs)
for the authoritative schema.

---

## Dashboard

Single-page overview of every registered stream.

- Live counts: total streams, active, degraded, idle/stopped.
- Status colour comes from `runtime.status` (`active` / `degraded` / `idle` /
  `stopped`); pipeline-exhausted streams render in red.
- Polling: `useStreams` refetches every 4 s — no WebSocket required.

## Streams

### List page (`/streams`)

- Each row shows code, name, status badge, input dot (with switch history in
  tooltip), transcoder summary (codec + rendition count), DVR state and the
  protocols enabled for output. Push destinations show `<active>/<configured>`
  using the publisher runtime, not the persisted config.
- Action buttons (Start/Restart and Delete) open a type-to-confirm dialog —
  the operator must type the stream code before the destructive action runs.

### Create stream (`/streams/new`)

Wizard-style tabs (General → Input → Output → Transcoder → DVR) backed by Zod
schemas. The form sends a single `POST /streams/{code}` request that creates
or partial-updates depending on whether the code already exists.

### Stream detail (`/streams/<code>`)

Tabbed editor. Each tab fetches the fresh stream document, renders the
relevant config block, and saves a partial update on submit.

#### Preview tab

- HLS player (hls.js) tuned for live playback: 30 s forward buffer, 30 s back
  buffer, aggressive nudging for MSE stalls, `liveSyncDurationCount=3`.
- Quality selector dropdown (Auto + every level reported by the manifest).
- Stall watchdog: if `waiting` persists > 3 s and the buffer has data ahead,
  nudges currentTime; if the buffer is empty, snaps to `liveSyncPosition`.
- Output URL list with one-click copy (works on plain HTTP via Selection API
  fallback for browsers that gate `navigator.clipboard`).

#### Input tab

- Multiple inputs with priority ordering and drag-style up/down buttons.
- Per-input runtime dot (green/amber/red) based on `runtime.inputs[i].status`
  plus the last 5 errors in the tooltip.
- Manual switch button when the stream is live.
- Recent switch history card listing reason (initial / error / timeout /
  manual / failback / recovery / input added / input removed) with icons.
- Advanced section: reconnect toggle, all `net.*` timeouts, an
  `Allow insecure TLS` switch, and key/value editors for `headers` and
  `params` (HTTP auth, SRT passphrase, S3 credentials, …).

#### Output tab

- Boolean toggles for HLS / DASH / RTMP / RTSP / SRT.
- Output URLs (HLS / DASH / RTMP) with copy buttons.
- Push destinations as collapsible cards, each showing the runtime dot,
  uptime, error count and a tooltip with the last 5 publisher errors.

#### Transcoder tab

- Master enable toggle.
- Per-stream **Runtime** card: one dot per profile with restart count and
  the last 5 FFmpeg errors in the tooltip.
- Hardware accelerator + device ID + GOP + audio config (codec, bitrate,
  channels, sample rate, normalize).
- Video block:
  - Copy/passthrough switch.
  - Interlace handling (`auto` / `progressive` / `tff` / `bff`).
  - **Profiles editor**: collapsible cards with quality preset picker
    (480p/720p/1080p/…), resolution, bitrate, max bitrate, framerate, keyframe
    interval, codec, preset, profile, level, B-frames, refs, SAR, resize mode
    (pad/crop/stretch/fit). The empty-string-vs-zero distinction is preserved
    for `bframes` and `refs` (`undefined` means encoder default; `0` means
    explicitly none).

#### DVR tab

- Enable toggle, retention, segment duration, max size, storage path.
- Storage path placeholder is the server's
  `dvr.storage_path_template` with `{streamCode}` substituted by the actual
  stream code.

## VOD

- List of mounts (`/vod`) with create/edit/delete dialogs.
- File browser inside a mount (folders + media files).
- Inline player for playable files; copy buttons for the play and ingest
  URLs.

## Hooks

- HTTP and Kafka hooks with event type filter, stream code filter (`only`
  vs `except`), max retries, timeout, signing secret, and metadata
  key-value pairs.
- One-click **Test** delivers a sample event and surfaces the round-trip
  status.

## Settings

Tabbed form for the global server configuration. Every change is a partial
update (`POST /config`) — services start/stop in place, no restart needed.

Sections: **Server** (HTTP + CORS), **Listeners** (RTMP/RTSP/SRT shared
ports), **Ingestor**, **HLS** publisher, **DASH** publisher, **Transcoder**
(FFmpeg path + multi-output toggle), **Manager**, **Hooks** (Kafka brokers
+ worker count), **Buffer**, **Logging**.

### FFmpeg probe

Settings → Transcoder → **Probe FFmpeg** opens a dialog that calls
`POST /config/transcoder/probe` against whatever path is in the input field
(even unsaved). The result lists:

- Resolved binary path + version.
- Required encoders (must be present, server fails without them).
- Optional encoders (warn-only).
- Muxers (HLS, DASH, MPEG-TS, …).
- Errors and warnings reported by the probe.

If the operator changes the FFmpeg path, **Save is gated** until the current
value has been probed and the probe reports `ok: true`. This prevents
saving a path the server can't actually run.

### YAML editor

`Settings → YAML editor` (also at `/settings/yaml`) is the escape hatch:
edit the entire system config — global config, streams, hooks — as one YAML
document. Round-trips with `GET / PUT /config/yaml`. Bypasses every
form-level validation gate (including the FFmpeg probe gate).

### `/config/defaults`

The console fetches `/config/defaults` once on mount and uses the values as
form placeholders. When you leave a field blank, the placeholder shows
exactly what the server will substitute (e.g. `ffmpeg`, `2`, `pad`,
`./out/dvr/<code>`, `0.0.0.0`).

## Player

Built into the stream detail Preview tab — see [Preview tab](#preview-tab)
above. Uses [hls.js](https://github.com/video-dev/hls.js/) on browsers
without native HLS, and the native player on Safari/iOS.

## Theming

Sidebar footer has a Light / Dark / System theme toggle (powered by
`next-themes` with `attribute="class"` so Tailwind's `dark:` variants
apply). The choice persists via `localStorage`.

## Server version

The sidebar footer shows the server version pulled from
`GET /config` (`apidocs.ConfigData.version`). Hover for commit and build
timestamp.
