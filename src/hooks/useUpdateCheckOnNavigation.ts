import { useEffect, useRef } from 'react';
import { useUpdateStore } from '@/stores';
import { useAuthStore } from '@/stores';

/**
 * Hook that triggers update check on page navigation/refresh
 */
export function useUpdateCheckOnNavigation() {
  const { setUpdateModalOpen, setUpdateInfo } = useUpdateStore();
  const auth = useAuthStore();
  const lastCheckedRef = useRef<number>(0);
  const isNavigatingRef = useRef(false);

  // Check on navigation events
  useEffect(() => {
    if (!auth.isAuthenticated || auth.connectionStatus !== 'connected') {
      return;
    }

    // Skip if we just checked (within 2 seconds)
    const now = Date.now();
    if (now - lastCheckedRef.current < 2000) {
      return;
    }

    // Only check if we have a current commit
    if (!auth.serverCommit) {
      return;
    }

    // Trigger check when navigating to a new page
    isNavigatingRef.current = true;
    lastCheckedRef.current = now;

    const checkForUpdates = async () => {
      try {
        const response = await fetch('/v0/management/latest-version', {
          headers: {
            'Authorization': `Bearer ${auth.managementKey}`,
          },
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const latestCommit = data?.['latest-commit'] ?? data?.latest_commit ?? '';

        if (!latestCommit) {
          return;
        }

        const updateAvailable = auth.serverCommit !== latestCommit;

        setUpdateInfo({
          updateAvailable,
          latestVersion: data?.['latest-version'] ?? null,
          latestCommit,
          currentCommit: auth.serverCommit,
        });

        if (updateAvailable) {
          setUpdateModalOpen(true);
        }
      } catch (error) {
        console.error('Update check on navigation failed:', error);
      }
    };

    // Small delay to ensure we don't interfere with navigation
    setTimeout(checkForUpdates, 100);
  }, [auth.isAuthenticated, auth.connectionStatus, auth.managementKey, auth.serverCommit, setUpdateInfo, setUpdateModalOpen]);

  // Check on page refresh (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Mark that we're about to refresh
      isNavigatingRef.current = true;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
}
