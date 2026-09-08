import { useEffect, useCallback } from 'react';
import { Outlet, RouterProvider, createHashRouter } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { NotificationContainer } from '@/components/common/NotificationContainer';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/router/ProtectedRoute';
import { useLanguageStore, useThemeStore, useUpdateStore } from '@/stores';
import { versionApi } from '@/services/api';
import { UpdateModal } from '@/components/common/UpdateModal';
import { useAuthStore } from '@/stores';

function RootShell() {
  const { updateInfo, updateModalOpen, setUpdateModalOpen, setUpdateInfo } = useUpdateStore();
  const auth = useAuthStore();

  const checkForUpdates = useCallback(async () => {
    try {
      const data = await versionApi.checkLatest();
      const latestVersion = data?.['latest-version'] ?? data?.latest_version ?? data?.latest ?? '';
      const latestCommit = data?.['latest-commit'] ?? data?.latest_commit ?? '';
      
      if (!latestVersion && !latestCommit) {
        return;
      }

      const currentCommit = auth.serverCommit;
      const updateAvailable = !!(currentCommit && latestCommit && currentCommit !== latestCommit);
      
      setUpdateInfo({
        updateAvailable,
        latestVersion: typeof latestVersion === 'string' ? latestVersion : null,
        latestCommit: typeof latestCommit === 'string' ? latestCommit : null,
        currentCommit: typeof currentCommit === 'string' ? currentCommit : null,
      });

      // Only show the update notification modal when an update is actually available.
      // This runs on initial mount (first visit / hard refresh) only, so client-side
      // hash navigation (#/ai-providers -> #/auth-files) will never trigger it.
      if (updateAvailable) {
        setUpdateModalOpen(true);
      }
    } catch (error) {
      console.error('Update check failed:', error);
    }
  }, [auth.serverCommit, setUpdateInfo, setUpdateModalOpen]);


  // Check on initial mount (for hard page refreshes F5)
  useEffect(() => {
    if (auth.connectionStatus === 'connected') {
      checkForUpdates();
    }
  }, []);  // Empty dependency array - runs once on mount

  return (
    <>
      <NotificationContainer />
      <ConfirmationModal />
      <Outlet />
      {updateInfo && (
        <UpdateModal
          isOpen={updateModalOpen}
          onClose={() => setUpdateModalOpen(false)}
          latestVersion={updateInfo.latestVersion || ''}
          latestCommit={updateInfo.latestCommit || ''}
          onCheckUpdate={checkForUpdates}
        />
      )}
    </>
  );
}

const router = createHashRouter([
  {
    element: <RootShell />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        path: '/*',
        element: (
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

function App() {
  const initializeTheme = useThemeStore((state) => state.initializeTheme);
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  useEffect(() => {
    const cleanupTheme = initializeTheme();
    return cleanupTheme;
  }, [initializeTheme]);

  useEffect(() => {
    setLanguage(language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 仅用于首屏同步 i18n 语言

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return <RouterProvider router={router} />;
}

export default App;
