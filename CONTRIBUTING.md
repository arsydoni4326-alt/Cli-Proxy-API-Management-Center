# Contributing to CLI Proxy API Management Center

Thanks for helping improve the Management Center! This guide covers the
development workflow; for architecture and style rules, also see
[AGENTS.md](AGENTS.md).

## Prerequisites

- [Bun](https://bun.sh) 1.3.x (pinned by `packageManager: bun@1.3.14`)
- A running CLI Proxy API backend (≥ v7.1.0) for manual verification —
  see the [main project](https://github.com/router-for-me/CLIProxyAPI)

## Setup

```bash
bun install --frozen-lockfile
bun run dev        # http://localhost:5173
```

## Everyday commands

| Command              | Purpose                                            |
| -------------------- | -------------------------------------------------- |
| `bun run test`       | Bun test suite (tests live in `tests/*.test.ts`)   |
| `bun run lint`       | ESLint — **fails on warnings**                     |
| `bun run type-check` | Fast standalone `tsc --noEmit`                     |
| `bun run verify`     | Full gate: test + lint + type-check + build        |
| `bun run format`     | Prettier over `src/**/*.{ts,tsx,css,scss}`         |

Run `bun run verify` before opening a PR. For UI changes, also verify the
affected route in a browser against a real backend and attach screenshots.

## Commit style

Git history follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add support for xAI provider
fix(auth-files): keep disabled card actions visible
ci: use node 24 for releases
```

Keep commits focused; scope them when useful (`feat(quota): …`).

## Pull requests

Include in the PR description:

1. **Change summary** and linked issue when applicable.
2. **UI screenshots** for visual changes.
3. **Backend version** or reproduction details for integration work.
4. **Verification notes** — output of `bun run verify` (and
   `bun run type-check` if run separately).
5. **Docs touched** — when a change alters behavior, configuration, or the
   API contract, update the affected documentation (`README.md`,
   `README_CN.md`, `CHANGELOG.md`, `docs/`) **in the same PR** and list it
   here. When in doubt, add a `CHANGELOG.md` entry under `Unreleased`.

## Internationalization

All user-facing text goes through i18next. When you add or change UI copy,
update **all four locales** in the same change:

- `src/i18n/locales/en.json`
- `src/i18n/locales/zh-CN.json`
- `src/i18n/locales/zh-TW.json`
- `src/i18n/locales/ru.json`

## Backend contract

This UI is not the proxy — it talks to the Management API under
`/v0/management`. Treat backend contracts as the source of truth:

- For OAuth/provider changes, inspect `../CLIProxyAPI` before changing route
  names, provider keys, callback parameters, or auth-file semantics.
- Features that depend on optional backend capabilities (e.g. Live Flow,
  per-auth-file model lists) must degrade gracefully — hide or mark the
  feature "unsupported" rather than erroring.

## Security

- Never commit secrets. Management keys are entered at runtime and persisted
  only in browser storage.
- Report vulnerabilities privately to the maintainers rather than via public
  issues.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
