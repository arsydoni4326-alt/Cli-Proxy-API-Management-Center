# Changelog

All notable changes to the CLI Proxy API Management Center are documented in
this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Until the first `vX.Y.Z` tag is cut, entries are grouped by merge date under
`Unreleased`. The UI version shown on the System page is injected at build
time, so dates and commit ranges — not `package.json` — are the authoritative
references here.

> **Note on versions:** this project does not follow `package.json` versioning
> (`version` stays at `0.0.0`). Releases are produced by tagging `vX.Y.Z`,
> which triggers `.github/workflows/release.yml` to publish
> `dist/management.html`.

## [Unreleased]

### 2026-08-09 — Merge `origin/main` into `dev` (`b7764c7`)

Merge-base: `f60c8ca` (Infistar provider support). This merge brings the
following feature set into `dev` (33 files changed, ~6,500 insertions).

#### Added

- **Docker panel build** (`ff57101`): a multi-stage `Dockerfile`
  (`oven/bun:1.3.14` builder → minimal artifact stage) that produces the
  self-contained `management.html` consumed by CLI Proxy API's static dir
  (`./static` next to `config.yaml`, or `$MANAGEMENT_STATIC_PATH`). Build and
  extract with `docker build --output . .`. Pin the artifact with
  `remote-management.disable-auto-update-panel: true` on the backend.
- **Live Flow page** (`ff57101`, `cdda52f`): real-time request-flow
  visualization over a WebSocket subscription to `/live-flow/ws`. A React Flow
  canvas renders a persistent topology — a central CLIProxyAPI node with every
  observed upstream model around it — and each incoming request animates a
  status-colored traffic pulse toward its destination model. Includes a
  bounded (200) recent-events table, pause/resume, and clear. Rendered only
  when the backend `flow-visualization-enabled` option is on.
- **Backend version floor at login** (`6d44eac`): the UI now enforces the
  ≥ 7.1.0 minimum **fail-closed**. The backend version is tracked from the
  `X-CPA-Version` response header on every Management API response; if the
  reported version is older than 7.1.0, or no version is reported at all,
  login is rejected with a distinct localized diagnostic instead of a generic
  connection error. See `MIN_BACKEND_VERSION` in `src/utils/version.ts` and
  the "Backend version enforcement" section of the README.
- **Config visual editor — cooldown & timezone fields** (`1a49fc9`): the
  redesigned Config page's visual editor now covers cooldown and timezone
  settings, backed by a config search index (`configSearchIndex.ts`) and a
  dedicated `useVisualConfig` hook.
- New tests: `tests/backendVersionFloor.test.ts`,
  `tests/liveFlowEvents.test.ts`, `tests/visualConfigRemainingFields.test.ts`,
  `tests/visualConfigValidation.test.ts`.
- New modules: `src/features/liveFlow/liveFlowStream.ts`,
  `src/hooks/useVisualConfig.ts`, `src/utils/version.ts`,
  `src/components/config/VisualConfigEditor.tsx`,
  `src/components/config/configSearchIndex.ts`.

#### Fixed

- **Live Flow pause handling** (`e658d62`): the paused ref is now synced via
  an effect and the buffered-event count is tracked in state, so pausing the
  stream no longer drops or miscounts queued events.

#### Changed

- All four locales (`en`, `zh-CN`, `zh-TW`, `ru`) received translation keys
  for the new backend-version diagnostic, Live Flow UI, and the new visual
  config fields.

#### Migration notes

- **Operators**: no action required. Upgrading the panel alone is safe; the
  version floor only *reports* an incompatible backend, it does not change
  any stored data. If login is rejected after this update, upgrade the CLI
  Proxy API backend to v7.1.0 or newer.
- **Self-hosters of `management.html`**: if you previously placed a
  hand-built panel into the backend static dir, rebuild from this tree (or
  use the new `Dockerfile`) and keep
  `remote-management.disable-auto-update-panel: true` to prevent the backend
  from overwriting your pinned build.
- **Developers**: the Live Flow page depends on the backend WebSocket
  endpoint `/live-flow/ws`; against backends without live-flow support the
  page is hidden automatically, so no feature flag is needed on the UI side.

### Earlier highlights (pre-merge history, summarized)

- Redesigned Config page routed at `/config`, retiring the legacy editor
  (`feat(config)!` — breaking for deep links to the old editor
  implementation only, not for users).
- Config feature shell: document/save orchestration, section editors and
  blocks, tabs/header/save bar, motion polish with reduced-motion coverage.
- Config fixes: discard drafts without reloading, announce tab validation
  state, shared status across page chrome, visual retry after YAML repair.
- Quota page: Kimi concrete reset time, urgent-recovery emphasis,
  soonest-recovery-first sort with row highlighting, relative times beside
  absolute dates, unified Codex reset-credit expiry on browser-local time,
  shared minute clock, manual reset-credit handling in the quota timeline.
- Provider additions: Infistar, Codex timeline lane-selection enhancements.
- API key tooling: strength meter and secure key generation utility.
