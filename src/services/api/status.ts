/**
 * 管理 API 状态相关
 */

import { apiClient } from './client';

export interface BlockedIP {
  ip: string;
  remaining: string;
}

export interface ServerStatus {
  status: string;
  version: string;
  commit: string;
  build_date: string;
  uptime?: string;
  started_at?: string;
  watcher_state?: boolean;
  blocked_ips?: BlockedIP[];
}

export const statusApi = {
  get: () => apiClient.get<ServerStatus>('/status'),
};