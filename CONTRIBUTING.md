# Contributing

## Prerequisites

- Use Bun 1.3.14, as pinned in `package.json`.
- Do not commit generated `dist/` output, credentials, management keys, or auth files.

## Development workflow

1. Read `AGENTS.md`, `README.md`, relevant documents in `docs/`, and `session.md`.
2. Make the smallest focused change that preserves hash routing and single-file deployment.
3. Update all four locale files for changed user-visible text.
4. Add or update focused Bun tests where practical.
5. Format changed source files, then run:

   ```bash
   bun run test
   bun run lint
   bun run build
   ```

   Use `bun run verify` to run the same verification sequence.
6. Update affected documentation and summarize significant decisions and test results in `session.md`.

## Code conventions

- Use TypeScript, 2-space indentation, semicolons, single quotes, and ES5 trailing commas.
- Prefer the `@/` import alias and existing components, API modules, and Zustand stores.
- Keep user-facing strings in i18n and preserve accessible keyboard behavior.
- Follow the detailed repository conventions in `AGENTS.md`.

## Pull requests

Use Conventional Commit-style titles. Include the behavior changed, related issue (if any), UI verification notes/screenshots where applicable, and commands actually run.