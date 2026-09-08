import { useEffect, useState, useCallback } from 'react';
import { Outlet, RouterProvider, createHashRouter } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();

  const checkForUpdates = useCallback(async () => {
    try {
      const data = await versionApi.checkLatest();
      const latestVersion = data?.['latest-version'] ?? data?.latest_version ?? data?.latest ?? '';
      const latestCommit = data?.['latest-commit'] ?? data?.latest_commit ?? '';
      
      if (!latestVersion && !latestCommit) {
        return;
      }

      const currentCommit = auth.serverCommit;
      const updateAvailable = currentCommit && latestCommit && currentCommit !== latestCommit;
      
      setUpdateInfo({
        updateAvailable,
        latestVersion: latestVersion || null,
        latestCommit: latestCommit || null,
        currentCommit: currentCommit || null,
      });

      if (updateAvailable) {
        setUpdateModalOpen(true);
      }
    } catch (error) {
      console.error('Update check failed:', error);
    }
  }, [auth.serverCommit, setUpdateInfo, setUpdateModalOpen]);

  // Check for update on every page navigation/refresh
  useEffect(() => {
    if (auth.connectionStatus === 'connected') {
      checkForUpdates();
    }
  }, [location.key, auth.connectionStatus, checkForUpdates]);

  // Check on window focus (in case update happened while away)
  useEffect(() => {
    const handleFocus = () => {
      if (auth.connectionStatus === 'connected') {
        checkForUpdates();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [auth.connectionStatus, checkForUpdates]);

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
