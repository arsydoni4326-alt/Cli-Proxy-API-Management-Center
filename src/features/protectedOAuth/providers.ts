/**
 * Protected OAuth providers — never to be removed or replaced by upstream merges.
 *
 * Antigravity and Codex OAuth are fork-mandated features. This module is the
 * single source of truth for their provider identifiers, card metadata, and
 * icon references. Any upstream merge that removes or replaces these providers
 * will be caught by:
 *   1. Compilation errors (the OAuth page imports from here).
 *   2. The contract test suite (tests/protectedOAuthProviders.test.ts).
 *
 * See SPECIFICATION.md ("Protected OAuth providers") for the mandate.
 */

import iconAntigravity from '@/assets/icons/antigravity.svg';
import iconCodex from '@/assets/icons/codex.svg';

export interface ProtectedOAuthProviderDefinition {
  id: 'codex' | 'antigravity';
  titleKey: string;
  icon: string;
}

export const PROTECTED_OAUTH_PROVIDER_DEFINITIONS: readonly ProtectedOAuthProviderDefinition[] = [
  {
    id: 'codex',
    titleKey: 'auth_login.codex_oauth_title',
    icon: iconCodex,
  },
  {
    id: 'antigravity',
    titleKey: 'auth_login.antigravity_oauth_title',
    icon: iconAntigravity,
  },
];

export const PROTECTED_OAUTH_PROVIDER_IDS: readonly string[] = ['codex', 'antigravity'];

/** Provider IDs expected to be in the WEBUI_SUPPORTED set. */
export const PROTECTED_WEBUI_PROVIDER_IDS: readonly string[] = ['codex', 'antigravity'];

/** Provider IDs expected to be in the CALLBACK_SUPPORTED set. */
export const PROTECTED_CALLBACK_PROVIDER_IDS: readonly string[] = ['codex', 'antigravity'];

export function isProtectedOAuthProvider(id: string): boolean {
  return PROTECTED_OAUTH_PROVIDER_IDS.includes(id);
}
