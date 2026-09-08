/**
 * 版本相关 API
 */

import { apiClient } from './client';

/**
 * 检查最新版本
 */
export const versionApi = {
  checkLatest: () => apiClient.get<Record<string, unknown>>('/latest-version'),
};
