// Re-export all types from lib/tauri for convenience
export type {
  Settings,
  WhisperModel,
  DownloadProgressPayload,
  RecordingStatusPayload,
  TranscriptionCompletePayload,
} from "@/lib/tauri";

// Additional UI types
export type RecordingState = "idle" | "recording" | "processing" | "done";

export interface HotkeyValidationResult {
  valid: boolean;
  error?: string;
}

export interface ModelDownloadState {
  modelId: string;
  progress: number;
  downloading: boolean;
}
