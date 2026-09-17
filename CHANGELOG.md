# CLI Proxy API Management Center Changelog

## [Unreleased]

### Added
- OAuth process results (login success/failure, polling errors, callback validation,
  cancellation, and Vertex/iFlow import outcomes) now appear as a centered modal that stays
  open until manually dismissed, replacing the small transient toast notifications that were
  easy to miss. Built on the shared `Modal` component; no new translation keys required.
- Update notification modal shows only once after the initial browser load connects, including
  first visits and browser reloads (F5/Ctrl+R).
- Changelog section and upstream repository links in the update notification modal.

### Fixed
- Hash-route navigation, such as `#/ai-providers` to `#/auth-files`, no longer checks for or
  opens the update notification modal.

## [0.0.0] - Initial

- Initial release of CLI Proxy API Management Center
- Support for English, Simplified Chinese, Traditional Chinese, and Russian
- Management of AI providers, auth files, OAuth, quota, and logs
- System information page with update checking capability
