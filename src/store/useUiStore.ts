import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * UI-only state. Persisted to `localStorage` so the user's chosen view
 * (active person, privacy mode, etc.) survives reloads.
 *
 * Server data (persons, transactions, holdings, prices) is NOT kept here —
 * it lives in TanStack Query's cache. Mixing the two is what made the old
 * the old `usePortfolioStore` a 566-line fetcher-plus-cache.
 */
interface UiState {
  activePersonId: string | 'ALL';
  setActivePerson: (id: string | 'ALL') => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      activePersonId: 'ALL',
      setActivePerson: (id) => set({ activePersonId: id }),
    }),
    {
      name: 'familyfolio-ui',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export const useActivePersonId = () => useUiStore((s) => s.activePersonId);
export const useSetActivePerson = () => useUiStore((s) => s.setActivePerson);
