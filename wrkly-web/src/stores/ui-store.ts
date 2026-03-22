import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  commandBarOpen: boolean;
  activeModal: string | null;
  toggleSidebar: () => void;
  toggleCommandBar: () => void;
  setActiveModal: (id: string | null) => void;

  // ── Multi-select ────────────────────────────────────────────────────────
  selectedCardIds: Set<string>;
  toggleCardSelection: (id: string) => void;
  selectCards: (ids: string[]) => void;
  clearSelection: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  commandBarOpen: false,
  activeModal: null,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleCommandBar: () => set((state) => ({ commandBarOpen: !state.commandBarOpen })),
  setActiveModal: (id) => set({ activeModal: id }),

  // ── Multi-select ────────────────────────────────────────────────────────
  selectedCardIds: new Set<string>(),
  toggleCardSelection: (id) =>
    set((state) => {
      const next = new Set(state.selectedCardIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedCardIds: next };
    }),
  selectCards: (ids) =>
    set((state) => {
      const next = new Set(state.selectedCardIds);
      ids.forEach((id) => next.add(id));
      return { selectedCardIds: next };
    }),
  clearSelection: () => set({ selectedCardIds: new Set<string>() }),
}));
