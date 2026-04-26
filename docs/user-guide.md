# User guide

Practical walkthroughs for the most common operator tasks. Assumes the
console is running and pointed at a working
[Open Streamer](https://github.com/ntt0601zcoder/open-streamer) backend.

For a feature-by-feature reference see [features.md](features.md). For the
authoritative API contract see the
[server API docs](https://github.com/ntt0601zcoder/open-streamer/tree/main/api/docs).

---

## Before you start

- Make sure the server is reachable from the browser (the console talks to it
  directly — there is no backend in the console itself).
- Set `VITE_API_BASE_URL` at build time so the bundle points at the right
  server. See the project [README](../README.md) and the
  [Dockerfile](../Dockerfile).
- The first request the console makes is `GET /config/defaults` — this
  populates form placeholders. If you see literal "default" everywhere
  instead of real values, the endpoint is unreachable; check the server.

---

## 1 · Create your first stream

1. Go to **Streams** → **+ New stream**.
2. **General**: pick a stream `code` (lowercase, dashes/underscores ok). The
   code is the URL slug and cannot be renamed later. Give the stream a
   human-friendly name and optional tags.
3. **Input**: paste the source URL (RTMP / SRT / HLS / RTSP). Open
   **Advanced** if you need to tune connect/read timeouts, allow
   self-signed TLS (`Allow insecure TLS`), or attach HTTP headers / URL
   params (auth tokens, SRT passphrase, S3 keys, …).
4. **Output**: enable the protocols you want the server to publish — at
   minimum HLS so you can preview in the browser. RTMP/RTSP/SRT need the
   matching listener configured under Settings.
5. **Transcoder** (optional): toggle on to re-encode. The defaults are sane
   — leave fields blank to inherit the placeholder values from
   `/config/defaults`. Add multiple **video profiles** to publish an ABR
   ladder (e.g. 1080p / 720p / 480p).
6. **DVR** (optional): enable to archive segments to disk. The storage path
   placeholder shows where the server will write the recording.
7. **Create stream** — the server responds 201 and you land on the detail
   page.

## 2 · Watch a stream live

Open a stream detail page. The **Preview** card auto-plays the live HLS
output once the stream is `active`. The dropdown at the bottom-right of the
player picks a quality (Auto follows ABR; specific levels lock to one
rendition). Output URLs (HLS / DASH / RTMP) sit on the right-hand panel —
click the copy icon to grab them for OBS, VLC, a CDN, etc.

## 3 · Set up failover inputs

1. On the stream detail page → **Input** tab → **+ Add input**.
2. Fill the secondary URL. The first input is primary; subsequent ones are
   tried in order whenever the active input fails or times out.
3. Reorder with the up/down arrows on the left of each row. Save changes.
4. While the stream is live, click **Switch** on any non-active input to
   force the manager to switch. The action is recorded in the **Recent
   input switches** card with the reason (`manual`, `error`, `timeout`,
   `failback`, `recovery`, …).
5. Per-input dot indicators show the live health and the last 5 errors in
   their tooltip — handy for spotting flaky upstreams.

## 4 · Push to YouTube / Twitch / Facebook

1. Stream detail → **Output** tab → **+ Add destination**.
2. Paste the RTMP/RTMPS URL with stream key embedded (e.g.
   `rtmp://a.rtmp.youtube.com/live2/<your-key>`).
3. Toggle **Enabled**. Set **Timeout** / **Retry delay** if the destination
   needs softer/harder retries (placeholders show the server defaults).
4. Save. The destination card collapses to a one-line summary; the dot
   shows the publisher status (`starting`, `active`, `reconnecting`,
   `failed`), uptime, and last 5 errors on hover.

## 5 · Configure transcoding

1. Stream detail → **Transcoder** tab → flip the master switch on.
2. Pick **Hardware accelerator** if you have one (`nvenc`, `vaapi`, `qsv`,
   `videotoolbox`, or `none` for CPU). Leave Device ID at 0 unless the
   host has multiple GPUs.
3. **Audio**: pick a codec (or **Copy** to passthrough). Most setups want
   `aac` at 128 kbps.
4. **Video**: leave **Copy** off to encode. Add one profile per rendition.
   The **Quality preset picker** fills resolution + bitrate + framerate
   based on common live presets.
5. Save. The **Runtime** card surfaces a dot per profile with the FFmpeg
   restart count and recent errors.

> Tip: **Multi-output mode** in Settings → Transcoder runs all profiles
> through a single FFmpeg process (single decode, multiple encodes). Saves
> resources but couples profile failures together.

## 6 · Restart or delete a stream safely

Both Restart and Delete open a **type-to-confirm** dialog. Type the stream
code exactly to enable the destructive button — guards against accidental
clicks during a live broadcast.

## 7 · Wire a webhook

1. Go to **Hooks** → **+ New hook**.
2. Pick **HTTP** (URL target) or **Kafka** (topic name).
3. Filter the events you care about (stream lifecycle, input switching,
   recording, transcoder events, segments). Empty filter = all events.
4. Filter by stream code if needed (`only` or `except`).
5. Add a signing **Secret** (HTTP only) — outbound requests are signed
   with HMAC-SHA256.
6. Save, then click **Test** to deliver a sample event and verify the
   round-trip status.

## 8 · Verify the FFmpeg binary before saving

Go to **Settings → Transcoder**. Type the FFmpeg path (or leave empty for
`$PATH`) and click **Probe FFmpeg**. The dialog shows:

- Resolved binary path and version.
- **Required** encoders — server won't start without these.
- **Optional** encoders — warn-only.
- Muxers (HLS, DASH, MPEG-TS).
- Errors / warnings.

If you change the path, **Save is locked** until the new value has been
probed and the probe reports OK. This is the single guard rail that stops
a path mistake from breaking the entire transcoder pool. Use the **YAML
editor** if you intentionally need to bypass it.

## 9 · Edit the whole config as YAML

Settings header → **YAML editor** (or visit `/settings/yaml`). You get a
single document covering global config, streams and hooks. Save replaces
the entire system state — useful for cloning environments or restoring
backups.

## 10 · Browse and play VOD recordings

`VOD` in the sidebar lists every mount. Open a mount to see folders /
files, click any media file to play in-browser (with HTTP Range so you can
seek). Each player dialog also exposes the play and ingest URLs — drop
the ingest URL into a stream input to re-broadcast a recording.

---

## Troubleshooting

**Form placeholders show literal "default"**
The console didn't get `/config/defaults`. Either the server is older than
the endpoint or the network blocked it — check DevTools → Network.

**Preview won't play even though the stream is `active`**
Confirm HLS is enabled in the Output tab. If the player keeps reconnecting,
peek at the runtime card on the Input tab — the source might be flapping.

**Save button is disabled and Settings → Transcoder shows an amber hint**
You changed the FFmpeg path; click **Probe FFmpeg** and wait for the green
OK badge. Use the YAML editor if you need to bypass.

**Copy buttons do nothing on plain HTTP**
Already handled — the console falls back to a Selection-based copy when
`navigator.clipboard` is gated. If a toast still says "Copy failed",
manually select the URL.

**Stream switches kept happening with reason `timeout`**
Bump `manager.input_packet_timeout_sec` in Settings → Manager. HLS pulls
that deliver in bursts (one segment per read) need this at least as large
as the segment duration.
