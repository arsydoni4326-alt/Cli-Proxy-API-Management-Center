# Management Center Architecture

## Runtime composition

- `src/App.tsx` creates the hash router and renders the root shell for authenticated and login routes.
- `src/router/ProtectedRoute.tsx` and `src/components/layout/MainLayout.tsx` wrap authenticated routes.
- Feature pages live in `src/features/` where practical; reusable UI lives in `src/components/`.
- Zustand stores in `src/stores/` hold session, configuration, language, theme, and update-notification state.
- `src/services/api/client.ts` is the common Management API client. Domain API modules build on it instead of making ad hoc component requests.

## Update-notification flow

1. The root shell is mounted once per browser document load; hash-route changes keep it mounted.
2. The root shell waits for the first successful connection in that document, then calls
   `versionApi.checkLatest()` once.
3. The root shell compares the backend-reported latest commit with the connected server commit and stores the transient result in `useUpdateStore`.
4. When a newer commit is available, `UpdateModal` renders above the route outlet.
5. The modal displays version metadata from the connected-session store and offers a repository/changelog link. The System page may invoke the same check explicitly.

## Deployment constraints

Vite and `vite-plugin-singlefile` produce one inlined `dist/index.html`; releases rename it to `management.html`. Hash routing is required because the backend serves that single document for all frontend routes.