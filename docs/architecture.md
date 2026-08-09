# Frontend Architecture

High-level map of how the Management Center is put together. For coding
style rules see [../AGENTS.md](../AGENTS.md).

## Big picture

The app is a **single-page React 19 + TypeScript** application built by
Vite 8 into **one self-contained HTML file** (`dist/index.html`, shipped as
`management.html`). All JS/CSS/assets are inlined via
`vite-plugin-singlefile` with code splitting disabled, so the artifact can
be dropped into CLI Proxy API's static dir and served without any asset
pipeline.

Routing uses **HashRouter** (`react-router-dom` v7) — a hard requirement
for single-file hosting, since the server only ever serves the one HTML
file and never sees route paths.

## Directory map (`src/`)

| Path            | Responsibility                                                        |
| --------------- | --------------------------------------------------------------------- |
| `router/`       | Route table + layout chrome (`MainRoutes.tsx`).                        |
| `pages/`        | Top-level routed pages (Dashboard, Config, Quota, Live Flow, …).       |
| `features/`     | Feature-scoped logic extracted from pages (e.g. `features/liveFlow/`, config feature shell). |
| `components/`   | Reusable and page-scoped components (`components/config/`, …).         |
| `services/api/` | Axios clients grouped by domain (`oauth.ts`, …). Base URL normalization and auth header injection live here. |
| `stores/`       | Zustand v5 stores (auth/session, app state).                           |
| `hooks/`        | Shared hooks (`useVisualConfig`, …).                                   |
| `types/`        | Shared TypeScript types (`visualConfig.ts`, …).                        |
| `styles/`       | Global styles + SCSS variables injected by Vite (`variables.scss`).    |
| `i18n/locales/` | Translation JSON for `en`, `zh-CN`, `zh-TW`, `ru`.                     |
| `utils/`        | Pure helpers (`version.ts`, API-key strength, …) — the easiest layer to unit-test. |

`@/` is an alias for `src/` (configured in `vite.config.ts` and
`tsconfig.json`).

## State and data flow

- **Zustand stores** hold session state (connection, management key —
  stored obfuscated as `enc::v1::…` in `localStorage`) and cross-page app
  state.
- **Axios** is the single HTTP client; the management key is attached as a
  Bearer token on every request, and the `X-CPA-Version` response header is
  captured for the login-time version-floor check (see
  [management-api.md](management-api.md)).
- Feature logic increasingly lives in `features/<name>/` folders with pages
  kept thin — the Config page redesign and Live Flow both follow this
  pattern. Prefer that shape for new features.

## Key libraries and why

| Library               | Role                                                             |
| --------------------- | ---------------------------------------------------------------- |
| Zustand v5            | Lightweight stores; no provider boilerplate.                     |
| CodeMirror 6 + merge  | YAML source editor and save-diff preview on the Config page.     |
| `yaml`                | Parse/serialize `config.yaml` for the visual editor.             |
| React Flow 11         | Live Flow topology canvas (nodes, edges, animated pulses).       |
| Motion                | Animations, with reduced-motion coverage.                        |
| i18next               | Localization across the four supported locales.                  |
| SCSS Modules          | Component-scoped styling (`Name.module.scss` beside its file).   |

## Build-time configuration

- **UI version** is injected via the `__APP_VERSION__` define
  (`env VERSION` → git tag → `package.json` → `dev`), displayed on the
  System page. `package.json` stays at `0.0.0`; see
  [../CHANGELOG.md](../CHANGELOG.md) for the versioning policy.
- SCSS `variables.scss` is auto-injected (`additionalData`) into every
  module.
- Build target is **ES2020**; keep dependencies and syntax compatible.

## Testing layout

- Tests use **Bun's built-in runner** and live in `tests/*.test.ts`
  (not colocated with components), biased toward pure logic: quota math,
  provider transforms, config validation, version-floor comparison, WebSocket
  event handling.
- When adding a feature, put the testable logic in a pure function/hook
  under `src/` and cover it from `tests/`; this is why much of the UI logic
  is extracted into `features/`, `hooks/`, and `utils/`.

## Accessibility and robustness notes

- Config tabs announce validation state; reduced-motion preferences are
  respected by the Motion layer.
- Optional backend capabilities degrade gracefully (hidden nav items,
  "unsupported" states) — see
  [management-api.md](management-api.md#optional-capabilities-and-graceful-degradation).
