/**
 * OAuth 与设备码登录相关 API
 */

import { apiClient } from './client';
import {
  isManagementOAuthProviderKey,
  normalizeManagementOAuthProviderKey,
} from '@/utils/providerKeys';

export type BuiltInOAuthProvider =
  'codex' | 'anthropic' | 'antigravity' | 'kimi' | 'kimi-ai' | 'xai' | 'devin' | 'meta';

export interface OAuthStartResponse {
  url: string;
  state?: string;
  user_code?: string;
  flow?: string;
  expires_in?: number;
}

export interface OAuthCallbackResponse {
  status: 'ok';
}

export interface OAuthCancelResponse {
  status: 'ok';
  cancelled: boolean;
}

const WEBUI_SUPPORTED = new Set<string>(['codex', 'claude', 'antigravity', 'xai', 'devin']);

const normalizeProviderForManagementPath = (provider: string): string => {
  const key = normalizeManagementOAuthProviderKey(provider);
  if (!isManagementOAuthProviderKey(key)) {
    throw new Error('Invalid OAuth provider');
  }
  return key === 'anthropic' ? 'claude' : key;
};

export const oauthApi = {
  startAuth: (
    provider: string,
    optionsOrSignal?: { noProxy?: boolean } | AbortSignal,
    maybeSignal?: AbortSignal,
  ) => {
    // Accept either ({ noProxy }, signal) or (signal) directly so the fork's
    // proxy toggle and the upstream abort-signal contract both work.
    const options = optionsOrSignal instanceof AbortSignal ? undefined : optionsOrSignal;
    const signal = optionsOrSignal instanceof AbortSignal ? optionsOrSignal : maybeSignal;
    const providerKey = normalizeProviderForManagementPath(provider);
    const params: Record<string, string | boolean> = { provider: providerKey };
    if (WEBUI_SUPPORTED.has(providerKey)) {
      params.is_webui = true;
    }
    // Fork feature: "Do Not Use Proxy" — when checked, the OAuth login flow
    // connects directly, bypassing the configured proxy (default: checked).
    if (options?.noProxy) {
      params.no_proxy = true;
    }
    return apiClient.get<OAuthStartResponse>('/oauth/auth-url', {
      params,
      ...(signal ? { signal } : {}),
    });
  },

  getAuthStatus: (state: string, signal?: AbortSignal) =>
    apiClient.get<{ status: 'ok' | 'wait' | 'error'; error?: string }>(`/oauth/status`, {
      params: { state },
      ...(signal ? { signal } : {}),
    }),

  cancelSession: (state: string, signal?: AbortSignal) =>
    apiClient.delete<OAuthCancelResponse>('/oauth/session', {
      params: { state },
      ...(signal ? { signal } : {}),
    }),

  submitCallback: (provider: string, redirectUrl: string, signal?: AbortSignal) => {
    const providerKey = normalizeProviderForManagementPath(provider);
    return apiClient.post<OAuthCallbackResponse>(
      '/oauth/callback',
      { provider: providerKey, redirect_url: redirectUrl },
      signal ? { signal } : undefined
    );
  },
};
