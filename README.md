<!-- markdownlint-disable MD033 MD041 -->

<div align="center">

<img src="public/favicon.svg" alt="Open Streamer Console" width="96" height="96" />

# Open Streamer Console

**The web-based control plane for [Open Streamer](https://github.com/ntt0601zcoder/open-streamer).**

_Run, observe, and tune your live streaming infrastructure — from a single browser tab._

[![CI](https://github.com/ntt0601zcoder/open-streamer-console/actions/workflows/ci.yml/badge.svg)](https://github.com/ntt0601zcoder/open-streamer-console/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Backend](https://img.shields.io/badge/backend-Open%20Streamer-0aa)](https://github.com/ntt0601zcoder/open-streamer)
[![Made with React](https://img.shields.io/badge/made%20with-React-149eca.svg)](https://react.dev)

</div>

---

## Overview

Open Streamer Console replaces hand-edited config files and ad-hoc API calls with a friendly,
real-time UI for the Open Streamer media server. Operators get a single place to launch streams,
inspect what's running, wire up integrations, and tune the platform — without ever having to
restart a service.

The console is a pure frontend that speaks to the Open Streamer REST API. Drop it in front of
any Open Streamer deployment and you're ready to go.

---

## ✨ Highlights

- **📊 Dashboard** — see every stream at a glance with live status and traffic indicators.
- **📡 Streams** — create, edit, restart, and remove streams. Configure inputs (with failover),
  outputs, transcoding profiles, and DVR.
- **▶️ Live preview** — watch the running output right in the browser via a built-in HLS player —
  verify quickly without an external player.
- **🔔 Hooks** — wire the platform into your own systems via HTTP or Kafka webhooks, with event
  filters, signing secrets, and one-click test delivery.
- **⚙️ Settings** — manage global server configuration through guided forms — no YAML required.
- **📝 YAML editor** — for power users: edit the entire system configuration as a single YAML
  document with formatting and inline validation.

---

## 🎯 Who it's for

- **Solo broadcasters** who want a UI instead of a config file.
- **Operations teams** running many concurrent live streams who need a control surface that
  scales with them.
- **Anyone** evaluating Open Streamer who wants to drive it through a browser before committing
  to integration work.

---

## 📚 Documentation

- [User guide](docs/user-guide.md) — step-by-step walkthroughs of common
  operator tasks (creating streams, failover, push destinations, transcoding,
  hooks, FFmpeg probe, YAML editor, troubleshooting).
- [Features](docs/features.md) — reference of every screen and capability the
  console exposes, with the matching API surface from the server.

## 🔗 Related

- [Open Streamer](https://github.com/ntt0601zcoder/open-streamer) — the media server this
  console manages. All behaviour, validation, and supported values come from there.
- [API documentation](https://github.com/ntt0601zcoder/open-streamer/tree/main/api/docs) — the
  authoritative REST API schema. Whenever the docs in this repo and the server's API
  disagree, the API wins.

---

## 📌 Status

Active development. The console tracks the Open Streamer API and aims to expose every
production-relevant capability of the backend.

<div align="center">
<sub>Made with care for live streaming.</sub>
</div>
