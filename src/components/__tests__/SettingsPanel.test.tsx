import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettingsPanel } from "../SettingsPanel";
import { useAppStore } from "@/stores/appStore";
import { resetMocks, mockSettings } from "@/test/mocks/tauri";

// Mock the hooks
vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({
    settings: useAppStore.getState().settings,
    updateSettings: vi.fn((newSettings) => {
      useAppStore.getState().setSettings(newSettings);
    }),
    updateHotkey: vi.fn(),
  }),
}));

vi.mock("@/hooks/useHotkey", () => ({
  useHotkey: () => ({
    isRecording: false,
    recordedKeys: [],
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    formatHotkey: vi.fn(),
    validateHotkey: vi.fn(() => true),
    getHotkeyString: vi.fn(() => ""),
  }),
}));

vi.mock("@/hooks/useModels", () => ({
  useModels: () => ({
    models: [
      { id: "tiny", name: "Tiny", size: "75 MB", downloaded: true },
      { id: "base", name: "Base", size: "142 MB", downloaded: true },
    ],
    downloadingModel: null,
    downloadProgress: 0,
    downloadModel: vi.fn(),
    deleteModel: vi.fn(),
  }),
}));

describe("SettingsPanel", () => {
  beforeEach(() => {
    resetMocks();
    // Reset store to initial state
    useAppStore.setState({
      settings: { ...mockSettings },
    });
  });

  it("renders the settings panel with title", () => {
    render(<SettingsPanel />);

    expect(screen.getByText("Rustler Settings")).toBeInTheDocument();
    expect(screen.getByText("Configure your voice transcription settings")).toBeInTheDocument();
  });

  it("renders all settings sections", () => {
    render(<SettingsPanel />);

    expect(screen.getByText("Hotkey Configuration")).toBeInTheDocument();
    expect(screen.getByText("Language")).toBeInTheDocument();
    expect(screen.getByText("Performance")).toBeInTheDocument();
    expect(screen.getByText("Models")).toBeInTheDocument();
  });

  it("displays the language selector", () => {
    render(<SettingsPanel />);

    expect(screen.getByText("Transcription Language")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /transcription language/i })).toBeInTheDocument();
  });

  it("displays the current language selection", async () => {
    render(<SettingsPanel />);

    const trigger = screen.getByRole("combobox", { name: /transcription language/i });
    expect(trigger).toBeInTheDocument();
  });

  it("renders hotkey configuration section", () => {
    render(<SettingsPanel />);

    expect(screen.getByText("Set a global hotkey to start/stop recording")).toBeInTheDocument();
  });

  it("renders GPU toggle section", () => {
    render(<SettingsPanel />);

    expect(screen.getByText("GPU Acceleration")).toBeInTheDocument();
    expect(screen.getByText(/Use GPU for faster transcription/i)).toBeInTheDocument();
  });

  it("renders model selector section", () => {
    render(<SettingsPanel />);

    expect(screen.getByText("Whisper Models")).toBeInTheDocument();
    expect(screen.getByText(/Download and manage Whisper models/i)).toBeInTheDocument();
  });
});
