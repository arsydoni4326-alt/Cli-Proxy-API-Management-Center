# Future-Work Recommendations

Recommendations from the post-merge review of `b7764c7`
(2026-08-09 — merge `origin/main` into `dev`). Items are grouped by theme
and roughly prioritized within each group. None of these are committed
plans; they are starting points for discussion.

## Release & versioning process

1. **Cut a first tag.** `package.json` is `0.0.0` and the changelog is
   date-based until a `vX.Y.Z` tag exists. Tagging the merge state (e.g.
   the next stable point on `main`) would anchor the changelog, the
   release workflow, and the System-page version display.
2. **Automate changelog drafting.** History already follows Conventional
   Commits, so a tool (e.g. `git-cliff`, `changesets`-style, or a small
   script run by the release workflow) can draft `[Unreleased]` entries
   from commit messages. Keep human curation for migration notes.
3. **Verify the release workflow exists/was merged.** The README references
   `.github/workflows/release.yml`; confirm it is present in the canonical
   repo and covers the Docker artifact path added in this merge.

## Live Flow

1. **Reconnect/backoff UX.** The stream module handles pause/resume
   buffering; document and test socket-reconnect behavior (backoff,
   "disconnected" indicator, event-gap notice).
2. **Event-shape versioning.** Add an explicit contract test or a version
   field in the WS payload so future backend event changes fail visibly
   instead of silently mis-rendering.
3. **Performance envelope.** The recent-events table is bounded at 200;
   consider documenting/validating behavior under high event rates
   (drop policy, canvas node cap).

## Config page

1. **Field parity tracking.** `visualConfigRemainingFields.test.ts` guards
   parity between the visual editor and the YAML schema. When the backend
   adds config keys, extend the search index and the parity test in the
   same PR — treat a parity-test failure as a release blocker.
2. **Search index i18n.** Ensure `configSearchIndex.ts` entries expose
   localized labels for all four locales; untranslated keys silently hurt
   search quality for non-English users.

## Testing & CI

1. **Document the testing strategy** (what belongs in `tests/`, how to
   test WebSocket and CodeMirror logic) — candidates are covered in
   [architecture.md](architecture.md); expand into a dedicated
   `docs/testing.md` when the suite grows further.
2. **Browser smoke check.** The Bun suite covers logic only. A minimal
   manual checklist (login → config load → save → quota page → live flow)
   per release would catch integration regressions the unit tests can't.
3. **Verify gate in CI.** Ensure `bun run verify` runs on PRs; lint fails
   on warnings, so CI must not soften that.

## Documentation hygiene

1. **`README_CN.md` parity.** New user-facing sections (version floor,
   Docker build, Live Flow) must be mirrored; consider a CI lint that
   compares heading structure between `README.md` and `README_CN.md`.
2. **Backend contract ownership.** [management-api.md](management-api.md)
   duplicates knowledge that belongs to the backend repo. Long-term,
   CLIProxyAPI should publish the contract and this doc should link to it.
3. **ADRs for big turns.** The config-page retirement (`feat(config)!`)
   and the fail-closed version floor were significant decisions; a
   lightweight `docs/adr/` habit would preserve rationale for the next one.

## Security

1. **Key-storage review cadence.** The `enc::v1::…` obfuscation in
   `localStorage` is intentionally lightweight; re-evaluate periodically
   (e.g. session-only storage option, WebCrypto-backed wrap) and document
   the threat model explicitly.
2. **Remote-management exposé.** Add a short "exposure surface" section to
   operator docs covering remote management + pinned panels + reverse
   proxy header handling (partly covered in
   [deployment.md](deployment.md)).
