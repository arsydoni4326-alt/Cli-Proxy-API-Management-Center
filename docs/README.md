# Management Center Documentation

This directory holds in-depth documentation that doesn't fit in the
top-level README. User-facing basics (install, connect, troubleshoot) live
in [../README.md](../README.md) and [../README_CN.md](../README_CN.md).

## Contents

| Document                                            | Audience        | Purpose                                                        |
| --------------------------------------------------- | --------------- | -------------------------------------------------------------- |
| [management-api.md](management-api.md)              | UI developers   | Backend contract the UI relies on: endpoints, headers, versions |
| [architecture.md](architecture.md)                  | Contributors    | How the frontend is structured and why                         |
| [deployment.md](deployment.md)                      | Operators       | Building, shipping, and pinning `management.html`              |
| [roadmap.md](roadmap.md)                            | Everyone        | Future-work recommendations from the 2026-08-09 merge review    |

## Conventions

- English is the primary documentation language. Only the top-level
  `README.md` has a maintained Chinese mirror (`README_CN.md`).
- When implementation changes, update the affected doc **in the same PR**
  (see [../CONTRIBUTING.md](../CONTRIBUTING.md) — "Docs touched" rule).
- Backend behavior is documented here only as far as the UI consumes it;
  the source of truth is the
  [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) repository
  (`../CLIProxyAPI` in this workspace).
- Notable user-visible changes must also land in
  [../CHANGELOG.md](../CHANGELOG.md) under `Unreleased`.
