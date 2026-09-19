# Management Center Specification

## Scope

The Management Center is a React single-page frontend for the CLI Proxy API Management API. It is deployed as one self-contained `management.html` artifact and uses hash routing.

## Update notifications

- The frontend requests the backend's update-check endpoint after the first successful connection in a newly loaded browser document.
- An automatic update notification opens only when that initial check finds a newer upstream server commit.
- Update notification state is transient; a new browser load must obtain a fresh result before opening a modal.
- Client-side hash navigation, including navigation from `#/ai-providers` to `#/auth-files`, must not initiate an automatic update check or open the notification.
- A full browser load, including a first visit, F5, Ctrl+R, or browser reload, creates a new root mount and may show the notification when an update is available.
- The notification presents the connected server's current version, the available upstream version and commit, a changelog summary with a link to the repository changelog, and a dismiss action.
- Users can invoke an explicit manual update check from the System page. Manual checking remains available independently of the automatic initial-load check.

## OAuth result modals

> **Protected feature — removal prohibited.** Per project-owner mandate, the OAuth
> result modal must never be removed, replaced with toast notifications, or silently
> downgraded (e.g., auto-dismiss timers, appended runtime error strings in main login
> results). This is enforced by the `OAuth result modal feature contract (protected)`
> suite in `tests/oauthResultModal.test.ts`, which fails CI if the component, its
> wiring in `OAuthPage.tsx`, the `showOauthResult` call sites, the strict message rule,
> or the `.oauth-result-modal-*` styles regress. Any proposal to change this behavior
> requires an explicit owner decision and a matching update to this specification,
> the contract test, and `CHANGELOG.md`.

- Every OAuth process result on the OAuth page (`#/oauth`) — login success or failure, polling
  errors, callback validation warnings, session cancellation, and Vertex/iFlow import outcomes —
  is presented as a centered modal instead of a transient toast notification.
- The modal is built on the shared `Modal` component and stays open until the user dismisses it
  via the close button, the action button, or the Escape key. It must never auto-dismiss on a
  timer, so results can not be missed.
- Modal titles, icons, and messages reuse existing localized `common.*` and `auth_login.*` /
  `vertex_import.*` / `notification.*` keys in English, Simplified Chinese, Traditional Chinese,
  and Russian; no new translation keys are required.
- For the main OAuth process result of every provider (built-in and plugin), the modal shows
  **only** the localized `*_oauth_status_success` or `*_oauth_status_error` message — never a
  concatenated runtime error string, status code, or other detail, and never the
  `*_oauth_status_waiting` status text. The detailed error remains visible on the provider card's
  inline status line. Callback validation, Devin cancellation, and Vertex/iFlow import outcomes
  may keep their own explicit single-key messages because they are not the main login result.
- Non-result feedback that is not part of the OAuth process outcome, such as "link copied to
  clipboard", remains a toast notification.

## Compatibility and localization

- Preserve `createHashRouter` routing and single-file Vite output.
- All user-visible update-notification text must be available in English, Simplified Chinese, Traditional Chinese, and Russian.
- The backend Management API remains the source of truth for available update information.