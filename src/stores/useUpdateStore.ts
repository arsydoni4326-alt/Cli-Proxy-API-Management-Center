import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UpdateInfo {
  updateAvailable: boolean;
  latestVersion: string | null;
  latestCommit: string | null;
  currentCommit: string | null;
}

interface UpdateStore {
  updateInfo: UpdateInfo | null;
  updateModalOpen: boolean;
  setUpdateInfo: (info: UpdateInfo | null) => void;
  setUpdateModalOpen: (open: boolean) => void;
}

export const useUpdateStore = create<UpdateStore>()(
  persist(
    (set) => ({
      updateInfo: null,
      updateModalOpen: false,
      setUpdateInfo: (info) => set({ updateInfo: info }),
      setUpdateModalOpen: (open) => set({ updateModalOpen: open }),
    }),
    {
      name: 'update-store',
      partialize: (state) => ({
        updateModalOpen: state.updateModalOpen,
      }),
    }
  )
);
