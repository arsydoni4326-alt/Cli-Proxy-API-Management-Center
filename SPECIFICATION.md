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

- Every OAuth process result on the OAuth page (`#/oauth`) — login success or failure, polling
  errors, callback validation warnings, session cancellation, and Vertex/iFlow import outcomes —
  is presented as a centered modal instead of a transient toast notification.
- The modal is built on the shared `Modal` component and stays open until the user dismisses it
  via the close button, the action button, or the Escape key. It must never auto-dismiss on a
  timer, so results can not be missed.
- Modal titles, icons, and messages reuse existing localized `common.*` and `auth_login.*` /
  `vertex_import.*` / `notification.*` keys in English, Simplified Chinese, Traditional Chinese,
  and Russian; no new translation keys are required.
- Non-result feedback that is not part of the OAuth process outcome, such as "link copied to
  clipboard", remains a toast notification.

## Compatibility and localization

- Preserve `createHashRouter` routing and single-file Vite output.
- All user-visible update-notification text must be available in English, Simplified Chinese, Traditional Chinese, and Russian.
- The backend Management API remains the source of truth for available update information.