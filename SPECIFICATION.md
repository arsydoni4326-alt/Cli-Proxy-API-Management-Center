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

## Compatibility and localization

- Preserve `createHashRouter` routing and single-file Vite output.
- All user-visible update-notification text must be available in English, Simplified Chinese, Traditional Chinese, and Russian.
- The backend Management API remains the source of truth for available update information.