# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Builds the Management Center panel into a single `management.html` asset.
#
# The CLIProxyAPI Docker image intentionally does NOT embed the panel; the
# backend downloads it at runtime. Use this Dockerfile when you need to build
# the panel yourself (air-gapped, version-pinning, or CI pipelines).
#
# Usage (from this directory):
#
#   # Build and extract the artifact into the current directory:
#   docker build --output . .
#   # → ./management.html
#
#   # Or just build the image (artifact at /management.html inside):
#   docker build -t cpamc-panel .
#   docker run --rm -v "$(pwd):/out" cpamc-panel cp /management.html /out/
#
# The produced `management.html` is consumed by CLIProxyAPI per the static-dir
# resolution rules (see docs/ARCHITECTURE.md §5): place it into the backend's
# panel directory (e.g. ./static next to config.yaml, or $MANAGEMENT_STATIC_PATH)
# and optionally set remote-management.disable-auto-update-panel: true to pin it.
# ─────────────────────────────────────────────────────────────────────────────

# ─── Stage 1: build ──────────────────────────────────────────────────────────
# Bun version matches package.json "packageManager": "bun@1.3.14".
FROM oven/bun:1.3.14 AS builder

WORKDIR /app

# Copy manifests + lockfile first for dependency-layer caching.
COPY package.json bun.lock ./

# Frozen lockfile for reproducible installs.
RUN bun install --frozen-lockfile

# Copy the rest of the sources (tests excluded via .dockerignore).
COPY . .

# Build → dist/index.html (self-contained single file via vite-plugin-singlefile),
# then normalize the output name the backend expects.
RUN bun run build \
 && cp dist/index.html /management.html

# ─── Stage 2: artifact image (asset only) ───────────────────────────────────
FROM debian:bookworm
COPY --from=builder /management.html /management.html
