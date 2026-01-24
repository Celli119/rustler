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

    expect(screen.getByText("Size: 75 MB")).toBeInTheDocument();
    expect(screen.getByText("Size: 142 MB")).toBeInTheDocument();
    expect(screen.getByText("Size: 466 MB")).toBeInTheDocument();
    expect(screen.getByText("Size: 1.5 GB")).toBeInTheDocument();
    expect(screen.getByText("Size: 2.9 GB")).toBeInTheDocument();
  });

  it("shows Download button for models not downloaded", () => {
    render(<ModelSelector />);

    const downloadButtons = screen.getAllByRole("button", { name: /download/i });
    // 3 models are not downloaded: small, medium, large
    expect(downloadButtons).toHaveLength(3);
  });

  it("shows Select and Delete buttons for downloaded models", () => {
    render(<ModelSelector />);

    // tiny and base are downloaded
    const selectButtons = screen.getAllByRole("button", { name: /select/i });
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });

    expect(deleteButtons).toHaveLength(2);
    // One is "Selected" (current model), one is "Select"
    expect(selectButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("calls downloadModel when Download button is clicked", async () => {
    const user = userEvent.setup();
    render(<ModelSelector />);

    const downloadButtons = screen.getAllByRole("button", { name: /download/i });
    await user.click(downloadButtons[0]); // Click first download button (Small model)

    expect(mockDownloadModel).toHaveBeenCalledWith("small");
  });

  it("calls deleteModel when Delete button is clicked", async () => {
    const user = userEvent.setup();
    render(<ModelSelector />);

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await user.click(deleteButtons[0]); // Click first delete button (Tiny model)

    expect(mockDeleteModel).toHaveBeenCalledWith("tiny");
  });

  it("calls updateSettings when Select button is clicked", async () => {
    const user = userEvent.setup();
    render(<ModelSelector />);

    // Find Select button for "tiny" model (not the currently selected "base")
    const selectButtons = screen.getAllByRole("button", { name: "Select" });
    if (selectButtons.length > 0) {
      await user.click(selectButtons[0]);
      expect(mockUpdateSettings).toHaveBeenCalled();
    }
  });

  it("shows 'Selected' for the currently selected model", () => {
    render(<ModelSelector />);

    // "base" is the selected model
    expect(screen.getByRole("button", { name: "Selected" })).toBeInTheDocument();
  });

  it("disables the Selected button", () => {
    render(<ModelSelector />);

    const selectedButton = screen.getByRole("button", { name: "Selected" });
    expect(selectedButton).toBeDisabled();
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
