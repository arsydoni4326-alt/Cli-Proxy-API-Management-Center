/**
 * Returns the changelog content for display in the update modal.
 * The changelog is embedded at build time for the current version.
 */
export function changelogContent(version: string): string {
  // Show version notification with link to full changelog
  const versionInfo = version && version !== 'dev'
    ? version
    : 'a new version';

  return `
<p class="changelog-version">
  <strong>Version ${versionInfo}</strong> is available.
</p>
<p class="changelog-link">
  <a href="https://github.com/arsydoni4326-alt/CLIProxyAPI/blob/main/frontend/CHANGELOG.md" target="_blank" rel="noopener noreferrer">
    View full changelog on GitHub ↗
  </a>
</p>
`.trim();
}
