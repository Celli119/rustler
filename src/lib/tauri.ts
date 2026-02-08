import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// Types
export interface Settings {
  hotkey: string;
  model: string;
  useGpu: boolean;
  language: string;
  translate: boolean;
}

export interface WhisperModel {
  id: string;
  name: string;
  size: string;
  downloaded: boolean;
}

export interface DownloadProgressPayload {
  modelId: string;
  percentage: number;
}

export interface RecordingStatusPayload {
  isRecording: boolean;
}

export interface TranscriptionCompletePayload {
  text: string;
}

export interface TranscriptionRecord {
  id: string;
  text: string;
  timestamp: number;
  duration_ms?: number;
  model?: string;
}

// Commands
export async function startRecording(): Promise<void> {
  return invoke("start_recording");
}

export async function stopRecording(): Promise<string> {
  return invoke("stop_recording");
}

export async function transcribeAudio(audioPath: string, model: string): Promise<string> {
  return invoke("transcribe_audio", { audioPath, model });
}

export async function getSettings(): Promise<Settings> {
  return invoke("get_settings");
}

export async function saveSettings(settings: Settings): Promise<void> {
  return invoke("save_settings", { settings });
}

export async function getAvailableModels(): Promise<WhisperModel[]> {
  return invoke("get_available_models");
}

export async function downloadModel(modelId: string): Promise<void> {
  return invoke("download_model", { modelId });
}

export async function deleteModel(modelId: string): Promise<void> {
  return invoke("delete_model", { modelId });
}

export async function registerHotkey(shortcut: string): Promise<void> {
  return invoke("register_hotkey", { shortcut });
}

export async function isWaylandSession(): Promise<boolean> {
  return invoke("is_wayland_session");
}

export async function resetWaylandHotkey(shortcut: string): Promise<string | null> {
  return invoke("reset_wayland_hotkey", { shortcut });
}

export async function pasteText(text: string): Promise<void> {
  return invoke("paste_text", { text });
}

// Event listeners
export async function onDownloadProgress(
  callback: (progress: DownloadProgressPayload) => void,
): Promise<() => void> {
  const unlisten = await listen<DownloadProgressPayload>("download-progress", (event) => {
    callback(event.payload);
  });
  return unlisten;
}

export async function onRecordingStatus(
  callback: (status: RecordingStatusPayload) => void,
): Promise<() => void> {
  const unlisten = await listen<RecordingStatusPayload>("recording-status", (event) => {
    callback(event.payload);
  });
  return unlisten;
}

export async function onTranscriptionComplete(
  callback: (result: TranscriptionCompletePayload) => void,
): Promise<() => void> {
  const unlisten = await listen<TranscriptionCompletePayload>("transcription-complete", (event) => {
    callback(event.payload);
  });
  return unlisten;
}

export async function onHotkeyTriggered(callback: () => void): Promise<() => void> {
  const unlisten = await listen<void>("hotkey-triggered", () => {
    callback();
  });
  return unlisten;
}

export async function unregisterHotkeys(): Promise<void> {
  return invoke("unregister_hotkeys");
}

// History commands
export async function getHistory(): Promise<TranscriptionRecord[]> {
  return invoke("get_history");
}

export async function addHistory(
  text: string,
  durationMs?: number,
  model?: string,
): Promise<TranscriptionRecord> {
  return invoke("add_history", { text, durationMs, model });
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  return invoke("delete_history_entry", { id });
}

export async function clearHistory(): Promise<void> {
  return invoke("clear_history");
}

// App lifecycle commands (via @tauri-apps/plugin-process)
export { relaunch as restartApp } from "@tauri-apps/plugin-process";
