import { create } from "zustand";
import type { TranscriptionRecord } from "@/lib/tauri";
import {
  getHistory,
  addHistory as addHistoryCommand,
  deleteHistoryEntry,
  clearHistory as clearHistoryCommand,
} from "@/lib/tauri";

interface HistoryState {
  records: TranscriptionRecord[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadHistory: () => Promise<void>;
  addToHistory: (text: string, durationMs?: number, model?: string) => Promise<void>;
  removeFromHistory: (id: string) => Promise<void>;
  clearAllHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  records: [],
  isLoading: false,
  error: null,

  loadHistory: async () => {
    set({ isLoading: true, error: null });
    try {
      const records = await getHistory();
      set({ records, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  addToHistory: async (text: string, durationMs?: number, model?: string) => {
    try {
      const record = await addHistoryCommand(text, durationMs, model);
      set((state) => ({
        records: [record, ...state.records].slice(0, 100),
      }));
    } catch (error) {
      console.error("Failed to add to history:", error);
    }
  },

  removeFromHistory: async (id: string) => {
    try {
      await deleteHistoryEntry(id);
      set((state) => ({
        records: state.records.filter((r) => r.id !== id),
      }));
    } catch (error) {
      console.error("Failed to remove from history:", error);
    }
  },

  clearAllHistory: async () => {
    try {
      await clearHistoryCommand();
      set({ records: [] });
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
  },
}));
