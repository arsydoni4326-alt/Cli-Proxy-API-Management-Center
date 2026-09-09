import type { ConnectionStatus } from '@/types';

interface InitialUpdateCheckInput {
  hasChecked: boolean;
  connectionStatus: ConnectionStatus;
}

export function shouldCheckInitialUpdate({
  hasChecked,
  connectionStatus,
}: InitialUpdateCheckInput): boolean {
  return !hasChecked && connectionStatus === 'connected';
}
