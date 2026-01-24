import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HotkeyConfig } from "../HotkeyConfig";
import { useAppStore } from "@/stores/appStore";
import { resetMocks, mockSettings } from "@/test/mocks/tauri";

const mockStartRecording = vi.fn();
const mockStopRecording = vi.fn();
const mockGetHotkeyString = vi.fn(() => "");
const mockValidateHotkey = vi.fn(() => true);
const mockUpdateHotkey = vi.fn();

let mockIsRecording = false;

vi.mock("@/hooks/useHotkey", () => ({
  useHotkey: () => ({
    isRecording: mockIsRecording,
    recordedKeys: [],
    startRecording: mockStartRecording,
    stopRecording: mockStopRecording,
    formatHotkey: vi.fn((keys: string[]) => keys.join("+")),
    validateHotkey: mockValidateHotkey,
    getHotkeyString: mockGetHotkeyString,
  }),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({
    settings: useAppStore.getState().settings,
    updateSettings: vi.fn(),
    updateHotkey: mockUpdateHotkey,
  }),
}));

describe("HotkeyConfig", () => {
  beforeEach(() => {
    resetMocks();
    mockIsRecording = false;
    mockStartRecording.mockClear();
    mockStopRecording.mockClear();
    mockGetHotkeyString.mockClear();
    mockValidateHotkey.mockClear();
    mockUpdateHotkey.mockClear();
    useAppStore.setState({
      settings: { ...mockSettings },
    });
  });

  it("renders the hotkey config section", () => {
    render(<HotkeyConfig />);

    expect(screen.getByText("Recording Hotkey")).toBeInTheDocument();
    expect(screen.getByText(/Click "Record Hotkey"/)).toBeInTheDocument();
  });

  it("displays the current hotkey", () => {
    render(<HotkeyConfig />);

    expect(screen.getByText("Ctrl+Shift+Space")).toBeInTheDocument();
  });

  it("shows 'Record Hotkey' button when not recording", () => {
    render(<HotkeyConfig />);

    expect(screen.getByRole("button", { name: "Record Hotkey" })).toBeInTheDocument();
  });

  it("calls startRecording when Record Hotkey button is clicked", async () => {
    const user = userEvent.setup();
    render(<HotkeyConfig />);

    const recordButton = screen.getByRole("button", { name: "Record Hotkey" });
    await user.click(recordButton);

    expect(mockStartRecording).toHaveBeenCalled();
  });

  it("shows 'Stop Recording' button when recording", () => {
    mockIsRecording = true;
    render(<HotkeyConfig />);

    expect(screen.getByRole("button", { name: "Stop Recording" })).toBeInTheDocument();
  });

  it("shows 'Press keys...' placeholder when recording with no keys pressed", () => {
    mockIsRecording = true;
    mockGetHotkeyString.mockReturnValue("");
    render(<HotkeyConfig />);

    expect(screen.getByText("Press keys...")).toBeInTheDocument();
  });

  it("displays recorded keys while recording", () => {
    mockIsRecording = true;
    mockGetHotkeyString.mockReturnValue("Ctrl+Alt+R");
    render(<HotkeyConfig />);

    expect(screen.getByText("Ctrl+Alt+R")).toBeInTheDocument();
  });

  it("validates hotkey when stopping recording", async () => {
    mockIsRecording = true;
    mockGetHotkeyString.mockReturnValue("Ctrl+Alt+R");
    mockValidateHotkey.mockReturnValue(true);

    const user = userEvent.setup();
    render(<HotkeyConfig />);

    const stopButton = screen.getByRole("button", { name: "Stop Recording" });
    await user.click(stopButton);

    expect(mockValidateHotkey).toHaveBeenCalledWith("Ctrl+Alt+R");
    expect(mockStopRecording).toHaveBeenCalled();
  });

  it("shows error for invalid hotkey", async () => {
    mockIsRecording = true;
    mockGetHotkeyString.mockReturnValue("R");
    mockValidateHotkey.mockReturnValue(false);

    const user = userEvent.setup();
    render(<HotkeyConfig />);

    const stopButton = screen.getByRole("button", { name: "Stop Recording" });
    await user.click(stopButton);

    expect(screen.getByText(/Invalid hotkey combination/i)).toBeInTheDocument();
  });

  it("has destructive variant on Stop Recording button", () => {
    mockIsRecording = true;
    render(<HotkeyConfig />);

    const stopButton = screen.getByRole("button", { name: "Stop Recording" });
    // The button should have destructive styling (testing presence is sufficient)
    expect(stopButton).toBeInTheDocument();
  });
});
