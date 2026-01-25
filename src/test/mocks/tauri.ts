import { vi } from "vitest";
import type { Settings, WhisperModel } from "@/lib/tauri";

export const mockSettings: Settings = {
  hotkey: "Ctrl+Shift+Space",
  model: "base",
  useGpu: false,
  language: "en",
  showOverlayOnlyDuringRecording: false,
};

export const mockModels: WhisperModel[] = [
  { id: "tiny", name: "Tiny", size: "75 MB", downloaded: true },
  { id: "base", name: "Base", size: "142 MB", downloaded: true },
  { id: "small", name: "Small", size: "466 MB", downloaded: false },
  { id: "medium", name: "Medium", size: "1.5 GB", downloaded: false },
  { id: "large", name: "Large", size: "2.9 GB", downloaded: false },
];

export const mockInvoke = vi.fn().mockImplementation((command: string, _args?: unknown) => {
  switch (command) {
    case "get_settings":
      return Promise.resolve(mockSettings);
    case "save_settings":
      return Promise.resolve();
    case "get_available_models":
      return Promise.resolve(mockModels);
    case "download_model":
      return Promise.resolve();
    case "delete_model":
      return Promise.resolve();
    case "register_hotkey":
      return Promise.resolve();
    case "start_recording":
      return Promise.resolve();
    case "stop_recording":
      return Promise.resolve("Test transcription");
    case "paste_text":
      return Promise.resolve();
    case "is_wayland_session":
      return Promise.resolve(false);
    case "transcribe_audio":
      return Promise.resolve("Test transcription");
    case "reset_wayland_hotkey":
      return Promise.resolve();
    default:
      return Promise.reject(new Error(`Unknown command: ${command}`));
  }
});

export const mockListen = vi.fn().mockImplementation(() => {
  return Promise.resolve(() => {});
});

export function resetMocks() {
  mockInvoke.mockClear();
  mockListen.mockClear();
}
