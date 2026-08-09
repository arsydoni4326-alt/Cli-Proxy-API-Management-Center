# Deployment Guide

How the `management.html` panel is built, shipped, and kept in sync (or
pinned) with a CLI Proxy API backend.

## Build paths

### 1. Bundled with the backend (default)

Since CLI Proxy API 6.0.19, the Web UI ships with the main program and is
served at `http://<host>:<api_port>/management.html`. Most users need
nothing from this repository.

### 2. Local build

```bash
bun install --frozen-lockfile
bun run build        # → dist/index.html (fully self-contained)
bun run preview      # optional local preview server
```

Opening `dist/index.html` via `file://` may hit browser CORS rules; serve
it instead.

### 3. Docker build (no local toolchain) — *added in the 2026-08-09 merge*

```bash
docker build --output . .
# → ./management.html
```

Or via the builder stage as an image:

```bash
docker build --target builder -t cpamc-panel .
docker run --rm -v "$(pwd):/out" --entrypoint sh cpamc-panel -c "cp /management.html /out/"
```

Useful for air-gapped environments, CI pipelines, and version pinning.

## Installing a custom build into the backend

1. Place the file in the backend's panel directory:
   - `./static/` next to `config.yaml`, **or**
   - the directory from `$MANAGEMENT_STATIC_PATH`.
2. Restart (or reload) CLI Proxy API if required by your deployment.

### Preventing the backend from overwriting it

The backend can auto-update the panel. To pin a custom build, set:

```yaml
remote-management:
  disable-auto-update-panel: true
```

Without this flag, the backend may replace your file with its bundled or
latest downloaded version.

## Release flow

- Tagging `vX.Y.Z` triggers `.github/workflows/release.yml`, which
  publishes `dist/management.html` as a release artifact.
- The UI version string displayed on the System page is injected at build
  time: `env VERSION` → git tag → `package.json` → `dev`. To label manual
  builds: `VERSION=2026.08.09-custom bun run build`.

## Compatibility

| Panel        | Backend        | Result                                             |
| ------------ | -------------- | -------------------------------------------------- |
| any          | ≥ 7.1.0        | Fully supported.                                    |
| any          | < 7.1.0        | Login rejected with a version-floor diagnostic.     |
| any          | no version hdr | Login rejected (fail-closed; backend too old).     |
| post-merge   | no live-flow   | Live Flow page is hidden; everything else works.   |

## Reverse proxy / remote management checklist

- Enable `allow-remote-management: true` on the backend when the browser is
  not on the same host.
- If you terminate TLS in front of the backend, ensure the
  `X-CPA-Version` response header is forwarded — stripping it triggers the
  fail-closed version check.
- The WebSocket used by Live Flow (`/live-flow/ws`) needs `Upgrade` header
  passthrough on proxies such as nginx
  (`proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";`).
