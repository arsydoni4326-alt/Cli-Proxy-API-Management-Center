import { describe, expect, test } from 'bun:test';
import {
  PROTECTED_OAUTH_PROVIDER_DEFINITIONS,
  PROTECTED_OAUTH_PROVIDER_IDS,
  PROTECTED_WEBUI_PROVIDER_IDS,
  PROTECTED_CALLBACK_PROVIDER_IDS,
  isProtectedOAuthProvider,
} from '../src/features/protectedOAuth';
import en from '../src/i18n/locales/en.json';
import zhCN from '../src/i18n/locales/zh-CN.json';
import zhTW from '../src/i18n/locales/zh-TW.json';
import ru from '../src/i18n/locales/ru.json';

/*
 * Protected OAuth providers contract (project-owner mandate): Antigravity and
 * Codex OAuth must never be removed or replaced by upstream merges. The
 * source-level checks below fail the test suite if a future merge or edit
 * regresses the feature. See SPECIFICATION.md ("Protected OAuth providers").
 */

describe('Protected OAuth providers domain module', () => {
  test('exports the correct provider definitions', () => {
    const ids = PROTECTED_OAUTH_PROVIDER_DEFINITIONS.map((p) => p.id);
    expect(ids).toContain('codex');
    expect(ids).toContain('antigravity');
    expect(ids.length).toBe(2);
  });

  test('exports matching provider IDs constant', () => {
    expect(PROTECTED_OAUTH_PROVIDER_IDS).toContain('codex');
    expect(PROTECTED_OAUTH_PROVIDER_IDS).toContain('antigravity');
    expect(PROTECTED_OAUTH_PROVIDER_IDS.length).toBe(2);
  });

  test('exports WEBUI provider IDs constant', () => {
    expect(PROTECTED_WEBUI_PROVIDER_IDS).toContain('codex');
    expect(PROTECTED_WEBUI_PROVIDER_IDS).toContain('antigravity');
  });

  test('exports callback provider IDs constant', () => {
    expect(PROTECTED_CALLBACK_PROVIDER_IDS).toContain('codex');
    expect(PROTECTED_CALLBACK_PROVIDER_IDS).toContain('antigravity');
  });

  test('isProtectedOAuthProvider returns true for protected providers', () => {
    expect(isProtectedOAuthProvider('codex')).toBe(true);
    expect(isProtectedOAuthProvider('antigravity')).toBe(true);
  });

  test('isProtectedOAuthProvider returns false for non-protected providers', () => {
    expect(isProtectedOAuthProvider('meta')).toBe(false);
    expect(isProtectedOAuthProvider('anthropic')).toBe(false);
    expect(isProtectedOAuthProvider('xai')).toBe(false);
    expect(isProtectedOAuthProvider('devin')).toBe(false);
    expect(isProtectedOAuthProvider('kimi')).toBe(false);
  });

  test('each provider definition has a titleKey', () => {
    for (const provider of PROTECTED_OAUTH_PROVIDER_DEFINITIONS) {
      expect(provider.titleKey).toBeTruthy();
      expect(typeof provider.titleKey).toBe('string');
    }
  });

  test('each provider definition has an icon (string path)', () => {
    for (const provider of PROTECTED_OAUTH_PROVIDER_DEFINITIONS) {
      expect(provider.icon).toBeTruthy();
      expect(typeof provider.icon).toBe('string');
    }
  });
});
describe('Protected OAuth providers — i18n keys exist in all four locales', () => {
  const locales = [en, zhCN, zhTW, ru];
  const localeNames = ['en', 'zh-CN', 'zh-TW', 'ru'];

  for (const provider of PROTECTED_OAUTH_PROVIDER_DEFINITIONS) {
    const key = provider.titleKey;
    const [, ...pathParts] = key.split('.');
    const path = pathParts.join('.');

    test(`${provider.id} title key "${key}" exists in all locales`, () => {
      for (let i = 0; i < locales.length; i++) {
        const locale = locales[i] as Record<string, unknown>;
        const namespaceObj = locale['auth_login'] as Record<string, unknown> | undefined;
        expect(namespaceObj).toBeDefined();
        const value = namespaceObj?.[path];
        expect(value).toBeTruthy();
      }
    });
  }
});

describe('Protected OAuth providers — icon files exist', () => {
  test('codex icon file exists', async () => {
    const file = Bun.file('src/assets/icons/codex.svg');
    const exists = await file.exists();
    expect(exists).toBe(true);
  });

  test('antigravity icon file exists', async () => {
    const file = Bun.file('src/assets/icons/antigravity.svg');
    const exists = await file.exists();
    expect(exists).toBe(true);
  });
});

const oauthPageSource = await Bun.file('src/pages/OAuthPage.tsx').text();
const oauthApiSource = await Bun.file('src/services/api/oauth.ts').text();

describe('Protected OAuth providers — page contract (protected)', () => {
  test('OAuthPage imports from the protected OAuth domain', () => {
    expect(oauthPageSource).toContain("from '@/features/protectedOAuth'");
  });

  test('OAuthPage still has codex and antigravity as built-in providers', () => {
    expect(oauthPageSource).toMatch(/id: 'codex'/);
    expect(oauthPageSource).toMatch(/id: 'antigravity'/);
  });

  test('OAuthPage uses PROTECTED_PROVIDER_MAP for codex and antigravity', () => {
    expect(oauthPageSource).toMatch(/PROTECTED_PROVIDER_MAP\.get\('codex'\)/);
    expect(oauthPageSource).toMatch(/PROTECTED_PROVIDER_MAP\.get\('antigravity'\)/);
  });

  test('OAuthPage renders the otherOAuthProviders section', () => {
    expect(oauthPageSource).toContain('otherOAuthProviders');
    expect(oauthPageSource).toMatch(
      /otherOAuthProviders\.map\(\(provider\) => renderOAuthProviderCard/
    );
  });

  test('OAuthPage CALLBACK_SUPPORTED includes both protected providers', () => {
    const callbackMatch = oauthPageSource.match(
      /CALLBACK_SUPPORTED = new Set<string>\(\[([^\]]+)\]/
    );
    expect(callbackMatch).not.toBeNull();
    if (callbackMatch) {
      const ids = callbackMatch[1];
      expect(ids).toContain("'codex'");
      expect(ids).toContain("'antigravity'");
    }
  });
});

describe('Protected OAuth providers — API contract (protected)', () => {
  test('oauth.ts BuiltInOAuthProvider type includes codex', () => {
    expect(oauthApiSource).toContain("'codex'");
  });

  test('oauth.ts BuiltInOAuthProvider type includes antigravity', () => {
    expect(oauthApiSource).toContain("'antigravity'");
  });

  test('oauth.ts WEBUI_SUPPORTED set includes codex', () => {
    expect(oauthApiSource).toMatch(
      /WEBUI_SUPPORTED = new Set<string>\(\[[^\]]*'codex'/
    );
  });

  test('oauth.ts WEBUI_SUPPORTED set includes antigravity', () => {
    expect(oauthApiSource).toMatch(
      /WEBUI_SUPPORTED = new Set<string>\(\[[^\]]*'antigravity'/
    );
  });
});
