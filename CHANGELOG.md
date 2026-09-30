# CLI Proxy API Management Center Changelog

## [Unreleased]

## [1.24.6-arsydoni4326-alt] - 2026-09-30

### Merged
- Merged upstream `v1.25.0` (`upstream/main` at commit `b87b948`) into `develop`. Three-way
  conflict resolution preserved all fork features while incorporating upstream changes:
  - `oauth.ts`: Fork's `no_proxy` parameter feature combined with upstream's unified `/oauth/auth-url` endpoint
  - `BaseProviderForm.tsx`: Kept approach that includes upstream's `sourceIndex`/`authIndex` fields
  - `useProviderWorkbench.ts`: Combined fork's `resolveProxyUrl`/`directConnection` with upstream's `sourceIndex`
- Previous upstream merge: `v1.24.1` with quota/i18n conflict resolution that kept both the fork's
  top-level `update_modal` block (required by `UpdateModal.tsx`) and the upstream `quota_management`
  block (including account-search keys) in all four locale files (`en`, `ru`, `zh-CN`, `zh-TW`).

### Added (from upstream v1.25.0)
- Logs page refactored to feature-based structure (`src/features/logs/`)
- Config draft recovery system with conflict detection
- Legacy backend probe for version compatibility
- Extensive new test coverage (logs, config patches, provider editing, fullscreen behavior)
- Config patch API with payload normalization
- Log buffer with cursor-based pagination and bounded memory
- Log fullscreen mode with Escape key handling

### Fixed
- Logs: Escape key handling respects event propagation (upstream fix)
- Config: Blocked conflicting payload replacements after recovery (upstream fix)
- Config: List edits recovered without replaying stale indexes (upstream fix)
- **OAuth page: restored missing non-featured OAuth providers (Codex, Antigravity, Meta,
  Anthropic, xAI, Devin)** that were accidentally hidden when commit `b4f131d` removed
  the `otherOAuthProviders` variable definition but left the JSX rendering section intact.
  The variable definition and its rendering section have been restored, and the protected
  OAuth providers contract suite verifies they stay present. See SPECIFICATION.md
  ("Protected OAuth providers").
- Hash-route navigation, such as `#/ai-providers` to `#/auth-files`, no longer checks for or
  opens the update notification modal.
- Quota: Claude Team organization plans are now prioritized in plan detection (upstream fix).
- Quota: xAI usage stays tied to its billing period, and unavailable usage is clarified
  instead of misreported (upstream fixes #441 and follow-up).
- Quota: live Codex renewal date is fetched from the backend instead of being estimated.
- Auth files: weight tooltip uses plain text instead of markup.

### Protected Features (preserved through merge)
- OAuth `no_proxy` parameter (direct connection toggle)
- Provider `directConnection` toggle and `resolveProxyUrl` logic
- Protected OAuth providers domain (Codex, Antigravity) with contract tests
- OAuth result modals (protected by contract tests)
- Update notification modal (single-show on initial load)

## [1.24.5-arsydoni4326-alt] - Previous Release

### Added
- Protected OAuth providers domain (`src/features/protectedOAuth/`) that enforces
  Antigravity and Codex OAuth must never be removed or replaced by upstream merges.
  Includes a contract test suite (`Protected OAuth providers — page contract
  (protected)` and `Protected OAuth providers — API contract (protected)` in
  `tests/protectedOAuthProviders.test.ts`) that fails the test suite if either
  provider's definition, icon, i18n key, page rendering, or API wiring regresses.
  Per project-owner mandate; see SPECIFICATION.md ("Protected OAuth providers").
- Protected-feature contract test suite (`OAuth result modal feature contract (protected)` in
  `tests/oauthResultModal.test.ts`) that fails the test suite if the OAuth result modal is ever
  removed, replaced by toasts, or downgraded (per project-owner mandate). No runtime behavior
  changed; the feature was verified intact and byte-identical to its introduction commit.
- OAuth process results (login success/failure, polling errors, callback validation,
  cancellation, and Vertex/iFlow import outcomes) now appear as a centered modal that stays
  open until manually dismissed, replacing the small transient toast notifications that were
  easy to miss. Built on the shared `Modal` component; no new translation keys required.
- The main OAuth result modal shows only the localized
  `*_oauth_status_success` / `*_oauth_status_error` message (for example
  "Authentication successful!" or "Authentication failed:"); runtime error details and the
  waiting status text are never appended to the modal. Detailed errors remain on the
  provider card's inline status line.
- Update notification modal shows only once after the initial browser load connects, including
  first visits and browser reloads (F5/Ctrl+R).
- Changelog section and upstream repository links in the update notification modal.
- Quota: account search by filename or email (upstream `feat(quota): add account search`).
- Quota: recognition of the Codex Business Premium entitlement (upstream fix #439).
- Plugin resource pages now use theme backgrounds instead of hard-coded colors (upstream fix).


## [0.0.0] - Initial

- Initial release of CLI Proxy API Management Center
- Support for English, Simplified Chinese, Traditional Chinese, and Russian
- Management of AI providers, auth files, OAuth, quota, and logs
- System information page with update checking capability
