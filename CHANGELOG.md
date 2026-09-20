# CLI Proxy API Management Center Changelog

## [Unreleased]

### Merged
- Merged upstream `v1.24.1` (`upstream/main`) into `develop`. Quota/i18n conflict resolution kept
  both sides intact: the fork's top-level `update_modal` block (required by `UpdateModal.tsx`)
  and the upstream `quota_management` block (including the new account-search keys) are both
  present in all four locale files (`en`, `ru`, `zh-CN`, `zh-TW`).

### Added
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

### Fixed
- Hash-route navigation, such as `#/ai-providers` to `#/auth-files`, no longer checks for or
  opens the update notification modal.
- Quota: Claude Team organization plans are now prioritized in plan detection (upstream fix).
- Quota: xAI usage stays tied to its billing period, and unavailable usage is clarified
  instead of misreported (upstream fixes #441 and follow-up).
- Quota: live Codex renewal date is fetched from the backend instead of being estimated.
- Auth files: weight tooltip uses plain text instead of markup.

## [0.0.0] - Initial

- Initial release of CLI Proxy API Management Center
- Support for English, Simplified Chinese, Traditional Chinese, and Russian
- Management of AI providers, auth files, OAuth, quota, and logs
- System information page with update checking capability
