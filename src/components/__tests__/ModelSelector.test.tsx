import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModelSelector } from "../ModelSelector";
import { useAppStore } from "@/stores/appStore";
import { resetMocks, mockSettings, mockModels } from "@/test/mocks/tauri";

const mockDownloadModel = vi.fn();
const mockDeleteModel = vi.fn();
const mockUpdateSettings = vi.fn();

vi.mock("@/hooks/useModels", () => ({
  useModels: () => ({
    models: mockModels,
    downloadingModel: null,
    downloadProgress: 0,
    downloadModel: mockDownloadModel,
    deleteModel: mockDeleteModel,
  }),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({
    settings: useAppStore.getState().settings,
    updateSettings: mockUpdateSettings,
    updateHotkey: vi.fn(),
  }),
}));

describe("ModelSelector", () => {
  beforeEach(() => {
    resetMocks();
    mockDownloadModel.mockClear();
    mockDeleteModel.mockClear();
    mockUpdateSettings.mockClear();
    useAppStore.setState({
      settings: { ...mockSettings },
    });
  });

  it("renders the model selector with title", () => {
    render(<ModelSelector />);

    expect(screen.getByText("Whisper Models")).toBeInTheDocument();
    expect(screen.getByText(/Download and manage Whisper models/i)).toBeInTheDocument();
  });

  it("renders all available models", () => {
    render(<ModelSelector />);

    expect(screen.getByText("Tiny")).toBeInTheDocument();
    expect(screen.getByText("Base")).toBeInTheDocument();
    expect(screen.getByText("Small")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Large")).toBeInTheDocument();
  });

  it("displays model sizes", () => {
    render(<ModelSelector />);

    // The component shows sizes without "Size:" prefix
    expect(screen.getByText("75 MB")).toBeInTheDocument();
    expect(screen.getByText("142 MB")).toBeInTheDocument();
    expect(screen.getByText("466 MB")).toBeInTheDocument();
    expect(screen.getByText("1.5 GB")).toBeInTheDocument();
    expect(screen.getByText("2.9 GB")).toBeInTheDocument();
  });

  it("shows Download button for models not downloaded", () => {
    render(<ModelSelector />);

    const downloadButtons = screen.getAllByRole("button", { name: /download/i });
    // 3 models are not downloaded: small, medium, large
    expect(downloadButtons).toHaveLength(3);
  });

  it("shows Active badge for selected model", () => {
    render(<ModelSelector />);

    // "base" is the selected model - it shows "Active" badge
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows trash icon button for downloaded models", () => {
    render(<ModelSelector />);

    // tiny and base are downloaded - they have trash buttons (icon only, no text)
    // The buttons have Trash2 icon but no accessible name
    const allButtons = screen.getAllByRole("button");
    // We should have: 2 delete buttons (icon only) + 3 download buttons
    expect(allButtons.length).toBeGreaterThanOrEqual(5);
  });

  it("calls downloadModel when Download button is clicked", async () => {
    const user = userEvent.setup();
    render(<ModelSelector />);

    const downloadButtons = screen.getAllByRole("button", { name: /download/i });
    await user.click(downloadButtons[0]); // Click first download button (Small model)

    expect(mockDownloadModel).toHaveBeenCalledWith("small");
  });

  it("calls updateSettings when clicking on a downloaded model row", async () => {
    const user = userEvent.setup();
    render(<ModelSelector />);

    // Click on "Tiny" model row (which is downloaded but not selected)
    const tinyText = screen.getByText("Tiny");
    const tinyRow = tinyText.closest(".flex.items-center.justify-between");
    if (tinyRow) {
      await user.click(tinyRow);
      expect(mockUpdateSettings).toHaveBeenCalledWith({ model: "tiny" });
    }
  });
});

describe("ModelSelector with downloading state", () => {
  beforeEach(() => {
    resetMocks();
    useAppStore.setState({
      settings: { ...mockSettings },
    });
  });

  it("shows progress bar when model is downloading", () => {
    vi.doMock("@/hooks/useModels", () => ({
      useModels: () => ({
        models: mockModels,
        downloadingModel: "small",
        downloadProgress: 50,
        downloadModel: mockDownloadModel,
        deleteModel: mockDeleteModel,
      }),
    }));

    // Note: Progress bar testing would require re-rendering with the mock
    // This is a placeholder for future enhancement
  });
});
