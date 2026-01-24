import { create } from "zustand";
import type { Settings, WhisperModel } from "@/lib/tauri";

interface AppState {
  // Recording state
  isRecording: boolean;
  isProcessing: boolean;
  transcription: string | null;

  // Settings
  settings: Settings;

  // Models
  models: WhisperModel[];
  downloadingModel: string | null;
  downloadProgress: number;

  // Actions
  setRecording: (recording: boolean) => void;
  setProcessing: (processing: boolean) => void;
  setTranscription: (text: string | null) => void;
  setSettings: (settings: Partial<Settings>) => void;
  setModels: (models: WhisperModel[]) => void;
  setDownloading: (modelId: string | null, progress: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  isRecording: false,
  isProcessing: false,
  transcription: null,

  settings: {
    hotkey: "Ctrl+Shift+Space",
    model: "base",
    useGpu: false,
    language: "en",
  },

  models: [],
  downloadingModel: null,
  downloadProgress: 0,

  // Actions
  setRecording: (recording) =>
    set({ isRecording: recording }),

  setProcessing: (processing) =>
    set({ isProcessing: processing }),

  setTranscription: (text) =>
    set({ transcription: text }),

  setSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),

  setModels: (models) =>
    set({ models }),

  setDownloading: (modelId, progress) =>
    set({ downloadingModel: modelId, downloadProgress: progress }),
}));
